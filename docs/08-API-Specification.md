# Travora - API Specification

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** REST API Specification  
**Base URL:** `/api`  
**Authentication:** JWT Bearer Token  
**Content Type:** `application/json`

---

# 1. Introduction

This document defines the REST API contracts for the Travora platform.

The API supports:

- Authentication
- User management
- Travel package management
- Tour guide management
- Tour request management
- Tour quotation management
- Payment processing
- Booking management
- Review and rating management

Travora follows a quotation-driven workflow:

```text
Travel Package Template (Optional)
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

---

# 2. API Conventions

## 2.1 Base URL

Development:

```text
http://localhost:5000/api
```

Production:

```text
https://api.travora.example/api
```

---

## 2.2 Authentication Header

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

---

## 2.3 Correlation ID

Clients may send:

```http
X-Correlation-Id: <uuid>
```

If omitted, the backend generates one.

The same value is returned in the response header and response metadata.

---

## 2.4 Standard Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "3b33e776-1464-47bc-a9a3-a7450c7c2848"
  }
}
```

---

## 2.5 Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "Email is required"
  ],
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "3b33e776-1464-47bc-a9a3-a7450c7c2848"
  }
}
```

---

## 2.6 Pagination Response

```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  },
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "3b33e776-1464-47bc-a9a3-a7450c7c2848"
  }
}
```

---

# 3. HTTP Status Codes

| Status | Meaning |
|---:|---|
| 200 | Successful request |
| 201 | Resource created |
| 204 | Successful request with no response body |
| 400 | Invalid request |
| 401 | Authentication required |
| 403 | Insufficient permission |
| 404 | Resource not found |
| 409 | Resource conflict |
| 422 | Validation or business-rule error |
| 429 | Too many requests |
| 500 | Internal server error |

---

# 4. Authentication APIs

## 4.1 Register Tourist

```http
POST /api/auth/register
```

**Access:** Public

### Request

```json
{
  "firstName": "Nipuna",
  "lastName": "Dassanayake",
  "email": "nipuna@example.com",
  "phone": "+94771234567",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "id": "user-uuid",
    "firstName": "Nipuna",
    "lastName": "Dassanayake",
    "email": "nipuna@example.com",
    "role": "TOURIST",
    "status": "ACTIVE",
    "isEmailVerified": false
  },
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "example-id"
  }
}
```

### Validation

- `firstName` is required.
- `lastName` is required.
- `email` must be valid and unique.
- `password` must meet configured complexity requirements.

---

## 4.2 Login

```http
POST /api/auth/login
```

**Access:** Public

### Request

```json
{
  "email": "nipuna@example.com",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "firstName": "Nipuna",
      "lastName": "Dassanayake",
      "email": "nipuna@example.com",
      "role": "TOURIST"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "refresh-token",
    "expiresIn": 900
  },
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "example-id"
  }
}
```

---

## 4.3 Refresh Access Token

```http
POST /api/auth/refresh
```

**Access:** Public with valid refresh token

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Response

```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900
  },
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "example-id"
  }
}
```

---

## 4.4 Logout

```http
POST /api/auth/logout
```

**Access:** Authenticated

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Response

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "example-id"
  }
}
```

---

## 4.5 Get Current User

```http
GET /api/auth/me
```

**Access:** Authenticated

---

## 4.6 Request Password Reset

```http
POST /api/auth/forgot-password
```

**Access:** Public

### Request

```json
{
  "email": "nipuna@example.com"
}
```

---

## 4.7 Reset Password

```http
POST /api/auth/reset-password
```

**Access:** Public with valid reset token

### Request

```json
{
  "token": "password-reset-token",
  "newPassword": "NewStrongPassword123!"
}
```

---

## 4.8 Verify Email

```http
POST /api/auth/verify-email
```

**Access:** Public with valid verification token

### Request

```json
{
  "token": "email-verification-token"
}
```

---

# 5. User APIs

## 5.1 Get Own Profile

```http
GET /api/users/me
```

**Access:** Authenticated

---

## 5.2 Update Own Profile

```http
PATCH /api/users/me
```

**Access:** Authenticated

### Request

