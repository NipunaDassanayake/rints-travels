# CR-033 Stage 2 backend validation

## Runtime boundary

Bound issuance is enabled only by `AUTH_BOUND_SESSIONS_ENABLED=true`. Otherwise
new login sessions retain the legacy token and cookie protocol. Existing bound
sessions always use bound validation/recovery, even after issuance is disabled.
Legacy refresh keeps its CAS rotation and predecessor/409 behavior; it never
creates a binding. Legacy credentials cannot revoke or refresh a bound row.

All session creation/revocation and bound refresh acquire the user lock first.
Single-session operations then lock that session; logout-all locks sessions in
primary-key order. Guide deactivation locks user, sessions, then guide profile,
and atomically clears session recovery while preserving the existing business
checks. Legacy CAS rotation remains unchanged and cannot update a revoked row.

The DB clock is sampled after locks. Recovery returns the exact encrypted
successor without writes. Rotation alone updates generation, sliding expiry,
lastUsedAt and a fixed window capped at 30 seconds and both token expiries.
Reuse revocation commits before returning 401. Binding failures never revoke.
Crypto failures return `AUTH_RECOVERY_UNAVAILABLE`; transaction/commit failures
return `AUTH_SESSION_UNAVAILABLE`. Neither path issues cookies or retries a
possibly committed transaction.

Login, refresh, logout, logout-all and guide deactivation now require exactly one
trusted Origin. Non-browser clients must send the configured frontend Origin;
there is no Referer or proxy-header fallback. Production requires HTTPS.
Register creates a user but not a session and retains its existing contract.

Successful bound refresh sets only its generation cookie and clears observed
lower generations for that session. Binding is preserved. Logout clears the
observed generations and binding after revocation commits. Delayed responses can
leave browser cookies, but those credentials cannot revive a revoked session.
Login replaces the browser session selector without revoking other devices.

## Run strategy

From `backend/`, no installs and no protected database migrations:

```text
npm run test:auth-foundation
node --test --test-concurrency=1 tests/auth-stage2/bound-service.test.js
```

`bound-service.test.js` uses an injected clock and transactional persistence
double for exact deadline, payload-failure and commit-boundary assertions. It
does not claim to prove database locking.

The PostgreSQL suite requires explicit process-only settings:

- `CR033_DISPOSABLE_DATABASE_URL`: localhost:5433, database name exactly
  `rints_travels_cr033_stage2_tmp` (never the protected database).
- `CR033_TEST_CLIENT_DIR`: absolute path to a client generated outside the repo
  from the project schema using the installed Prisma toolchain.

Create the disposable database only after proving that name is absent, deploy
the full migration chain there, and verify migration status before running:

```text
node --test --test-concurrency=1 tests/auth-stage2/postgres.test.js
```

The suite checks `current_database()` before any synthetic write and requires
18 applied migrations. It injects the disposable client into the real app and
uses synthetic credentials/configuration on an ephemeral loopback server.
It never reads protected account data. Connections close in teardown; retain
the disposable database on failure for investigation. Only after all checks
pass, explicitly drop that exact database and remove its temporary client.

Concurrency tests hold a real PostgreSQL user-row lock and wait for
`pg_stat_activity` to show the competing request blocked on that lock before
releasing it. There are no arbitrary sleeps or automatic test retries.

The HTTP lost-response test deliberately discards the successful response's
Set-Cookie and sends the predecessor again. This verifies backend recovery;
real browser navigation/reload/mobile/multi-tab and proxy header-size checks
remain Stage 3. No production fault-injection endpoints are added.

## Rollout constraint

Do not enable issuance during mixed deployment with old backends. First apply
the additive migration and generate the matching client, provision mandatory
recovery keys, deploy compatible backends with issuance disabled everywhere,
then enable issuance. Disabling issuance never permits key removal or rollback
to an old backend while bound sessions may exist. Keep decrypting keys through
all active recovery windows and drain old encryptors before removing a key.

Before/after DB-backed validation, compare the approved protected 18-table
digests, zero cleanup dry-run, admin-session count, unchanged migration history,
absence of CR-033 columns, and .env/AGENTS/uploads hashes. Do not apply CR-033 to
the protected database as part of this test procedure.
