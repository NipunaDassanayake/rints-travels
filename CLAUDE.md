# Travora — Claude Code Project Instructions

## 1. Project Overview

Travora is a full-stack travel agency platform for Sri Lanka.

The system supports these primary roles:

- TOURIST
- TOUR_GUIDE
- ADMIN
- SYSTEM_ADMIN

The high-level business flow is:

Tourist Request
→ Admin Quotation
→ Tourist Acceptance
→ Payment
→ Booking
→ Guide Assignment
→ Tour Start
→ Tour Completion
→ Tourist Review

This file governs how Claude should work in this codebase (conventions, boundaries, process). It intentionally does not restate the full business/domain specification. For detailed business requirements, workflows, domain model, database design, system architecture, API spec, frontend screens, and roadmap, see:

```text
docs/01-Business-Requirements-Document.md
docs/02-Business-Process-and-Workflows.md
docs/03-Use-Case-Specification.md
docs/04-System-Requirements-Specification.md
docs/05-Domain-Model.md
docs/06-Database-Design.md
docs/07-System-Architecture.md
docs/08-API-Specification.md
docs/09-Frontend-Screen-Specification.md
docs/10-Development-Roadmap.md
```

Those docs describe intended/planned behavior in places; where they conflict with the actual implementation, treat the implementation as authoritative for coding decisions and flag the discrepancy rather than silently trusting either source.

Before implementing any change, inspect the existing implementation and preserve working functionality.

---

## 2. Repository Structure

The repository is organized as a monorepo:

```text
rints-travels/
├── backend/
├── frontend/
├── docs/
├── CLAUDE.md
└── ...
```

### Backend

The backend is a Node.js + Express application using Prisma and PostgreSQL, written in CommonJS throughout (`package.json` declares `"type": "commonjs"`; no ESM `import`/`export` is used).

Feature modules are located under:

```text
backend/src/modules/
```

Current modules: `auth`, `users`, `tour-requests`, `quotations`, `bookings`, `payments`, `tour-guides`, `packages`, `reviews`, `health`.

Most modules follow this separation:

```text
module/
├── module.routes.js
├── module.controller.js
├── module.service.js
├── module.repository.js
└── module.validation.js
```

Responsibilities:

- Routes: endpoint definitions and middleware
- Controllers: HTTP request/response handling
- Services: business logic
- Repositories: Prisma/database access
- Validation: request validation

The `auth` module is a documented exception to this flat pattern — see §3.

Do not put business logic directly into routes or controllers when it belongs in the service layer.

### Frontend

The frontend uses Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style UI components, TanStack Query, and the existing axios-based `apiClient` pattern.

Actual top-level structure:

```text
frontend/src/
├── app/          # routing, layouts, pages
├── components/   # ui/ (shadcn), shared/, public/ (marketing sections)
├── features/     # domain logic per feature
├── lib/          # apiClient (axios), auth token store, TanStack query client
├── providers/    # auth-provider.tsx, query-provider.tsx — actively used
├── hooks/        # currently empty
├── types/        # currently empty
└── utils/        # currently empty
```

Domain-specific frontend code lives under `frontend/src/features/`, using plural, domain-matching names:

```text
frontend/src/features/
├── auth/
├── bookings/
├── packages/
├── payments/
├── quotations/
├── reviews/
├── tour-guides/
└── tour-requests/
```

File organization inside a feature varies — do not assume every feature has the same file set. See §4 for the actual patterns.

Use `src/app` primarily for routing, layouts, and pages. Keep reusable domain logic and components in `src/features`.

---

## 3. Backend Conventions

Use CommonJS syntax because the backend currently uses patterns such as:

```js
const module = require("module");
module.exports = {};
```

Follow the existing architecture:

```text
route
→ controller
→ service
→ repository
→ Prisma
```

Use the existing:

- async handler pattern (`asyncHandler`)
- API response utilities (`sendSuccess` / `sendError`)
- application error classes (`AppError` and subclasses: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`)
- authentication middleware (`authenticate`)
- authorization middleware (`authorize(...roles)`)
- validation middleware (`validateRequest`, Joi-based)
- logger
- Prisma client

**Exception — the `auth` module** does not use the flat 5-file pattern. It is organized as:

```text
auth/
├── auth.constants.js
├── auth.routes.js
├── auth.service.js
├── controllers/auth.controller.js
├── helpers/            # cookie, token, tokenHash, password helpers
├── mappers/auth.mapper.js
├── repositories/auth.repository.js
├── services/           # one file per flow: login, logout, logoutAll, me, refresh, register
└── validators/auth.validation.js
```

Follow this existing structure when touching auth rather than forcing it into the flat pattern.

Do not introduce a second architectural pattern unless explicitly required.

Controllers should remain thin. Repositories should focus on database operations. Services should contain business rules.

---

## 4. Frontend Conventions

Use TypeScript. Use the existing `@/` path alias. Prefer existing shared UI components over creating duplicate components.

Use TanStack Query for authenticated/client-side API state where the existing feature follows that pattern. Use the existing `apiClient` (axios, with an auth-token interceptor and single-flight refresh-on-401 handling) for authenticated frontend API calls. Public server-rendered data fetching may use `fetch` following the existing project pattern.

**Feature API file organization is not uniform** — check the actual files in a feature before assuming a pattern:

- `packages`, `tour-guides`, `tour-requests`: `feature.api.ts` + `admin-feature.api.ts` + `feature.types.ts` + `components/`
- `bookings`: `booking.api.ts` + `admin-booking.api.ts` + `guide-booking.api.ts` + `booking.types.ts` + `components/` (three role-specific API files, not just public/admin)
- `payments`, `quotations`, `reviews`: a single `feature.api.ts` (+ `feature.types.ts`) used across roles — there is no separate `admin-*.api.ts` file for these today

Where a public/admin component split exists, it follows this naming convention:

```text
tour-guide-card.tsx
admin-tour-guide-card.tsx
```

This split is real and used across `tour-guides`, `packages`, `bookings`, and `tour-requests`.

Do not add `"use client"` unless the component actually requires client-side behavior. Preserve the existing Next.js App Router architecture.

---

## 5. Authentication and Authorization

The application has role-based access.

Important roles include:

- TOURIST
- TOUR_GUIDE
- ADMIN
- SYSTEM_ADMIN

Auth also includes infrastructure beyond basic login:

- **Google OAuth** as an alternate login method alongside local email/password (`User.authProvider`: `LOCAL` | `GOOGLE`).
- **Account status gating** (`User.status`: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `DELETED`). The `authenticate` middleware rejects any non-`ACTIVE` user even with an otherwise valid token.
- **Token/session infrastructure**: `RefreshToken` (tracks device name, IP address, user agent), `EmailVerificationToken`, and `PasswordResetToken` models back refresh sessions, email verification, and password reset.

Backend authorization is the security boundary. Do not rely only on frontend route hiding or UI checks for authorization. Protected backend endpoints must use the appropriate authentication and authorization middleware.

Users must not be able to access another user's protected resources unless their role explicitly permits it.

Examples:

- A tourist must not access another tourist's private booking, payment, request, or quotation.
- A guide must not manage another guide's assigned booking.
- Admin-only operations must be protected on the backend.

---

## 6. Tour Request Lifecycle

A tourist submits a `TourRequest`, which is either `PACKAGE_BASED` or `CUSTOM` (`TourRequestType`), optionally with a `preferredGuideId`, a budget/currency, and a preferred `ContactMethod` (`WHATSAPP`, `PHONE`, `EMAIL`). An `assignedAdminId` tracks which admin owns the request.

`TourRequestStatus`:

```text
PENDING_REVIEW
→ UNDER_DISCUSSION
→ READY_FOR_QUOTATION
→ QUOTATION_SENT
→ ACCEPTED / REJECTED / CANCELLED
→ BOOKED
```

Rules confirmed in the existing implementation:

- A quotation can only be created while the request is `UNDER_DISCUSSION` or `READY_FOR_QUOTATION`.
- Sending a quotation moves the request to `QUOTATION_SENT`.
- The request becomes `BOOKED` once a booking is confirmed from a successful payment.

Do not skip or shortcut this state machine when implementing request-related changes.

---

## 7. Quotation Lifecycle

`TourQuotation` belongs to a `TourRequest` and carries pricing (`subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `currency`), an expiry (`validUntil`), and child content (`QuotationItinerary`, `QuotationInclusion`, `QuotationExclusion`) mirroring the package content model (§13).