```json
{
  "firstName": "Nipuna",
  "lastName": "Dassanayake",
  "phone": "+94771234567",
  "profileImageUrl": "https://example.com/profile.jpg"
}
```

---

## 5.3 List Users

```http
GET /api/users
```

**Access:** `SYSTEM_ADMIN`

### Query Parameters

| Parameter | Description |
|---|---|
| `page` | Page number |
| `limit` | Records per page |
| `role` | Filter by role |
| `status` | Filter by status |
| `search` | Search by name or email |
| `sortBy` | Sort field |
| `sortOrder` | `asc` or `desc` |

---

## 5.4 Get User by ID

```http
GET /api/users/:id
```

**Access:** `SYSTEM_ADMIN`, `ADMIN` where permitted

---

## 5.5 Update User Status

```http
PATCH /api/users/:id/status
```

**Access:** `SYSTEM_ADMIN`

### Request

```json
{
  "status": "SUSPENDED"
}
```

---

## 5.6 Update User Role

```http
PATCH /api/users/:id/role
```

**Access:** `SYSTEM_ADMIN`

### Request

```json
{
  "role": "ADMIN"
}
```

---

# 6. Travel Package APIs

## 6.1 List Active Packages

```http
GET /api/packages
```

**Access:** Public

### Query Parameters

| Parameter | Description |
|---|---|
| `page` | Page number |
| `limit` | Records per page |
| `search` | Search title or destination |
| `destination` | Filter by destination |
| `status` | Filter by status for authorized admins |
| `minPrice` | Minimum starting price |
| `maxPrice` | Maximum starting price |
| `durationDays` | Filter by duration |
| `sortBy` | `title`, `price`, `durationDays`, `createdAt` |
| `sortOrder` | `asc` or `desc` |

---

## 6.2 Get Package by ID

```http
GET /api/packages/:id
```

**Access:** Public

---

## 6.3 Get Package by Slug

```http
GET /api/packages/slug/:slug
```

**Access:** Public

---

## 6.4 Create Package

```http
POST /api/packages
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "title": "Amazing Sri Lanka",
  "slug": "amazing-sri-lanka",
  "destination": "South Coast",
  "shortDescription": "Explore Sri Lanka's southern coast.",
  "description": "A seven-day customizable travel package.",
  "durationDays": 7,
  "startingPrice": 750,
  "currency": "USD",
  "status": "ACTIVE"
}
```

---

## 6.5 Update Package

```http
PATCH /api/packages/:id
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.6 Deactivate Package

```http
PATCH /api/packages/:id/status
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "status": "INACTIVE"
}
```

---

## 6.7 Soft Delete Package

```http
DELETE /api/packages/:id
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.8 Add Package Image

```http
POST /api/packages/:id/images
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "imageUrl": "https://example.com/package-image.jpg",
  "altText": "Mirissa beach",
  "isPrimary": true,
  "displayOrder": 1
}
```

---

## 6.9 Update Package Image

```http
PATCH /api/packages/:packageId/images/:imageId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.10 Delete Package Image

```http
DELETE /api/packages/:packageId/images/:imageId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.11 Add Package Itinerary Item

```http
POST /api/packages/:id/itineraries
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "dayNumber": 1,
  "title": "Arrival in Colombo",
  "description": "Airport pickup and transfer to the hotel."
}
```

---

## 6.12 Update Package Itinerary Item

```http
PATCH /api/packages/:packageId/itineraries/:itineraryId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.13 Delete Package Itinerary Item

```http
DELETE /api/packages/:packageId/itineraries/:itineraryId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.14 Manage Package Inclusions

```http
POST   /api/packages/:id/inclusions
PATCH  /api/packages/:packageId/inclusions/:inclusionId
DELETE /api/packages/:packageId/inclusions/:inclusionId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.15 Manage Package Exclusions

```http
POST   /api/packages/:id/exclusions
PATCH  /api/packages/:packageId/exclusions/:exclusionId
DELETE /api/packages/:packageId/exclusions/:exclusionId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 6.16 Manage Package FAQs

