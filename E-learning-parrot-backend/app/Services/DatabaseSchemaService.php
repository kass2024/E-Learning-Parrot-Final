<?php



namespace App\Services;



use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Log;

use Illuminate\Support\Facades\Schema;

use App\Models\User;
use App\Support\PlatformUserService;



class DatabaseSchemaService
{
    private const MAX_MIGRATE_ATTEMPTS = 5;

    /** Process-level cache — schema checks must not run on every HTTP request. */
    private static ?bool $schemaReadyCache = null;

    private static float $schemaReadyCachedAt = 0.0;

    private const SCHEMA_READY_TTL_SECONDS = 300;



    /** @return array<string, list<string>> */

    private function requiredSchema(): array

    {

        $schema = config('database_schema');



        return is_array($schema) ? $schema : [];

    }



    public function databaseConnected(): bool

    {

        try {

            DB::connection()->getPdo();



            return true;

        } catch (\Throwable) {

            return false;

        }

    }



    /**

     * @return list<string>

     */

    public function pendingMigrations(): array

    {

        if (!$this->databaseConnected()) {

            return [];

        }



        $files = app('migrator')->getMigrationFiles(database_path('migrations'));

        $ran = [];



        if (Schema::hasTable('migrations')) {

            $ran = DB::table('migrations')->pluck('migration')->all();

        }



        return array_values(array_diff(array_keys($files), $ran));

    }



    /**

     * @return array{success: bool, output: string, pending_before: int, pending_after: int, attempts: int}

     */

    public function runMigrations(): array

    {

        $pendingBefore = count($this->pendingMigrations());

        $attempts = 0;

        $output = [];



        while ($attempts < self::MAX_MIGRATE_ATTEMPTS) {

            $pending = $this->pendingMigrations();

            if (count($pending) === 0) {

                break;

            }



            $attempts++;

            Artisan::call('migrate', ['--force' => true]);

            $output[] = trim(Artisan::output());

        }



        \App\Support\StorageLinkHelper::ensure();



        return [

            'success' => count($this->pendingMigrations()) === 0,

            'output' => implode("\n", array_filter($output)),

            'pending_before' => $pendingBefore,

            'pending_after' => count($this->pendingMigrations()),

            'attempts' => $attempts,

        ];

    }



    /**

     * @return array<string, array{exists: bool, missing_columns: list<string>}>

     */

    public function verifySchema(): array

    {

        $report = [];



        foreach ($this->requiredSchema() as $table => $columns) {

            if (!Schema::hasTable($table)) {

                $report[$table] = [

                    'exists' => false,

                    'missing_columns' => $columns,

                ];

                continue;

            }



            $missing = [];

            foreach ($columns as $column) {

                if (!Schema::hasColumn($table, $column)) {

                    $missing[] = $column;

                }

            }



            $report[$table] = [

                'exists' => true,

                'missing_columns' => $missing,

            ];

        }



        return $report;

    }



    public function schemaReady(): bool
    {
        $now = microtime(true);
        if (
            self::$schemaReadyCache === true
            && ($now - self::$schemaReadyCachedAt) < self::SCHEMA_READY_TTL_SECONDS
        ) {
            return true;
        }

        try {
            $cached = \Illuminate\Support\Facades\Cache::get('database_schema_ready_v1');
            if ($cached === true) {
                self::$schemaReadyCache = true;
                self::$schemaReadyCachedAt = $now;

                return true;
            }
        } catch (\Throwable) {
            // Cache may be unavailable during early boot — fall through.
        }

        if (count($this->pendingMigrations()) > 0) {
            self::$schemaReadyCache = false;
            self::$schemaReadyCachedAt = $now;

            return false;
        }

        foreach ($this->verifySchema() as $entry) {
            if (!$entry['exists'] || count($entry['missing_columns']) > 0) {
                self::$schemaReadyCache = false;
                self::$schemaReadyCachedAt = $now;

                return false;
            }
        }

        self::$schemaReadyCache = true;
        self::$schemaReadyCachedAt = $now;

        try {
            \Illuminate\Support\Facades\Cache::put(
                'database_schema_ready_v1',
                true,
                self::SCHEMA_READY_TTL_SECONDS
            );
        } catch (\Throwable) {
            // ignore
        }

        return true;
    }



    /** Run pending migrations until schema is complete (web + CLI deploy). */

    public function ensureMigrated(): array

