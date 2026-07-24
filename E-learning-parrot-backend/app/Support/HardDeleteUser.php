<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Hard-delete a user and detach non-cascading leftovers (assignments, payouts).
 */
class HardDeleteUser
{
    /**
     * @return array{deleted:bool,reason?:string}
     */
    public static function delete(User $user, ?int $actorId = null): array
    {
        $role = strtolower(trim((string) ($user->role ?? '')));

        if ($actorId && (int) $user->id === (int) $actorId) {
            return ['deleted' => false, 'reason' => 'You cannot delete your own account.'];
        }

        if (in_array($role, ['admin', 'staff'], true)) {
            return ['deleted' => false, 'reason' => 'Admin and staff accounts cannot be deleted here.'];
        }

        self::scrubRelated((int) $user->id);
        $user->delete();

        return ['deleted' => true];
    }

    public static function scrubRelated(int $userId): void
    {
        if (Schema::hasTable('assign_cours')) {
            DB::table('assign_cours')->where('user_id', $userId)->delete();
        }

        if (Schema::hasTable('instructor_payout_requests')) {
            DB::table('instructor_payout_requests')->where('instructor_id', $userId)->delete();
        }
    }
}