```http
POST   /api/packages/:id/faqs
PATCH  /api/packages/:packageId/faqs/:faqId
DELETE /api/packages/:packageId/faqs/:faqId
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

# 7. Tour Guide APIs

## 7.1 List Tour Guides

```http
GET /api/tour-guides
```

**Access:** Public

### Query Parameters

| Parameter | Description |
|---|---|
| `page` | Page number |
| `limit` | Records per page |
| `location` | Filter by location |
| `language` | Filter by language |
| `specialization` | Filter by specialization |
| `available` | General availability |
| `sortBy` | `averageRating`, `experienceYears`, `createdAt` |

---

## 7.2 Get Tour Guide by ID

```http
GET /api/tour-guides/:id
```

**Access:** Public

---

## 7.3 Create Tour Guide

```http
POST /api/tour-guides
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "firstName": "Nimal",
  "lastName": "Perera",
  "email": "nimal@example.com",
  "phone": "+94770000000",
  "bio": "Experienced English-speaking guide.",
  "experienceYears": 8,
  "languages": [
    "English",
    "Sinhala"
  ],
  "specializations": [
    "Culture",
    "Wildlife"
  ],
  "location": "Colombo",
  "dailyRate": 80
}
```

---

## 7.4 Update Tour Guide Profile

```http
PATCH /api/tour-guides/:id
```

**Access:** Assigned guide, `ADMIN`, `SYSTEM_ADMIN`

---

## 7.5 Update Guide Availability

```http
PATCH /api/tour-guides/:id/availability
```

**Access:** Assigned guide, `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "isAvailable": true
}
```

---

## 7.6 Deactivate Tour Guide

```http
PATCH /api/tour-guides/:id/status
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

# 8. Tour Request APIs

## 8.1 Create Package-Based Tour Request

```http
POST /api/tour-requests/package-based
```

**Access:** `TOURIST`

### Request

```json
{
  "packageId": "package-uuid",
  "preferredGuideId": "guide-uuid",
  "preferredStartDate": "2026-12-15",
  "preferredEndDate": "2026-12-22",
  "adultCount": 4,
  "childCount": 2,
  "budget": 2000,
  "currency": "USD",
  "hotelPreference": "Four Star",
  "transportPreference": "Private Van",
  "specialRequirements": "Vegetarian meals required.",
  "contactMethod": "WHATSAPP"
}
```

---

## 8.2 Create Custom Tour Request

```http
POST /api/tour-requests/custom
```

**Access:** `TOURIST`

### Request

```json
{
  "title": "Custom Sri Lanka Family Tour",
  "preferredGuideId": null,
  "preferredStartDate": "2027-01-10",
  "preferredEndDate": "2027-01-18",
  "adultCount": 2,
  "childCount": 1,
  "destinationPreferences": "Kandy, Ella, Mirissa",
  "budget": 2500,
  "currency": "USD",
  "hotelPreference": "Five Star",
  "transportPreference": "Private SUV",
  "specialRequirements": "Child-friendly activities.",
  "contactMethod": "EMAIL"
}
```

---

## 8.3 List Own Tour Requests

```http
GET /api/tour-requests/me
```

**Access:** `TOURIST`

---

## 8.4 List All Tour Requests