`QuotationStatus`:

```text
DRAFT
SENT
ACCEPTED
REJECTED
EXPIRED
SUPERSEDED
```

Rules confirmed in the existing implementation:

- Quotations are versioned: each has a `quotationNumber` and a `revisionNumber`, unique per `[tourRequestId, revisionNumber]`.
- Creating a revision marks the prior quotation `SUPERSEDED` and creates a new quotation with an incremented `revisionNumber`.
- Sending moves `DRAFT` → `SENT`.
- Accepting a `SENT` quotation auto-expires it to `EXPIRED` first if `validUntil` has passed. On acceptance, all sibling `DRAFT`/`SENT` quotations for the same tour request are automatically marked `SUPERSEDED`, inside a transaction.
- Rejecting a `SENT` quotation moves it to `REJECTED`, records the reason in notes, and pushes the tour request to `REJECTED`.
- Payment can only be initiated once a quotation is `ACCEPTED`.

Do not introduce a second way to version or supersede quotations without reviewing this existing transaction logic.

---

## 8. Core Booking Lifecycle

`BookingStatus`:

```text
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

The intended operational flow is:

```text
Tour Request
→ Quotation (ACCEPTED)
→ Payment
→ Booking CONFIRMED
→ Guide starts tour
→ IN_PROGRESS
→ Guide completes tour
→ COMPLETED
→ Tourist review
```

`CANCELLED` is a terminal status reachable from either `CONFIRMED` or `IN_PROGRESS` (an administrative operation — see §9).

A successful payment creates or confirms the booking. Booking creation from a successful payment is idempotent: `Booking.paymentId` is unique, and the service checks for an existing booking by `paymentId` before creating a new one — both in the service layer and again inside the repository's transaction. This idempotent creation is its own transaction, separate from the payment-status update itself — see §12 (Payments and Stripe) and §14 (Data Integrity) for the exact sequencing.

The assigned guide is stored through the quotation relationship (`quotation.guideId`), not directly on `Booking`. Do not create competing guide-assignment relationships without first reviewing the existing data model.

Guide assignment must consider overlapping active bookings. Relevant active statuses for scheduling/conflict logic currently are:

```text
CONFIRMED
IN_PROGRESS
```

Completed and cancelled bookings must not behave like active assignments.

---

## 9. Booking Status Responsibilities

Admins manage administrative booking operations, including cancellation.

The assigned guide is responsible for the operational tour lifecycle:

```text
CONFIRMED
→ IN_PROGRESS
→ COMPLETED
```

Do not casually allow admins to bypass the guide lifecycle unless a CR explicitly changes this business rule.

Cancellation is an administrative operation and must respect existing business rules. Terminal statuses such as `COMPLETED` and `CANCELLED` should not be reopened without an explicit requirement.

---

## 10. Tour Guide Rules

A tour guide has:

- User account
- TourGuideProfile

Guide information may include:

- first name
- last name
- email
- phone
- bio
- experience years
- languages
- specializations
- location
- daily rate
- availability
- rating
- review count

`TourGuideProfile.averageRating` and `totalReviews` are stored, cached fields recalculated transactionally whenever a review is created — see §11 (Reviews) for the full rating aggregation behavior, including a separate live-computed path used by review-listing endpoints.

Public guide APIs should expose only information appropriate for public users. Admin guide APIs may expose additional administrative information. Do not expose sensitive user/account fields through public endpoints.

Guide availability and guide account/profile lifecycle are separate concepts and should not be confused.

Before deactivating or deleting a guide, consider active booking assignments and historical data. Prefer preserving historical relationships over hard deletion.

---

## 11. Reviews

Reviews are associated with completed travel experiences and the assigned guide.

A tourist should only be able to review an eligible completed booking. One review per booking is enforced at the **database level** (`GuideReview.bookingId` is unique), not just in application logic.

Guide rating aggregation currently has two parallel paths:

1. A **stored/cached field** — `TourGuideProfile.averageRating` and `totalReviews` — recalculated and written transactionally every time a review is created (create review + recompute aggregate + update profile, all in one transaction).
2. A **live-computed aggregate** — the guide-reviews-listing endpoints (public and the guide's own) query a live aggregate over `GuideReview` rather than reading the stored field.

Both paths currently reflect the same data because the stored field is updated on every write. A change to review creation must keep the stored field correct; a change to review listing must not assume the stored field alone is the source of truth.

---

## 12. Payments and Stripe

Stripe Checkout is used for the current payment flow. The backend creates the Checkout Session.

Payment success is finalized from a verified Stripe webhook rather than trusting a frontend success redirect. Webhook signature verification must remain enabled. The Stripe webhook requires the raw request body and is registered before `express.json()` is applied — do not move it behind normal JSON parsing in a way that breaks Stripe signature verification.

The payment completion flow must remain idempotent because Stripe may retry webhook events.

Booking creation from a successful payment is **not** one single combined transaction with the payment-status update. The actual sequence is: (1) the webhook handler marks the payment `SUCCESS` (a plain, non-transactional update) and is safe to replay; (2) booking creation then runs as its own separate database transaction, which re-checks the payment is `SUCCESS` and checks for an existing booking by `paymentId` before creating one. Each step is individually safe against retries/replays, but they are not wrapped in one atomic transaction spanning both models — if true single-transaction atomicity across both is ever required, that is a change to existing behavior and should be called out explicitly in a plan.

Never trust payment amount, status, ownership, or quotation information supplied only by the client when the backend can derive it from trusted database records or Stripe.

The `Payment` model's schema includes a `PaymentMethod` enum (`CARD`, `BANK_TRANSFER`, `CASH`, `OTHER`) and a `REFUNDED` payment status. **No refund business flow is currently implemented in the codebase** — treat `REFUNDED` and non-`CARD` payment methods as schema-only until a CR specifically implements that flow. Do not assume a working refund path exists.

The `initiatePayment` service method is internal only — it is no longer exposed as a direct public endpoint and is reached only through checkout-session creation. Avoid re-exposing it directly or expanding it without a CR that specifically requires it.

---

## 13. Packages

Travel packages are reusable travel offerings. Historical bookings and requests may reference packages.

A `TravelPackage` is not a flat single-table record — it has related child content:

- `PackageImage` (with `isPrimary` / `displayOrder`)
- `PackageItinerary` (day-by-day)
- `PackageInclusion`
- `PackageExclusion`
- `PackageFAQ`

The admin UI includes a full package builder (`admin-package-form`, `admin-package-images`, `admin-package-itinerary`, `admin-package-faqs`, `admin-package-list-manager` under `frontend/src/features/packages/components/`) — treat package management as a multi-model feature, not single-table CRUD.

Avoid hard-deleting records required for historical data. Prefer activation/deactivation (`status`) or soft deletion (`deletedAt`) when appropriate. Inactive packages should not be offered for new public selections unless explicitly required. Administrative APIs may need access to inactive records; public APIs should normally return only active, non-deleted packages.

---

## 14. Data Integrity

Prefer database transactions for operations that modify multiple related records. Examples confirmed in the existing implementation:

- booking creation from a successful payment (its own transaction, run after the separate payment-status update — see §12)
- quotation acceptance (superseding sibling quotations + accepting the target one)
- review creation combined with guide rating-stat recalculation
- guide/user creation
- guide assignment to a booking

Before changing the Prisma schema:

1. Inspect the existing schema.
2. Determine whether the requirement can be implemented without schema changes.
3. If a schema change is necessary, explain why.
4. Consider existing data and migration impact.

Do not create duplicate fields representing the same business relationship without a clear reason.

---

## 15. API Design

Follow existing REST conventions. Use the existing API response format and success response utility. Use appropriate HTTP status codes. Use existing application error classes rather than ad-hoc response structures where possible. Validate request bodies, params, and query parameters where appropriate.

Never expose password hashes, refresh tokens, secrets, or other sensitive internal fields.

---

## 16. UI/UX

Maintain the existing Travora design language.

Prefer:

- clear loading states
- clear empty states
- useful error states
- consistent status badges
- responsive layouts
- accessible labels
- existing shared UI components

Avoid native browser dialogs such as:

```js
window.alert()
window.confirm()
```

for polished production flows when an existing application dialog or modal can be used.

Do not redesign unrelated pages while implementing a focused CR.

---

## 17. Testing

### Frontend

Important frontend verification commands:

```bash
npm run lint
npm run build
```

Run them from `frontend/`.

Playwright E2E tests are located under:

```text
frontend/tests/e2e/
```

(`admin-quotation`, `auth`, `booking-lifecycle`, `public`, `roles`, `tour-request`, `tourist-quotation` specs.) There is no `npm run test`/`npm run e2e` script — run them directly with `npx playwright test` from `frontend/` (the config starts the dev server itself and points at `http://localhost:3000`).

