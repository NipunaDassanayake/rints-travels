# Travora - Database Design

**Document Version:** 1.0
**Project:** Travora - Digital Travel Operations Platform
**Document Type:** Database Design
**Database:** PostgreSQL
**ORM:** Prisma ORM

---

# 1. Introduction

This document defines the proposed database design for the Travora platform.

The design is based on the business requirements, workflows, use cases, system requirements, and domain model documented for the project.

Travora follows a quotation-driven travel planning model. A tourist does not directly book a travel package. Instead, the tourist submits a tour request, receives a customized quotation, accepts the quotation, completes payment, and receives a confirmed booking.

The database shall support:

* Package-based and fully customized tour requests
* Customized travel quotations
* Tour guide assignment
* Payment tracking
* Confirmed bookings
* Reviews and ratings
* Authentication and role-based access
* Audit-friendly records
* Soft deletion
* Future quotation revision support

---

# 2. Database Design Principles

The database design follows these principles:

* Use PostgreSQL as the relational database.
* Use UUID identifiers for major business entities.
* Maintain clear foreign-key relationships.
* Use enums for controlled status values.
* Apply soft deletion to important business records.
* Store audit fields such as `createdAt` and `updatedAt`.
* Add indexes for commonly searched fields.
* Prevent duplicate email addresses and package slugs.
* Preserve quotation and payment history.
* Support future migration toward microservices.

---

# 3. High-Level Entity Relationship Model

```text
User
 ├── Tourist Profile
 ├── Tour Guide Profile
 ├── Tour Requests
 ├── Quotations Created
 ├── Payments
 ├── Bookings
 └── Reviews

Travel Package
 ├── Package Images
 ├── Package Itineraries
 ├── Package Inclusions
 ├── Package Exclusions
 ├── Package FAQs
 └── Tour Requests

Tour Request
 ├── Tourist
 ├── Selected Package (Optional)
 ├── Preferred Guide (Optional)
 └── Tour Quotations

Tour Quotation
 ├── Tour Request
 ├── Admin
 ├── Assigned Guide
 ├── Quotation Itinerary
 ├── Payment
 └── Booking

Payment
 └── Booking

Booking
 └── Review
```

---

# 4. Entity Relationship Summary

| Parent Entity  | Relationship  | Child Entity        | Cardinality        |
| -------------- | ------------- | ------------------- | ------------------ |
| User           | Creates       | Tour Request        | One-to-Many        |
| User           | Has           | Tour Guide Profile  | One-to-Zero-or-One |
| Travel Package | Contains      | Package Images      | One-to-Many        |
| Travel Package | Contains      | Package Itineraries | One-to-Many        |
| Travel Package | Contains      | Package Inclusions  | One-to-Many        |
| Travel Package | Contains      | Package Exclusions  | One-to-Many        |
| Travel Package | Contains      | Package FAQs        | One-to-Many        |
| Travel Package | Referenced By | Tour Requests       | One-to-Many        |
| Tour Request   | Produces      | Tour Quotations     | One-to-Many        |
| Tour Guide     | Assigned To   | Tour Quotations     | One-to-Many        |
| Tour Quotation | Has           | Payment             | One-to-Zero-or-One |
| Tour Quotation | Produces      | Booking             | One-to-Zero-or-One |
| Booking        | Receives      | Review              | One-to-Zero-or-One |

---

# 5. Enumerations

## 5.1 User Role

```text
ADMIN
TOURIST
TOUR_GUIDE
SYSTEM_ADMIN
```

## 5.2 Authentication Provider

```text
LOCAL
GOOGLE
```

## 5.3 User Status

```text
ACTIVE
INACTIVE
SUSPENDED
DELETED
```

## 5.4 Package Status

```text
ACTIVE
INACTIVE
DELETED
```

## 5.5 Tour Request Type

```text
PACKAGE_BASED
CUSTOM
```

## 5.6 Tour Request Status

```text
DRAFT
PENDING_REVIEW
UNDER_DISCUSSION
READY_FOR_QUOTATION
QUOTATION_SENT
ACCEPTED
REJECTED
CANCELLED
BOOKED
```