```http
GET /api/tour-requests
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Query Parameters

| Parameter | Description |
|---|---|
| `status` | Filter by status |
| `requestType` | `PACKAGE_BASED` or `CUSTOM` |
| `touristId` | Filter by tourist |
| `assignedAdminId` | Filter by assigned admin |
| `preferredStartDateFrom` | Date range start |
| `preferredStartDateTo` | Date range end |
| `page` | Page number |
| `limit` | Records per page |

---

## 8.5 Get Tour Request by ID

```http
GET /api/tour-requests/:id
```

**Access:** Request owner, `ADMIN`, `SYSTEM_ADMIN`

---

## 8.6 Update Tourist-Owned Request

```http
PATCH /api/tour-requests/:id
```

**Access:** Request owner while status permits editing

---

## 8.7 Assign Admin

```http
PATCH /api/tour-requests/:id/assign-admin
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "adminId": "admin-user-uuid"
}
```

---

## 8.8 Update Request Status

```http
PATCH /api/tour-requests/:id/status
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "status": "UNDER_DISCUSSION"
}
```

---

## 8.9 Admin Edit Tour Request

```http
PATCH /api/tour-requests/:id/admin-edit
```

**Access:** Assigned admin, `SYSTEM_ADMIN`

---

## 8.10 Cancel Tour Request

```http
POST /api/tour-requests/:id/cancel
```

**Access:** Request owner, `ADMIN`, `SYSTEM_ADMIN`, subject to business rules

---

# 9. Quotation APIs

## 9.1 Create Quotation

```http
POST /api/tour-requests/:tourRequestId/quotations
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "assignedGuideId": "guide-uuid",
  "title": "Customized Amazing Sri Lanka Tour",
  "description": "Personalized eight-day itinerary.",
  "startDate": "2026-12-15",
  "endDate": "2026-12-22",
  "adultCount": 4,
  "childCount": 2,
  "subtotal": 2200,
  "discountAmount": 100,
  "taxAmount": 50,
  "totalPrice": 2150,
  "currency": "USD",
  "validUntil": "2026-11-30T23:59:59.000Z",
  "notes": "Includes vegetarian meal arrangements.",
  "itinerary": [
    {
      "dayNumber": 1,
      "title": "Arrival in Colombo",
      "description": "Airport pickup and hotel transfer.",
      "accommodation": "Colombo Hotel",
      "meals": "Dinner"
    }
  ]
}
```

---

## 9.2 List Quotations for Tour Request

```http
GET /api/tour-requests/:tourRequestId/quotations
```

**Access:** Request owner, `ADMIN`, `SYSTEM_ADMIN`

---

## 9.3 Get Quotation by ID

```http
GET /api/quotations/:id
```

**Access:** Related tourist, assigned guide where appropriate, `ADMIN`, `SYSTEM_ADMIN`

---

## 9.4 Update Draft Quotation

```http
PATCH /api/quotations/:id
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

Only draft quotations may be directly edited.

---

## 9.5 Send Quotation

```http
POST /api/quotations/:id/send
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 9.6 Request Quotation Changes

```http
POST /api/quotations/:id/request-changes
```

**Access:** Related tourist

### Request

```json
{
  "message": "Please add one night in Ella and remove the Yala visit."
}
```

---

## 9.7 Create New Quotation Revision

```http
POST /api/quotations/:id/revisions
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

A new revision is created instead of overwriting a previously sent quotation.

---

## 9.8 Accept Quotation

```http
POST /api/quotations/:id/accept
```

**Access:** Related tourist

### Business Rules

- Quotation must have status `SENT`.
- Quotation must not be expired.
- No other quotation for the request may already be accepted.

---

## 9.9 Reject Quotation

```http
POST /api/quotations/:id/reject
```

**Access:** Related tourist

### Request

```json
{
  "reason": "The quotation exceeds the available budget."
}
```

---

## 9.10 Cancel Quotation

```http
POST /api/quotations/:id/cancel
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

# 10. Payment APIs

## 10.1 Initiate Payment

```http
POST /api/quotations/:quotationId/payments
```

**Access:** Related tourist

### Business Rules

- Quotation must be accepted.
- Payment must not already be completed.
- Amount must match the accepted quotation.

---

## 10.2 Get Payment by ID

```http
GET /api/payments/:id
```

**Access:** Related tourist, `ADMIN`, `SYSTEM_ADMIN`

---

## 10.3 List Own Payments

```http
GET /api/payments/me
```

**Access:** `TOURIST`

---

## 10.4 List All Payments

```http
GET /api/payments
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 10.5 Payment Gateway Webhook

```http
POST /api/payments/webhooks/:provider
```

**Access:** Payment provider with signature verification

The endpoint must:

- Verify provider signature.
- Process events idempotently.
- Update payment status.
- Create a booking after successful payment.

---

## 10.6 Retry Failed Payment

```http
POST /api/payments/:id/retry
```

**Access:** Related tourist

---

## 10.7 Refund Payment

```http
POST /api/payments/:id/refund
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

**Implementation:** Future phase

---

# 11. Booking APIs

## 11.1 List Own Bookings

```http
GET /api/bookings/me
```

**Access:** `TOURIST`

---

## 11.2 List Assigned Guide Bookings

```http
GET /api/bookings/assigned
```

**Access:** `TOUR_GUIDE`

---

## 11.3 List All Bookings

```http
GET /api/bookings
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Query Parameters