The booking lifecycle E2E test (`booking-lifecycle.spec.ts`) covers: Admin assigns guide → Guide starts/completes tour → Tourist submits review. It depends on `backend/scripts/prepare-booking-lifecycle-e2e.js` to seed a fresh `TourRequest`/`Quotation`/`Payment`/`Booking` before each run, and on pre-existing seeded tourist/admin/guide accounts (overridable via env, with hardcoded defaults otherwise). Do not expect this test to pass against an empty database.

### Backend

There is currently **no backend automated test suite** (no Jest/Mocha/Vitest, no unit or integration tests under `backend/src`). The only backend test-adjacent script is the E2E fixture-seeding script above. Business-rule changes in backend services are today only exercised indirectly through the one Playwright E2E flow — be extra careful when changing service-layer logic since there is no unit-test safety net.

### General

Do not weaken existing tests merely to make a change pass. When changing business behavior, update or add tests that verify the intended requirement. Prefer testing behavior rather than implementation details.

---

## 18. Known Gaps / Not Yet Implemented

The following are verified, real gaps — do not assume they exist when planning a CR that touches them, and do not build them unprompted:

- **No backend automated test suite** exists (see §17).
- **Refunds**: `PaymentStatus.REFUNDED` exists in the schema, but no refund flow is implemented (see §12).
- **Notifications/messaging**: `docs/02-Business-Process-and-Workflows.md` describes notification behavior, but there is no `Notification`/`Message` model or implementation in the codebase today.