## 5.7 Quotation Status

```text
DRAFT
SENT
CHANGES_REQUESTED
ACCEPTED
REJECTED
EXPIRED
CANCELLED
```

## 5.8 Payment Status

```text
PENDING
PROCESSING
PAID
FAILED
REFUNDED
CANCELLED
```

## 5.9 Booking Status

```text
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

## 5.10 Review Status

```text
PENDING
PUBLISHED
HIDDEN
DELETED
```

## 5.11 Contact Method

```text
WHATSAPP
PHONE
EMAIL
```

---

# 6. Table Definitions

## 6.1 Users

Stores authenticated users of the platform.

| Column            | Type          | Constraints               | Description                         |
| ----------------- | ------------- | ------------------------- | ----------------------------------- |
| id                | UUID          | Primary Key               | Unique user identifier              |
| first_name        | VARCHAR(100)  | Not Null                  | User's first name                   |
| last_name         | VARCHAR(100)  | Not Null                  | User's last name                    |
| email             | VARCHAR(255)  | Unique, Not Null          | Login email                         |
| phone             | VARCHAR(30)   | Nullable                  | Contact number                      |
| password_hash     | VARCHAR(255)  | Nullable                  | Hashed password for local accounts  |
| role              | USER_ROLE     | Not Null                  | User role                           |
| provider          | AUTH_PROVIDER | Not Null                  | Authentication provider             |
| provider_id       | VARCHAR(255)  | Nullable                  | External authentication provider ID |
| profile_image_url | TEXT          | Nullable                  | User profile image                  |
| is_email_verified | BOOLEAN       | Default False             | Email verification status           |
| status            | USER_STATUS   | Default ACTIVE            | Account status                      |
| created_at        | TIMESTAMP     | Default Current Timestamp | Creation time                       |
| updated_at        | TIMESTAMP     | Auto Updated              | Last update time                    |
| deleted_at        | TIMESTAMP     | Nullable                  | Soft deletion time                  |

### Indexes

* Unique index on `email`
* Index on `role`
* Index on `status`
* Composite index on `provider` and `provider_id`

---

## 6.2 Refresh Tokens

Stores refresh tokens for authenticated sessions.

| Column     | Type         | Constraints               | Description          |
| ---------- | ------------ | ------------------------- | -------------------- |
| id         | UUID         | Primary Key               | Token record ID      |
| user_id    | UUID         | Foreign Key               | Related user         |
| token_hash | VARCHAR(255) | Unique, Not Null          | Hashed refresh token |
| expires_at | TIMESTAMP    | Not Null                  | Token expiration     |
| revoked_at | TIMESTAMP    | Nullable                  | Revocation time      |
| created_at | TIMESTAMP    | Default Current Timestamp | Creation time        |

### Relationship

```text
User 1 ──── * Refresh Tokens
```

---

## 6.3 Travel Packages

Stores package templates published by the agency.

| Column            | Type           | Constraints               | Description               |
| ----------------- | -------------- | ------------------------- | ------------------------- |
| id                | UUID           | Primary Key               | Package ID                |
| title             | VARCHAR(150)   | Not Null                  | Package title             |
| slug              | VARCHAR(180)   | Unique, Not Null          | URL-friendly identifier   |
| destination       | VARCHAR(150)   | Not Null                  | Main destination          |
| short_description | VARCHAR(500)   | Nullable                  | Package summary           |
| description       | TEXT           | Not Null                  | Full package description  |
| duration_days     | INTEGER        | Not Null                  | Tour duration             |
| starting_price    | DECIMAL(12,2)  | Not Null                  | Starting price            |
| currency          | VARCHAR(10)    | Default USD               | Currency code             |
| status            | PACKAGE_STATUS | Default ACTIVE            | Package status            |
| created_by        | UUID           | Foreign Key               | Admin who created package |
| created_at        | TIMESTAMP      | Default Current Timestamp | Creation time             |
| updated_at        | TIMESTAMP      | Auto Updated              | Last update time          |
| deleted_at        | TIMESTAMP      | Nullable                  | Soft deletion time        |

### Indexes

* Unique index on `slug`
* Index on `destination`
* Index on `status`
* Index on `starting_price`
* Index on `duration_days`

---

## 6.4 Package Images

Stores images associated with a package.

| Column        | Type         | Constraints               | Description        |
| ------------- | ------------ | ------------------------- | ------------------ |
| id            | UUID         | Primary Key               | Image ID           |
| package_id    | UUID         | Foreign Key               | Related package    |
| image_url     | TEXT         | Not Null                  | Image location     |
| alt_text      | VARCHAR(255) | Nullable                  | Accessibility text |
| is_primary    | BOOLEAN      | Default False             | Main image flag    |
| display_order | INTEGER      | Default 0                 | Image ordering     |
| created_at    | TIMESTAMP    | Default Current Timestamp | Creation time      |

### Relationship

```text
Travel Package 1 ──── * Package Images
```

---

## 6.5 Package Itineraries

Stores sample daily itinerary items for package templates.

| Column      | Type         | Constraints               | Description       |
| ----------- | ------------ | ------------------------- | ----------------- |
| id          | UUID         | Primary Key               | Itinerary item ID |
| package_id  | UUID         | Foreign Key               | Related package   |
| day_number  | INTEGER      | Not Null                  | Day number        |
| title       | VARCHAR(150) | Not Null                  | Day title         |
| description | TEXT         | Not Null                  | Day activities    |
| created_at  | TIMESTAMP    | Default Current Timestamp | Creation time     |
| updated_at  | TIMESTAMP    | Auto Updated              | Last update time  |

### Constraints

* Unique combination of `package_id` and `day_number`

---

## 6.6 Package Inclusions

Stores services included in a package.

| Column     | Type         | Constraints               | Description      |
| ---------- | ------------ | ------------------------- | ---------------- |
| id         | UUID         | Primary Key               | Inclusion ID     |
| package_id | UUID         | Foreign Key               | Related package  |
| title      | VARCHAR(255) | Not Null                  | Included service |
| created_at | TIMESTAMP    | Default Current Timestamp | Creation time    |

---

## 6.7 Package Exclusions

Stores services excluded from a package.

| Column     | Type         | Constraints               | Description      |
| ---------- | ------------ | ------------------------- | ---------------- |
| id         | UUID         | Primary Key               | Exclusion ID     |
| package_id | UUID         | Foreign Key               | Related package  |
| title      | VARCHAR(255) | Not Null                  | Excluded service |
| created_at | TIMESTAMP    | Default Current Timestamp | Creation time    |

---

## 6.8 Package FAQs

Stores frequently asked questions for packages.

| Column        | Type         | Constraints               | Description      |
| ------------- | ------------ | ------------------------- | ---------------- |
| id            | UUID         | Primary Key               | FAQ ID           |
| package_id    | UUID         | Foreign Key               | Related package  |
| question      | VARCHAR(500) | Not Null                  | Question         |
| answer        | TEXT         | Not Null                  | Answer           |
| display_order | INTEGER      | Default 0                 | Display order    |
| created_at    | TIMESTAMP    | Default Current Timestamp | Creation time    |
| updated_at    | TIMESTAMP    | Auto Updated              | Last update time |

---

## 6.9 Tour Guide Profiles

Stores profile details specific to tour guides.

| Column           | Type          | Constraints               | Description                |
| ---------------- | ------------- | ------------------------- | -------------------------- |
| id               | UUID          | Primary Key               | Guide profile ID           |
| user_id          | UUID          | Unique, Foreign Key       | Related user               |
| bio              | TEXT          | Nullable                  | Guide biography            |
| experience_years | INTEGER       | Default 0                 | Years of experience        |
| languages        | TEXT[]        | Nullable                  | Spoken languages           |
| specializations  | TEXT[]        | Nullable                  | Guide specializations      |
| location         | VARCHAR(150)  | Nullable                  | Primary operating location |
| daily_rate       | DECIMAL(12,2) | Nullable                  | Optional daily rate        |
| average_rating   | DECIMAL(3,2)  | Default 0                 | Calculated average rating  |
| total_reviews    | INTEGER       | Default 0                 | Number of reviews          |
| is_available     | BOOLEAN       | Default True              | General availability       |
| created_at       | TIMESTAMP     | Default Current Timestamp | Creation time              |
| updated_at       | TIMESTAMP     | Auto Updated              | Last update time           |
| deleted_at       | TIMESTAMP     | Nullable                  | Soft deletion time         |

### Relationship

```text
User 1 ──── 0..1 Tour Guide Profile
```

---

## 6.10 Tour Requests

Stores initial travel requests submitted by tourists.

| Column                  | Type                | Constraints               | Description                    |
| ----------------------- | ------------------- | ------------------------- | ------------------------------ |
| id                      | UUID                | Primary Key               | Tour request ID                |
| tourist_id              | UUID                | Foreign Key               | Tourist who submitted request  |
| package_id              | UUID                | Nullable, Foreign Key     | Selected package template      |
| preferred_guide_id      | UUID                | Nullable, Foreign Key     | Tourist's preferred guide      |
| request_type            | TOUR_REQUEST_TYPE   | Not Null                  | Package-based or custom        |
| title                   | VARCHAR(200)        | Nullable                  | Custom request title           |
| preferred_start_date    | DATE                | Not Null                  | Preferred start date           |
| preferred_end_date      | DATE                | Nullable                  | Preferred end date             |
| duration_days           | INTEGER             | Nullable                  | Requested duration             |
| adult_count             | INTEGER             | Default 1                 | Number of adults               |
| child_count             | INTEGER             | Default 0                 | Number of children             |
| destination_preferences | TEXT                | Nullable                  | Preferred destinations         |
| budget                  | DECIMAL(12,2)       | Nullable                  | Tourist budget                 |
| currency                | VARCHAR(10)         | Default USD               | Budget currency                |
| hotel_preference        | VARCHAR(100)        | Nullable                  | Hotel preference               |
| transport_preference    | VARCHAR(100)        | Nullable                  | Transport preference           |
| special_requirements    | TEXT                | Nullable                  | Dietary or other needs         |
| contact_method          | CONTACT_METHOD      | Nullable                  | Preferred communication method |
| status                  | TOUR_REQUEST_STATUS | Default PENDING_REVIEW    | Request state                  |
| assigned_admin_id       | UUID                | Nullable, Foreign Key     | Admin handling request         |
| created_at              | TIMESTAMP           | Default Current Timestamp | Creation time                  |
| updated_at              | TIMESTAMP           | Auto Updated              | Last update time               |
| deleted_at              | TIMESTAMP           | Nullable                  | Soft deletion time             |

### Business Constraints

* `package_id` is required when `request_type = PACKAGE_BASED`.
* `package_id` must be null when `request_type = CUSTOM`.
* `adult_count` must be at least 1.
* `child_count` cannot be negative.
* Preferred dates cannot be in the past.

### Indexes

* Index on `tourist_id`
* Index on `status`
* Index on `request_type`
* Index on `assigned_admin_id`
* Index on `preferred_start_date`
* Composite index on `status` and `created_at`

---

## 6.11 Tour Quotations

Stores customized proposals created by admins.

| Column              | Type             | Constraints               | Description                  |
| ------------------- | ---------------- | ------------------------- | ---------------------------- |
| id                  | UUID             | Primary Key               | Quotation ID                 |
| tour_request_id     | UUID             | Foreign Key               | Related tour request         |
| created_by_admin_id | UUID             | Foreign Key               | Admin who prepared quotation |
| assigned_guide_id   | UUID             | Nullable, Foreign Key     | Assigned guide               |
| revision_number     | INTEGER          | Default 1                 | Quotation version            |
| title               | VARCHAR(200)     | Not Null                  | Quotation title              |
| description         | TEXT             | Nullable                  | Proposal description         |
| start_date          | DATE             | Not Null                  | Final start date             |
| end_date            | DATE             | Not Null                  | Final end date               |
| duration_days       | INTEGER          | Not Null                  | Final duration               |
| adult_count         | INTEGER          | Not Null                  | Adults included              |
| child_count         | INTEGER          | Default 0                 | Children included            |
| subtotal            | DECIMAL(12,2)    | Not Null                  | Price before adjustments     |
| discount_amount     | DECIMAL(12,2)    | Default 0                 | Discount                     |
| tax_amount          | DECIMAL(12,2)    | Default 0                 | Tax                          |
| total_price         | DECIMAL(12,2)    | Not Null                  | Final amount                 |
| currency            | VARCHAR(10)      | Default USD               | Currency                     |
| notes               | TEXT             | Nullable                  | Additional quotation notes   |
| valid_until         | TIMESTAMP        | Nullable                  | Expiration time              |
| status              | QUOTATION_STATUS | Default DRAFT             | Quotation state              |
| sent_at             | TIMESTAMP        | Nullable                  | Time sent to tourist         |
| accepted_at         | TIMESTAMP        | Nullable                  | Acceptance time              |
| rejected_at         | TIMESTAMP        | Nullable                  | Rejection time               |
| created_at          | TIMESTAMP        | Default Current Timestamp | Creation time                |
| updated_at          | TIMESTAMP        | Auto Updated              | Last update time             |
| deleted_at          | TIMESTAMP        | Nullable                  | Soft deletion time           |

### Constraints

* Unique combination of `tour_request_id` and `revision_number`.
* Only one quotation revision should be accepted for a tour request.
* Payment is allowed only when quotation status is `ACCEPTED`.

### Indexes

* Index on `tour_request_id`
* Index on `status`
* Index on `assigned_guide_id`
* Composite index on `tour_request_id` and `revision_number`

---

## 6.12 Quotation Itineraries

Stores the final day-by-day itinerary of a quotation.

| Column        | Type         | Constraints               | Description            |
| ------------- | ------------ | ------------------------- | ---------------------- |
| id            | UUID         | Primary Key               | Itinerary item ID      |
| quotation_id  | UUID         | Foreign Key               | Related quotation      |
| day_number    | INTEGER      | Not Null                  | Day number             |
| title         | VARCHAR(200) | Not Null                  | Daily title            |
| description   | TEXT         | Not Null                  | Daily plan             |
| accommodation | VARCHAR(255) | Nullable                  | Hotel or accommodation |
| meals         | VARCHAR(255) | Nullable                  | Included meals         |
| created_at    | TIMESTAMP    | Default Current Timestamp | Creation time          |
| updated_at    | TIMESTAMP    | Auto Updated              | Last update time       |

### Constraint

* Unique combination of `quotation_id` and `day_number`

---

## 6.13 Payments

Stores payments made for accepted quotations.

| Column             | Type           | Constraints               | Description                 |
| ------------------ | -------------- | ------------------------- | --------------------------- |
| id                 | UUID           | Primary Key               | Payment ID                  |
| quotation_id       | UUID           | Unique, Foreign Key       | Accepted quotation          |
| tourist_id         | UUID           | Foreign Key               | Paying tourist              |
| provider           | VARCHAR(50)    | Nullable                  | Payment provider            |
| provider_reference | VARCHAR(255)   | Nullable                  | Gateway transaction ID      |
| amount             | DECIMAL(12,2)  | Not Null                  | Payment amount              |
| currency           | VARCHAR(10)    | Not Null                  | Currency                    |
| status             | PAYMENT_STATUS | Default PENDING           | Payment status              |
| failure_reason     | TEXT           | Nullable                  | Payment failure description |
| paid_at            | TIMESTAMP      | Nullable                  | Successful payment time     |
| created_at         | TIMESTAMP      | Default Current Timestamp | Creation time               |
| updated_at         | TIMESTAMP      | Auto Updated              | Last update time            |

### Constraints

* One payment record per quotation in Version 1.
* Payment amount must match the accepted quotation total.
* Booking is created only after payment status becomes `PAID`.

---

## 6.14 Bookings

Stores confirmed tours created after successful payment.

| Column            | Type           | Constraints               | Description                   |
| ----------------- | -------------- | ------------------------- | ----------------------------- |
| id                | UUID           | Primary Key               | Booking ID                    |
| booking_reference | VARCHAR(50)    | Unique, Not Null          | Human-readable booking number |
| tourist_id        | UUID           | Foreign Key               | Tourist                       |
| tour_request_id   | UUID           | Unique, Foreign Key       | Original request              |
| quotation_id      | UUID           | Unique, Foreign Key       | Accepted quotation            |
| payment_id        | UUID           | Unique, Foreign Key       | Successful payment            |
| assigned_guide_id | UUID           | Nullable, Foreign Key     | Assigned guide                |
| start_date        | DATE           | Not Null                  | Tour start date               |
| end_date          | DATE           | Not Null                  | Tour end date                 |
| total_amount      | DECIMAL(12,2)  | Not Null                  | Confirmed amount              |
| currency          | VARCHAR(10)    | Not Null                  | Currency                      |
| status            | BOOKING_STATUS | Default CONFIRMED         | Booking state                 |
| confirmed_at      | TIMESTAMP      | Default Current Timestamp | Booking confirmation time     |
| completed_at      | TIMESTAMP      | Nullable                  | Tour completion time          |
| cancelled_at      | TIMESTAMP      | Nullable                  | Cancellation time             |
| created_at        | TIMESTAMP      | Default Current Timestamp | Creation time                 |
| updated_at        | TIMESTAMP      | Auto Updated              | Last update time              |
| deleted_at        | TIMESTAMP      | Nullable                  | Soft deletion time            |

### Indexes

* Unique index on `booking_reference`
* Index on `tourist_id`
* Index on `assigned_guide_id`
* Index on `status`
* Index on `start_date`

---

## 6.15 Reviews

Stores tourist feedback after tour completion.

| Column         | Type          | Constraints               | Description                |
| -------------- | ------------- | ------------------------- | -------------------------- |
| id             | UUID          | Primary Key               | Review ID                  |
| booking_id     | UUID          | Unique, Foreign Key       | Completed booking          |
| tourist_id     | UUID          | Foreign Key               | Review author              |
| package_id     | UUID          | Nullable, Foreign Key     | Related package            |
| guide_id       | UUID          | Nullable, Foreign Key     | Rated guide                |
| package_rating | INTEGER       | Nullable                  | Package rating from 1 to 5 |
| guide_rating   | INTEGER       | Nullable                  | Guide rating from 1 to 5   |
| comment        | TEXT          | Nullable                  | Review content             |
| status         | REVIEW_STATUS | Default PENDING           | Moderation state           |
| created_at     | TIMESTAMP     | Default Current Timestamp | Creation time              |
| updated_at     | TIMESTAMP     | Auto Updated              | Last update time           |
| deleted_at     | TIMESTAMP     | Nullable                  | Soft deletion time         |

### Constraints

* Review can only be created after booking completion.
* One review per booking.
* Ratings must be between 1 and 5.
* At least one rating or comment must be provided.

---

# 7. Authentication Token Tables

## 7.1 Email Verification Tokens

| Column     | Type         | Constraints               |
| ---------- | ------------ | ------------------------- |
| id         | UUID         | Primary Key               |
| user_id    | UUID         | Foreign Key               |
| token_hash | VARCHAR(255) | Unique, Not Null          |
| expires_at | TIMESTAMP    | Not Null                  |
| used_at    | TIMESTAMP    | Nullable                  |
| created_at | TIMESTAMP    | Default Current Timestamp |

## 7.2 Password Reset Tokens

| Column     | Type         | Constraints               |
| ---------- | ------------ | ------------------------- |
| id         | UUID         | Primary Key               |
| user_id    | UUID         | Foreign Key               |
| token_hash | VARCHAR(255) | Unique, Not Null          |
| expires_at | TIMESTAMP    | Not Null                  |
| used_at    | TIMESTAMP    | Nullable                  |
| created_at | TIMESTAMP    | Default Current Timestamp |

---

# 8. Referential Actions

Recommended deletion behavior:

| Relationship                     | On Delete |
| -------------------------------- | --------- |
| Travel Package → Package Details | Cascade   |
| User → Refresh Tokens            | Cascade   |
| Tour Request → Quotations        | Restrict  |
| Quotation → Itineraries          | Cascade   |
| Quotation → Payment              | Restrict  |
| Payment → Booking                | Restrict  |
| Booking → Review                 | Restrict  |
| User → Tour Requests             | Restrict  |
| Tour Guide → Quotations          | Set Null  |

Important business entities should use soft deletion rather than physical deletion.

---

# 9. Soft Delete Strategy

The following entities should support soft deletion:

* Users
* Travel Packages
* Tour Guide Profiles
* Tour Requests
* Tour Quotations
* Bookings
* Reviews

Soft-deleted records shall contain a non-null `deleted_at` value.

Normal application queries should exclude soft-deleted records unless explicitly requested by an authorized administrator.

---

# 10. Audit Fields

Major entities should include:

```text
created_at
updated_at
deleted_at
```

Future versions may additionally support:

```text
created_by
updated_by
deleted_by
```

for complete audit tracking.

---

# 11. Transaction Boundaries

Database transactions should be used for operations that update multiple entities.

Examples:

## Create Complete Package

```text
Travel Package
Package Images
Package Itineraries
Package Inclusions
Package Exclusions
Package FAQs
```

## Accept Quotation

```text
Update Quotation Status
Update Tour Request Status
Create Payment Record
```

## Confirm Payment

```text
Update Payment Status
Create Booking
Update Tour Request Status
```

If one operation fails, the entire transaction should roll back.

---

# 12. Quotation Revision Design

Travora should support multiple quotation revisions for one tour request.

Example:

```text
Tour Request
 ├── Quotation Revision 1 - Rejected
 ├── Quotation Revision 2 - Changes Requested
 └── Quotation Revision 3 - Accepted