| Parameter | Description |
|---|---|
| `status` | Booking status |
| `touristId` | Filter by tourist |
| `guideId` | Filter by assigned guide |
| `startDateFrom` | Date range |
| `startDateTo` | Date range |
| `page` | Page number |
| `limit` | Records per page |

---

## 11.4 Get Booking by ID

```http
GET /api/bookings/:id
```

**Access:** Related tourist, assigned guide, `ADMIN`, `SYSTEM_ADMIN`

---

## 11.5 Start Tour

```http
POST /api/bookings/:id/start
```

**Access:** Assigned guide, `ADMIN`, `SYSTEM_ADMIN`

---

## 11.6 Complete Tour

```http
POST /api/bookings/:id/complete
```

**Access:** Assigned guide, `ADMIN`, `SYSTEM_ADMIN`

---

## 11.7 Cancel Booking

```http
POST /api/bookings/:id/cancel
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "reason": "Customer requested cancellation."
}
```

---

# 12. Review APIs

## 12.1 Submit Review

```http
POST /api/bookings/:bookingId/reviews
```

**Access:** Tourist who owns completed booking

### Request

```json
{
  "packageRating": 5,
  "guideRating": 5,
  "comment": "Excellent experience and a very helpful guide."
}
```

### Business Rules

- Booking must be completed.
- Only one review is allowed per booking.
- Ratings must be between 1 and 5.

---

## 12.2 List Published Reviews

```http
GET /api/reviews
```

**Access:** Public

---

## 12.3 Get Review by ID

```http
GET /api/reviews/:id
```

**Access:** Public for published reviews; authorized users for others

---

## 12.4 List Guide Reviews

```http
GET /api/tour-guides/:id/reviews
```

**Access:** Public

---

## 12.5 List Package Reviews

```http
GET /api/packages/:id/reviews
```

**Access:** Public

---

## 12.6 Moderate Review

```http
PATCH /api/reviews/:id/status
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Request

```json
{
  "status": "PUBLISHED"
}
```

---

## 12.7 Delete Own Review

```http
DELETE /api/reviews/:id
```

**Access:** Review owner subject to rules, `SYSTEM_ADMIN`

---

# 13. Admin Dashboard APIs

## 13.1 Get Dashboard Summary

```http
GET /api/admin/dashboard/summary
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

### Response Data

```json
{
  "pendingTourRequests": 12,
  "quotationsAwaitingResponse": 8,
  "confirmedBookings": 24,
  "upcomingTours": 6,
  "completedTours": 42,
  "totalPaidRevenue": 48500
}
```

---

## 13.2 Get Recent Tour Requests

```http
GET /api/admin/dashboard/recent-tour-requests
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 13.3 Get Upcoming Bookings

```http
GET /api/admin/dashboard/upcoming-bookings
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

## 13.4 Get Payment Summary

```http
GET /api/admin/dashboard/payment-summary
```

**Access:** `ADMIN`, `SYSTEM_ADMIN`

---

# 14. Health and Operational APIs

## 14.1 Health Check

```http
GET /api/health
```

**Access:** Public

### Response

```json
{
  "success": true,
  "message": "Travora API is healthy",
  "data": {
    "service": "travora-api",
    "status": "UP",
    "timestamp": "2026-07-11T12:30:00.000Z"
  },
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "example-id"
  }
}
```

---

## 14.2 Readiness Check

```http
GET /api/health/ready
```

**Access:** Infrastructure or internal use

Verifies:

- API process is running.
- Database is reachable.
- Required configuration is loaded.

---

# 15. API Validation Rules

## Common Rules

- UUID route parameters must contain valid UUIDs.
- Dates must follow ISO 8601.
- Currency values must use supported ISO currency codes.
- Counts must be non-negative integers.
- Start dates cannot be after end dates.
- Email addresses must be valid.
- Unknown request fields should be removed or rejected.
- Pagination limits must not exceed the configured maximum.

---

## Package Rules

