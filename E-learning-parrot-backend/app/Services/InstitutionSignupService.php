<?php

namespace App\Services;

use App\Models\InstitutionPayment;
use App\Models\InstitutionPromoCode;
use App\Models\PlatformInstitution;
use App\Models\User;
use App\Mail\InstitutionWelcomeMail;
use App\Support\FrontendUrl;
use App\Support\PlatformInstitutionHelper;
use App\Support\PlatformUserService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Stripe\Checkout\Session as StripeCheckoutSession;
use Stripe\Stripe;

class InstitutionSignupService
{
    public function __construct(
        private readonly StripePaymentService $stripePaymentService,
        private readonly MailDeliveryService $mailDelivery,
        private readonly ZoomHostAssignmentService $zoomHostAssignment,
    ) {}

    public function signupFeeCents(): int
    {
        return (int) config('institution.signup_fee_cents', 9900);
    }

    public function register(array $data, ?string $promoCode = null): array
    {
        $email = strtolower(trim((string) ($data['contact_email'] ?? '')));
        $existing = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existing && $this->emailIsProtected($existing)) {
            return ['ok' => false, 'status' => 422, 'message' => 'An account with this email already exists.'];
        }

        $promo = null;
        if ($promoCode) {
            $promo = InstitutionPromoCode::whereRaw('UPPER(code) = ?', [strtoupper(trim($promoCode))])->first();
            if (!$promo || !$promo->isRedeemable()) {
                return ['ok' => false, 'status' => 422, 'message' => 'Invalid or expired promo code.'];
            }
        }