Only implement these if a CR explicitly asks for them.

---

## 19. Implementation Rules for Claude

Before implementing a CR:

1. Read this `CLAUDE.md`.
2. Read the supplied CR/task document completely.
3. Inspect the relevant existing implementation.
4. Inspect related models, routes, services, APIs, and UI.
5. Identify what already exists.
6. Identify the smallest necessary changes.
7. Create an implementation plan.
8. Wait for user approval before implementation when working in Plan Mode.

Do not assume a requested feature is missing before searching the repository.

Do not rewrite working modules unnecessarily.

Do not make unrelated refactors as part of a focused CR.

Do not silently change established business rules.

Reuse existing utilities, components, and architecture.

If the CR conflicts with the existing implementation or this document, explicitly identify the conflict during planning.

If requirements are ambiguous and the ambiguity materially affects business behavior, flag it in the plan rather than inventing a rule.

---

## 20. Planning Requirements

When asked to plan a CR, do not modify source files.

The plan should include:

1. Requirement summary
2. Current implementation discovered
3. Gap analysis
4. Proposed implementation
5. Backend changes
6. Frontend changes
7. Database/schema changes, if any
8. Validation and authorization
9. Edge cases
10. Files expected to change
11. Testing strategy
12. Risks or assumptions
13. Recommended implementation order

Map the plan back to the CR's acceptance criteria.

Clearly distinguish:

```text
Already implemented
Needs modification
New implementation
Not required
```

Do not begin implementation until the plan has been reviewed and approved.

---

## 21. Definition of Done

A change is not complete merely because code was written.

For applicable changes, confirm:

- CR acceptance criteria are satisfied
- authorization is correct
- validation is correct
- error handling is present
- existing functionality is preserved
- lint passes
- TypeScript/build passes
- relevant tests pass
- no secrets were committed
- no unnecessary files were changed

At the end of implementation, provide a concise summary of:

- files changed
- behavior added or changed
- tests/checks executed
- any remaining limitations