```

Each quotation revision should remain immutable after it has been sent.

If changes are requested, the admin should create a new revision rather than overwrite the previously sent quotation.

For the first implementation, quotation revision support may be introduced incrementally.

---

# 13. Database Naming Conventions

## Tables

Use plural snake_case names.

Examples:

```text
users
travel_packages
tour_requests
tour_quotations
quotation_itineraries
```

## Columns

Use snake_case names.

Examples:

```text
created_at
preferred_start_date
assigned_guide_id
```

## Prisma Models

Use singular PascalCase names.

Examples:

```text
User
TravelPackage
TourRequest
TourQuotation
```

## Prisma Fields

Use camelCase names.

Examples:

```text
createdAt
preferredStartDate
assignedGuideId
```

Prisma's `@map` and `@@map` attributes should be used to map application naming to database naming.

---

# 14. Initial Implementation Scope

The first database implementation should prioritize:

1. User
2. Refresh Token
3. Travel Package
4. Package Image
5. Package Itinerary
6. Package Inclusion
7. Package Exclusion
8. Package FAQ
9. Tour Guide Profile
10. Tour Request
11. Tour Quotation
12. Quotation Itinerary
13. Payment
14. Booking
15. Review

Supporting integrations and advanced scheduling entities can be added in future migrations.

---

# 15. Future Database Extensions

Future database versions may include:

* Guide availability schedules
* Vehicles
* Drivers
* Hotels
* Activities
* Destinations
* Quotation inclusions and exclusions
* Payment installments
* Refunds
* Notifications
* Message history
* WhatsApp conversations
* Coupons
* Promotions
* Loyalty points
* Agency tenants
* Audit event history
* File attachments
* Currency exchange rates

---

# 16. Database Design Summary

Travora's database design reflects its quotation-driven operating model.

The central business flow is:

```text
User
  │
  ▼
Tour Request
  │
  ▼
Tour Quotation
  │
  ▼
Payment
  │
  ▼
Booking
  │
  ▼
Review
```

Travel packages remain reusable templates, while tour requests and quotations represent the personalized customer journey.

This design provides a strong foundation for the initial modular monolith while supporting future migration into independently deployable services.