        return DB::transaction(function () use ($data, $email, $promo, $existing) {
            $feeCents = $this->signupFeeCents();
            $institution = PlatformInstitution::create([
                'name' => trim((string) $data['institution_name']),
                'slug' => PlatformInstitutionHelper::uniqueSlug((string) $data['institution_name']),
                'contact_email' => $email,
                'contact_phone' => $data['contact_phone'] ?? null,
                'website' => $data['website'] ?? null,
                'address' => $data['address'] ?? null,
                'status' => 'pending_approval',
                'payment_status' => $promo ? 'promo' : 'unpaid',
                'signup_fee_cents' => $feeCents,
                'currency' => config('institution.signup_currency', 'usd'),
                'promo_code_id' => $promo?->id,
            ]);

            $plainPassword = $this->generateOwnerPassword();
            $ownerName = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
            if ($ownerName === '') {
                $ownerName = trim((string) $data['institution_name']) . ' Admin';
            }

            if ($existing) {
                $existing->name = $ownerName;
                $existing->email = $email;
                $existing->role = 'partner_company';
                $existing->status = $promo ? 'Unpaid' : 'Pending';
                $existing->phone = $data['contact_phone'] ?? ($existing->phone ?? '');
                $existing->platform_institution_id = $institution->id;
                $existing->save();
                PlatformUserService::setUserPassword($existing, $plainPassword);
                $user = $existing->fresh();
            } else {
                $user = User::create([
                    'name' => $ownerName,
                    'email' => $email,
                    'password' => $plainPassword,
                    'role' => 'partner_company',
                    'status' => $promo ? 'Unpaid' : 'Pending',
                    'phone' => $data['contact_phone'] ?? '',
                    'platform_institution_id' => $institution->id,
                ]);
            }

            $institution->owner_user_id = $user->id;
            $institution->save();

            $this->sendOwnerCredentials($institution->fresh(), $user, $plainPassword);

            if ($promo) {
                $promo->increment('uses_count');
                return [
                    'ok' => true,
                    'institution' => $institution->fresh(),
                    'requires_payment' => false,
                    'message' => 'Registration submitted. Login credentials have been emailed to you. Pending admin approval.',
                ];
            }

            $checkout = $this->createSignupCheckout($institution);
            if (!$checkout['ok']) {
                throw new \RuntimeException($checkout['message'] ?? 'Stripe checkout failed');
            }

            return [
                'ok' => true,
                'institution' => $institution->fresh(),
                'requires_payment' => true,
                'checkout_url' => $checkout['checkout_url'],
                'message' => 'Registration started. Login credentials have been emailed to you. Complete payment to continue.',
            ];
        });
    }

    /**
     * Main-admin creates a partner institution (no public signup / Stripe).
     *
     * @param  array<string, mixed>  $data
     * @return array{ok: bool, status?: int, message: string, institution?: PlatformInstitution, password?: string}
     */
    public function createByAdmin(array $data): array
    {
        $email = strtolower(trim((string) ($data['contact_email'] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 422, 'message' => 'A valid login email is required.'];
        }

        if (PlatformInstitution::query()->whereRaw('LOWER(contact_email) = ?', [$email])->exists()) {
            return ['ok' => false, 'status' => 422, 'message' => 'An institution with this contact email already exists.'];
        }

        $existing = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existing && $this->emailIsProtected($existing)) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'An account with this email already exists (' . $existing->role . ').',
            ];
        }

        $name = trim((string) ($data['institution_name'] ?? $data['name'] ?? ''));
        if ($name === '') {
            return ['ok' => false, 'status' => 422, 'message' => 'Institution name is required.'];
        }

        $autoApprove = (bool) ($data['auto_approve'] ?? true);
        $sendCredentials = (bool) ($data['send_credentials'] ?? true);
        $ownerName = trim((string) ($data['owner_name'] ?? ''));
        if ($ownerName === '') {
            $ownerName = $name . ' Admin';
        }

        return DB::transaction(function () use ($data, $email, $name, $autoApprove, $sendCredentials, $ownerName, $existing) {
            $feeCents = $this->signupFeeCents();
            $provider = app(\App\Services\PlatformSettingsService::class)
                ->mainPlatformMeetingProvider()
                ->value;

            $attrs = [
                'name' => $name,
                'slug' => PlatformInstitutionHelper::uniqueSlug($name),
                'contact_email' => $email,
                'contact_phone' => $data['contact_phone'] ?? null,
                'website' => $data['website'] ?? null,
                'address' => $data['address'] ?? null,
                'admin_notes' => $data['admin_notes'] ?? null,
                'status' => $autoApprove ? 'active' : 'pending_approval',
                'payment_status' => 'promo',
                'signup_fee_cents' => $feeCents,
                'currency' => config('institution.signup_currency', 'usd'),
            ];
            if (Schema::hasColumn('platform_institutions', 'meeting_provider')) {
                $attrs['meeting_provider'] = $provider;
            }
            if ($autoApprove) {
                $attrs['approved_at'] = now();
            }

            $institution = PlatformInstitution::create($attrs);

            $plainPassword = trim((string) ($data['password'] ?? ''));
            if ($plainPassword === '') {
                $plainPassword = $this->generateOwnerPassword();
            }

            if ($existing) {
                // Reclaim leftover meeting_user / orphan partner from a deleted institution.
                $existing->name = $ownerName;
                $existing->email = $email;
                $existing->role = 'partner_company';
                $existing->status = $autoApprove ? 'Active' : 'Pending';
                $existing->phone = $data['contact_phone'] ?? ($existing->phone ?? '');
                $existing->platform_institution_id = $institution->id;
                $existing->save();
                PlatformUserService::setUserPassword($existing, $plainPassword);
                $user = $existing->fresh();
            } else {
                $user = User::create([
                    'name' => $ownerName,
                    'email' => $email,
                    'password' => $plainPassword,
                    'role' => 'partner_company',
                    'status' => $autoApprove ? 'Active' : 'Pending',
                    'phone' => $data['contact_phone'] ?? '',
                    'platform_institution_id' => $institution->id,
                ]);
            }

            $institution->owner_user_id = $user->id;
            $institution->save();

            // Partners use shared main-admin Zoom/Daily settings — do not assign per-institution Zoom hosts.

            if ($sendCredentials) {
                $this->sendOwnerCredentials($institution->fresh(), $user, $plainPassword);
            }

            return [
                'ok' => true,
                'message' => $autoApprove
                    ? 'Institution created and activated.'
                    : 'Institution created and pending approval.',
                'institution' => $institution->fresh(),
                'password' => $plainPassword,
            ];
        });
    }

    /**
     * True when the account must not be deleted/reclaimed for partner login
     * (admin/staff, hub instructors, or owner of a different live institution).
     *
     * Instructors that belong to $forInstitutionId are NOT protected — they are
     * removed when that institution is hard-deleted.
     */
    public function emailIsProtected(User $user, ?int $forInstitutionId = null): bool
    {
        $role = strtolower(trim((string) ($user->role ?? '')));
        if (in_array($role, ['admin', 'staff'], true)) {
            return true;
        }

        if ($role === 'instructor') {
            $userInst = (int) ($user->platform_institution_id ?? 0);
            // Institution-scoped instructors are deleted with that institution.
            if ($forInstitutionId && $userInst === (int) $forInstitutionId) {
                return false;
            }

            return true;
        }

        $ownsOther = PlatformInstitution::query()
            ->where('owner_user_id', $user->id)
            ->when($forInstitutionId, fn ($q) => $q->where('id', '!=', $forInstitutionId))
            ->exists();

        if ($ownsOther) {
            return true;
        }

        $linkedOther = $user->platform_institution_id
            && (int) $user->platform_institution_id !== (int) ($forInstitutionId ?? 0)
            && PlatformInstitution::query()->whereKey((int) $user->platform_institution_id)->exists()
            && $role === 'partner_company';

        return (bool) $linkedOther;
    }

    /**
     * Fully remove a partner institution: tenant data, instructors, partner accounts, payments.
     *
     * @return array{instructors_deleted:int,users_deleted:int,courses_deleted:int,students_deleted:int}
     */
    public function destroyInstitutionCompletely(PlatformInstitution $institution): array
    {
        return DB::transaction(function () use ($institution) {
            $id = (int) $institution->id;
            $stats = [
                'instructors_deleted' => 0,
                'users_deleted' => 0,
                'courses_deleted' => 0,
                'students_deleted' => 0,
            ];

            // Drop ownership FK before deleting users.
            if ($institution->owner_user_id) {
                $institution->owner_user_id = null;
                $institution->save();
            }

            $this->purgeInstitutionTenantData($id, $stats);
            $this->purgeInstitutionAccounts($institution, $stats);

            $institution->payments()->delete();
            $institution->delete();

            return $stats;
        });
    }

    /**
     * Remove institution owner + linked partner/instructor users so emails can be reused.
     *
     * @param  array{instructors_deleted?:int,users_deleted?:int}|null  $stats
     */
    public function purgeInstitutionAccounts(PlatformInstitution $institution, ?array &$stats = null): void
    {
        $ids = User::query()
            ->where('platform_institution_id', $institution->id)
            ->pluck('id')
            ->all();

        if ($institution->owner_user_id) {
            $ids[] = (int) $institution->owner_user_id;
        }

        $contact = strtolower(trim((string) $institution->contact_email));
        if ($contact !== '') {
            $byEmail = User::query()
                ->whereRaw('LOWER(email) = ?', [$contact])
                ->whereIn('role', ['partner_company', 'meeting_user', 'instructor'])
                ->where(function ($q) use ($institution) {
                    $q->where('platform_institution_id', $institution->id)
                        ->orWhereNull('platform_institution_id');
                })
                ->pluck('id')
                ->all();
            $ids = array_merge($ids, $byEmail);
        }

        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if ($ids === []) {
            return;
        }

        User::query()
            ->whereIn('id', $ids)
            ->get()
            ->each(function (User $user) use ($institution, &$stats) {
                if ($this->emailIsProtected($user, (int) $institution->id)) {
                    // Detach from this institution but keep protected accounts (admin/staff/hub instructors).
                    if ((int) $user->platform_institution_id === (int) $institution->id) {
                        $user->platform_institution_id = null;
                        $user->save();
                    }

                    return;
                }

                $role = strtolower(trim((string) ($user->role ?? '')));
                $result = \App\Support\HardDeleteUser::delete($user);
                if (!($result['deleted'] ?? false)) {
                    if ((int) $user->platform_institution_id === (int) $institution->id) {
                        $user->platform_institution_id = null;
                        $user->save();
                    }

                    return;
                }

                if (is_array($stats)) {
                    $stats['users_deleted'] = (int) ($stats['users_deleted'] ?? 0) + 1;
                    if ($role === 'instructor') {
                        $stats['instructors_deleted'] = (int) ($stats['instructors_deleted'] ?? 0) + 1;
                    }
                }
            });
    }

    /**
     * Delete tenant-scoped content for an institution (courses, students, meetings, etc.).
     *
     * @param  array{courses_deleted?:int,students_deleted?:int}  $stats
     */
    private function purgeInstitutionTenantData(int $institutionId, array &$stats): void
    {
        $tablesByInstitution = [
            'live_meeting_attendance_segments',
            'meeting_registrations',
            'available_schedules',
            'admin_zoom_meetings',
            'webinar_settings',
            'livezoom_cohort',
            'study_shifts',
            'elearning_programs',
        ];

        foreach ($tablesByInstitution as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'platform_institution_id')) {
                continue;
            }
            DB::table($table)->where('platform_institution_id', $institutionId)->delete();
        }

        if (Schema::hasTable('courses') && Schema::hasColumn('courses', 'platform_institution_id')) {
            $courseIds = DB::table('courses')
                ->where('platform_institution_id', $institutionId)
                ->pluck('id')
                ->all();
            if ($courseIds !== []) {
                if (Schema::hasTable('assign_cours')) {
                    DB::table('assign_cours')->whereIn('course_id', $courseIds)->delete();
                }
                if (Schema::hasTable('course_materials')) {
                    DB::table('course_materials')->whereIn('course_id', $courseIds)->delete();
                }
                DB::table('courses')->whereIn('id', $courseIds)->delete();
                $stats['courses_deleted'] = count($courseIds);
            }
        }

        if (Schema::hasTable('students') && Schema::hasColumn('students', 'platform_institution_id')) {
            $studentIds = DB::table('students')
                ->where('platform_institution_id', $institutionId)
                ->pluck('id')
                ->all();
            if ($studentIds !== []) {
                DB::table('students')->whereIn('id', $studentIds)->delete();
                $stats['students_deleted'] = count($studentIds);
            }
        }
    }

    /**
     * Delete leftover partner accounts that are not tied to any institution.
     * (Does not mass-delete meeting_user guests — those are reclaimed when an email is assigned.)
     *
     * @return list<array{id:int,email:string,role:string}>
     */
    public function purgeOrphanPartnerAccounts(bool $dryRun = false): array
    {
        $ownerIds = PlatformInstitution::query()
            ->whereNotNull('owner_user_id')
            ->pluck('owner_user_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $liveInstIds = PlatformInstitution::query()->pluck('id')->map(fn ($id) => (int) $id)->all();

        $removed = [];
        User::query()
            ->where('role', 'partner_company')
            ->orderBy('id')
            ->each(function (User $user) use ($ownerIds, $liveInstIds, $dryRun, &$removed) {
                if ($this->emailIsProtected($user)) {
                    return;
                }
                if (in_array((int) $user->id, $ownerIds, true)) {
                    return;
                }

                $pid = $user->platform_institution_id ? (int) $user->platform_institution_id : null;
                $orphan = $pid === null || !in_array($pid, $liveInstIds, true);
                if (!$orphan) {
                    return;
                }

                $removed[] = [
                    'id' => (int) $user->id,
                    'email' => (string) $user->email,
                    'role' => (string) $user->role,
                ];
                if (!$dryRun) {
                    $user->delete();
                }
            });

        return $removed;
    }

    /**
     * Assign login email to institution owner, reclaiming leftover meeting_user rows when needed.
     */
    public function syncOwnerLoginEmail(PlatformInstitution $institution, string $email): User
    {
        $email = strtolower(trim($email));
        $previousOwnerId = $institution->owner_user_id ? (int) $institution->owner_user_id : null;

        $institution->contact_email = $email;
        $institution->save();

        $owner = $this->ensureOwnerAccount($institution->fresh());

        if ($previousOwnerId && $previousOwnerId !== (int) $owner->id) {
            $previous = User::query()->find($previousOwnerId);
            if ($previous && !$this->emailIsProtected($previous, (int) $institution->id)) {
                // Old partner login for this institution — free the account so the email stays unique only once.
                if ((int) ($previous->platform_institution_id ?? 0) === (int) $institution->id
                    || strtolower(trim((string) $previous->role)) === 'partner_company') {
                    $previous->delete();
                }
            }
        }

        return $owner;
    }

    public function generateOwnerPassword(): string
    {
        return Str::password(12);
    }

    public function sendOwnerCredentials(PlatformInstitution $institution, User $user, string $plainPassword, bool $isResend = false): bool
    {
        return $this->mailDelivery->sendToForInstitution(
            $institution->id,
            $user->email,
            new InstitutionWelcomeMail(
                $institution,
                $user->email,
                $plainPassword,
                $this->institutionLoginUrl($institution),
                $isResend,
            ),
        );
    }

    public function resendOwnerCredentials(PlatformInstitution $institution): array
    {
        return $this->resetOwnerPassword($institution, null, true);
    }

    public function institutionLoginUrl(PlatformInstitution $institution): string
    {
        $base = rtrim(FrontendUrl::base(), '/');
        $slug = strtolower(trim((string) $institution->slug));

        return $slug !== ''
            ? $base . '/login/' . rawurlencode($slug)
            : $base . '/login';
    }

    /** Ensure a partner owner account exists for institution login. */
    public function ensureOwnerAccount(PlatformInstitution $institution): User
    {
        $institution->load('owner');
        $email = strtolower(trim((string) $institution->contact_email));
        if ($email === '') {
            throw new \InvalidArgumentException('Institution contact email is required.');
        }

        $user = $institution->owner;
        if ($user && strtolower(trim((string) $user->email)) === $email) {
            $dirty = false;
            if ((int) $user->platform_institution_id !== (int) $institution->id) {
                $user->platform_institution_id = $institution->id;
                $dirty = true;
            }
            if (strtolower(trim((string) ($user->role ?? ''))) !== 'partner_company') {
                $user->role = 'partner_company';
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }

            return $user->fresh();
        }

        $user = User::query()->whereRaw('LOWER(TRIM(email)) = ?', [$email])->first();
        if ($user) {
            if ($this->emailIsProtected($user, (int) $institution->id)) {
                throw new \InvalidArgumentException(
                    'That login email is already used by another account (' . $user->role . ').'
                );
            }
            $user->role = 'partner_company';
            $user->platform_institution_id = $institution->id;
            $user->status = $this->ownerStatusForInstitution($institution);
            if (trim((string) $user->name) === '') {
                $user->name = trim($institution->name) . ' Admin';
            }
            $user->save();
        } else {
            $user = User::create([
                'name' => trim($institution->name) . ' Admin',
                'email' => $email,
                'password' => Hash::make($this->generateOwnerPassword()),
                'role' => 'partner_company',
                'status' => $this->ownerStatusForInstitution($institution),
                'phone' => $institution->contact_phone ?? '',
                'platform_institution_id' => $institution->id,
            ]);
        }

        $institution->owner_user_id = $user->id;
        $institution->save();

        return $user->fresh();
    }

    /**
     * Reset (or create) the institution owner password. Main admin does not need the old password.
     */
    public function resetOwnerPassword(
        PlatformInstitution $institution,
        ?string $plainPassword = null,
        bool $sendEmail = true,
    ): array {
        $institution = $institution->fresh();
        $user = $this->ensureOwnerAccount($institution);

        $plain = trim((string) ($plainPassword ?? ''));
        if ($plain === '') {
            $plain = $this->generateOwnerPassword();
        }
        if (strlen($plain) < 8) {
            return ['ok' => false, 'status' => 422, 'message' => 'Password must be at least 8 characters.'];
        }

        PlatformUserService::setUserPassword($user, $plain);
        $user->status = $this->ownerStatusForInstitution($institution->fresh());
        $user->save();

        $loginUrl = $this->institutionLoginUrl($institution->fresh());

        if ($sendEmail) {
            $sent = $this->sendOwnerCredentials($institution->fresh(), $user->fresh(), $plain, true);
            if (!$sent) {
                return [
                    'ok' => true,
                    'message' => 'Password updated but the email could not be sent. Copy the password below.',
                    'login_url' => $loginUrl,
                    'owner_email' => $user->email,
                    'password' => $plain,
                ];
            }

            return [
                'ok' => true,
                'message' => 'New login credentials emailed to ' . $user->email,
                'login_url' => $loginUrl,
                'owner_email' => $user->email,
            ];
        }

        return [
            'ok' => true,
            'message' => 'Owner password reset.',
            'login_url' => $loginUrl,
            'owner_email' => $user->email,
            'password' => $plain,
        ];
    }

    private function ownerStatusForInstitution(PlatformInstitution $institution): string
    {
        if ($institution->status !== 'active') {
            return 'Pending';
        }

        return strtolower((string) $institution->payment_status) === 'unpaid' ? 'Unpaid' : 'Active';
    }

    public function createSignupCheckout(PlatformInstitution $institution): array
    {
        $ready = $this->stripePaymentService->assertReady();
        if (!$ready['ok']) {
            return $ready;
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $payment = InstitutionPayment::create([
            'platform_institution_id' => $institution->id,
            'amount_cents' => $institution->signup_fee_cents ?: $this->signupFeeCents(),
            'currency' => $institution->currency ?: 'usd',
            'type' => 'signup',
            'status' => 'pending',
        ]);

        $frontend = rtrim(FrontendUrl::base(), '/');
        $session = StripeCheckoutSession::create([
            'mode' => 'payment',
            'customer_email' => $institution->contact_email,
            'line_items' => [[
                'price_data' => [
                    'currency' => $payment->currency,
                    'unit_amount' => $payment->amount_cents,
                    'product_data' => [
                        'name' => config('institution.signup_product_name', 'Partner Institution Platform Access'),
                        'description' => $institution->name,
                    ],
                ],
                'quantity' => 1,
            ]],
            'success_url' => $frontend . '/institution-signup/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontend . '/institution-signup?cancelled=1',
            'metadata' => [
                'type' => 'institution_signup',
                'platform_institution_id' => (string) $institution->id,
                'institution_payment_id' => (string) $payment->id,
            ],
        ]);

        $payment->stripe_session_id = $session->id;
        $payment->save();

        return ['ok' => true, 'checkout_url' => $session->url];
    }

    public function completeSignupPayment(string $sessionId): ?PlatformInstitution
    {
        $ready = $this->stripePaymentService->assertReady();
        if (!$ready['ok']) {
            return null;
        }

        Stripe::setApiKey(config('services.stripe.secret'));
        $session = StripeCheckoutSession::retrieve($sessionId);

        if (($session->payment_status ?? '') !== 'paid') {
            return null;
        }

        $institutionId = (int) ($session->metadata['platform_institution_id'] ?? 0);
        $paymentId = (int) ($session->metadata['institution_payment_id'] ?? 0);
        $institution = PlatformInstitution::find($institutionId);
        $payment = InstitutionPayment::find($paymentId);

        if (!$institution || !$payment) {
            return null;
        }

        $payment->status = 'paid';
        $payment->stripe_payment_intent_id = $session->payment_intent ?? null;
        $payment->paid_at = now();
        $payment->save();

        $institution->payment_status = 'paid';
        $institution->stripe_customer_id = $session->customer ?? $institution->stripe_customer_id;
        $institution->save();

        if ($institution->owner_user_id) {
            User::where('id', $institution->owner_user_id)->update(['status' => 'Pending']);
        }

        return $institution->fresh();
    }
}