    {

        if (!$this->databaseConnected()) {

            return ['success' => false, 'skipped' => 'database_unreachable'];

        }



        if ($this->schemaReady()) {

            return ['success' => true, 'skipped' => 'already_up_to_date'];

        }



        $result = $this->runMigrations();



        if (!$this->schemaReady() && count($this->pendingMigrations()) > 0) {

            Log::warning('AUTO_MIGRATE incomplete after run', [

                'pending' => $this->pendingMigrations(),

                'schema' => $this->verifySchema(),

            ]);

        }



        return array_merge($result, [

            'schema_ready' => $this->schemaReady(),

        ]);

    }



    private static ?bool $demoEnsured = null;

    /**
     * Keep the platform admin account available.
     * Never auto-recreate demo partners or demo instructors after deletes.
     */
    public function ensureDemoData(): array
    {
        if (self::$demoEnsured === true) {
            return ['success' => true, 'skipped' => 'already_ensured_this_process'];
        }

        if (!$this->databaseConnected() || !$this->schemaReady()) {
            return ['success' => false, 'skipped' => 'schema_not_ready'];
        }

        if (!Schema::hasTable('users')) {
            return ['success' => false, 'skipped' => 'missing_tables'];
        }

        try {
            PlatformUserService::ensureAdminFromEnv();
        } catch (\Throwable $e) {
            Log::warning('ensureAdminFromEnv failed', ['error' => $e->getMessage()]);
        }

        // Permanent locks: once demo rows existed (or admin deleted them), never auto-seed again.
        $this->setDemoSeedMarker('institutions');
        $this->setDemoSeedMarker('instructors');

        // Demo auto-seed is intentionally disabled for HTTP/boot paths.
        // Use `php artisan db:seed --class=...` only when explicitly creating sample data.
        self::$demoEnsured = true;

        return ['success' => true, 'skipped' => 'demo_auto_seed_disabled'];
    }

    /**
     * @deprecated Kept for callers; never recreates deleted partners.
     */
    public function ensureInstitutionSamples(): array
    {
        $this->setDemoSeedMarker('institutions');

        if (!Schema::hasTable('platform_institutions')) {
            return ['success' => true, 'skipped' => 'no_institution_table'];
        }

        return ['success' => true, 'skipped' => 'institution_auto_seed_disabled'];
    }

    /** Call after admin deletes institutions/instructors so boot never resurrects demos. */
    public function lockDemoSeeds(): void
    {
        $this->setDemoSeedMarker('institutions');
        $this->setDemoSeedMarker('instructors');
    }

    private function demoSeedMarkerPath(string $name): string
    {
        return storage_path('app/demo_seed_markers/' . preg_replace('/[^a-z0-9_-]/i', '', $name) . '.flag');
    }

    private function hasDemoSeedMarker(string $name): bool
    {
        return is_file($this->demoSeedMarkerPath($name));
    }

    private function setDemoSeedMarker(string $name): void
    {
        $dir = storage_path('app/demo_seed_markers');
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        @file_put_contents($this->demoSeedMarkerPath($name), date('c'));
    }

    public static function shouldAutoMigrateCli(?array $argv = null): bool
    {

        if (!static::autoMigrateEnabled()) {

            return false;

        }



        $argv = $argv ?? ($_SERVER['argv'] ?? []);

        $command = $argv[1] ?? '';



        $skip = [

            'migrate',

            'migrate:rollback',

            'migrate:refresh',

            'migrate:fresh',

            'migrate:status',

            'migrate:install',

            'db:seed',

            'db:wipe',

            'tinker',

            'schema:dump',

        ];



        return !in_array($command, $skip, true);

    }



    private static function autoMigrateEnabled(): bool

    {

        try {

            if (function_exists('app') && app()->bound('config')) {

                return (bool) config('app.auto_migrate', true);

            }

        } catch (\Throwable) {

            // Laravel not booted yet (e.g. early artisan bootstrap).

        }



        return filter_var(env('AUTO_MIGRATE', true), FILTER_VALIDATE_BOOLEAN);

    }



    /**

     * @return array<string, mixed>

     */

    public function status(): array

    {

        $connected = $this->databaseConnected();

        $pending = $connected ? $this->pendingMigrations() : [];

        $schema = $connected ? $this->verifySchema() : [];



        return [

            'database_connected' => $connected,

            'migrations_pending' => count($pending),

            'pending_migrations' => $pending,

            'schema_ready' => $connected && $this->schemaReady(),

            'schema' => $schema,

            'auto_migrate_enabled' => (bool) config('app.auto_migrate'),

        ];

    }

}