- Title must be between 3 and 150 characters.
- Slug must be unique.
- Duration must be at least one day.
- Starting price must be positive.

---

## Tour Request Rules

- At least one adult is required.
- Package ID is required for package-based requests.
- Package ID must be omitted for fully custom requests.
- Preferred start date cannot be in the past.
- Child count cannot be negative.

---

## Quotation Rules

- End date must be after or equal to start date.
- Total price must be positive.
- Quotation revision number must be unique within a request.
- Only one accepted quotation is allowed per request.
- Sent quotations should not be overwritten.

---

## Payment Rules

- Payment can only begin after quotation acceptance.
- Payment amount must match the accepted quotation.
- Webhook events must be idempotent.

---

## Review Rules

- Booking must be completed.
- Only one review is permitted per booking.
- Ratings must be from 1 to 5.

---

# 16. Error Codes

The API may include a machine-readable code in error responses.

Example:

```json
{
  "success": false,
  "message": "Travel package not found",
  "data": null,
  "errors": [
    {
      "code": "PACKAGE_NOT_FOUND",
      "field": null,
      "message": "Travel package not found"
    }
  ],
  "meta": {
    "timestamp": "2026-07-11T12:30:00.000Z",
    "correlationId": "example-id"
  }
}
```

Suggested codes:

```text
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
AUTH_REFRESH_TOKEN_INVALID
USER_EMAIL_ALREADY_EXISTS
USER_NOT_FOUND
PACKAGE_NOT_FOUND
PACKAGE_SLUG_ALREADY_EXISTS
TOUR_REQUEST_NOT_FOUND
TOUR_REQUEST_INVALID_STATUS
QUOTATION_NOT_FOUND
QUOTATION_EXPIRED
QUOTATION_ALREADY_ACCEPTED
PAYMENT_NOT_ALLOWED
PAYMENT_ALREADY_COMPLETED
BOOKING_NOT_FOUND
REVIEW_NOT_ALLOWED
REVIEW_ALREADY_EXISTS
VALIDATION_FAILED
INTERNAL_SERVER_ERROR
```

---

# 17. Rate Limiting

Recommended initial limits:

| Endpoint Type | Suggested Limit |
|---|---:|
| General public APIs | 100 requests per 15 minutes per IP |
| Login | 5 attempts per 15 minutes per account/IP |
| Registration | 5 requests per hour per IP |
| Forgot password | 3 requests per hour per email/IP |
| Payment initiation | 10 requests per hour per user |
| Payment webhook | Provider-specific controls |

Exact values may be adjusted after monitoring production usage.

---

# 18. API Versioning

The initial implementation may use:

```text
/api
```

Before public third-party integrations or breaking changes, versioned endpoints should be introduced:

```text
/api/v1
```

Breaking changes should be delivered through a new API version rather than silently modifying existing contracts.

---

# 19. Idempotency

The following operations should support idempotency:

- Payment initiation
- Payment gateway webhook processing
- Booking creation after payment
- Quotation acceptance
- Notification delivery where required

Clients may send:

```http
Idempotency-Key: <unique-value>
```

---

# 20. API Implementation Priority

## Phase 1

- Health check
- Package CRUD
- Package filtering and pagination
- Authentication
- User profile

## Phase 2

- Tour guide management
- Package-based tour requests
- Custom tour requests
- Admin request management

## Phase 3

- Quotation creation
- Quotation revisions
- Quotation acceptance and rejection

## Phase 4

- Payment integration
- Booking creation
- Booking lifecycle

## Phase 5

- Reviews
- Admin dashboard
- Notifications

---

# 21. API Summary

Travora's APIs support the complete quotation-driven travel workflow:

```text
Authentication
      │
      ▼
Browse Packages / Guides
      │
      ▼
Submit Tour Request
      │
      ▼
Admin Reviews and Customizes
      │
      ▼
Create and Send Quotation
      │
      ▼
Tourist Accepts
      │
      ▼
Payment
      │
      ▼
Booking
      │
      ▼
Tour Completion
      │
      ▼
Review
```

The API design follows consistent response formats, authentication rules, role-based authorization, request validation, traceability, and modular business boundaries.