# CR-033 Stage 1 validation boundary

This records the Stage 1 foundation boundary. For the integrated Stage 2
backend and disposable PostgreSQL tests, see `../auth-stage2/README.md`.

Run `npm run test:auth-foundation` from `backend/`. These Node tests use synthetic
credentials, injected time, and mocked repositories. The startup smoke runs the
actual app on an ephemeral loopback port with an unreachable synthetic database
URL; only health and pre-database refresh rejection paths are exercised.

The existing Playwright security tests are not backend unit tests and are not
run in Stage 1. Legacy regressions execute the actual refresh/logout/authenticate
source with deterministic persistence doubles. This does not establish database
locking, browser cookie ordering, or end-to-end recovery correctness.

## Migration gate

The migration is additive and UNAPPLIED. Do not run `migrate dev`, `db push`,
`migrate deploy`, or regenerate the runtime Prisma client against the protected
unmigrated database. `prisma validate` checks the schema without applying it.
SQL constraint execution requires a separately approved disposable PostgreSQL
database; manual SQL review is not a substitute for that integration gate.

## Integration contract for Stage 2

- No bound login/refresh issuance, routes, row locks, or frontend recovery are
  integrated here. The only legacy-service change is rejection of bound rows.
- Both recovery key settings are mandatory at startup regardless of issuance.
  Missing/invalid keys fail safely with AUTH_RECOVERY_CONFIG_INVALID. Provision
  them externally before starting this backend; do not edit the protected .env.
  AUTH_BOUND_SESSIONS_ENABLED defaults to false and controls NEW issuance only;
  it never disables validation/recovery support or permits protocol downgrade.
  Stage 1 still issues no bound sessions. Keep old decryption keys until their
  recovery windows expire and old encryptors drain, even when issuance is off.
- Cookie candidates are untrusted. Verify the signature, cookie/session/generation
  identity, browser binding, and current locked database hash before deciding.
- The 16-candidate/2-KiB limits do not guarantee transport acceptance. Later
  browser/proxy integration must test stale-cookie accumulation and header limits;
  do not weaken fail-closed parser limits to accommodate oversized headers.
- Prefer the current token over stale cookies before calling the pure decision
  function. A returned `REVOKE` is a decision, not a database write; commit it
  before returning an HTTP error. A returned `RECOVER` never updates the window.
- Pass `absoluteExpiresAt` from the already-verified immutable `aexp` claim into
  the crypto metadata. `now` must be current time after acquiring locks.
- Stage 2 must implement user-before-session locking, revocation cleanup, and
  same-successor response handling. No concurrency guarantee is claimed yet.
- Origin middleware is a reusable factory only; route wiring and API-client
  compatibility are a later integration gate. The factory rejects HTTP production
  origins; invoking it at startup/route registration is deferred to Stage 2 so
  existing legacy startup checks remain unchanged in this foundation stage.
- Do not log returned cookie values, keys, decrypted JWTs or recovery envelopes.

For targeted lint, use the installed frontend ESLint binary with
`--config backend/eslint.config.cjs` and explicit changed backend files; no new
package install is needed. Run from backend when supplying relative source paths.
