# Travora - Development Roadmap

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** Development Roadmap

---

# 1. Purpose

This document defines the planned implementation sequence for Travora.

The roadmap is designed to deliver the system incrementally while maintaining a stable, testable, and deployable application throughout development.

---

# 2. Development Approach

Travora will be implemented using an iterative milestone-based approach.

Each milestone should include:

- Design review
- Database changes
- Backend implementation
- Validation
- Testing
- Documentation updates
- Git commit
- Pull request to the main branch when stable

The project will initially follow a modular monolith architecture while preserving clear module boundaries for future microservice extraction.

---

# 3. Branching Strategy

```text
main
└── Stable, tested code

development
└── Active integration branch

feature/*
└── Individual feature development

hotfix/*
└── Urgent production fixes
```

Examples:

```text
feature/authentication
feature/tour-requests
feature/quotation-management
hotfix/payment-status
```

---

# 4. Milestone 1 - Project Foundation

## Status

```text
Completed
```

## Scope

- Git repository
- Development branch
- Node.js and Express setup
- Environment configuration
- Dockerized PostgreSQL
- Prisma ORM
- Centralized route registration
- Standard API responses
- Global error handling
- Request logging
- Correlation IDs
- Joi validation
- Async handler
- Pino logger
- Pagination
- Filtering
- Sorting
- DTO and mapper pattern
- Package repository and service layers

## Deliverables

- Running backend API
- Working PostgreSQL database
- Health-check endpoint
- Initial package CRUD APIs
- Core reusable backend utilities

---

# 5. Milestone 2 - Documentation and System Design

## Status

```text
Completed
```

## Scope

- Business Requirements Document
- Business Process and Workflows
- Use Case Specification
- System Requirements Specification
- Domain Model
- Database Design
- System Architecture
- API Specification
- Frontend Screen Specification
- Development Roadmap

## Deliverables

- Complete initial project blueprint
- Defined business workflow
- Defined domain entities
- Defined module boundaries
- Defined API contracts
- Defined frontend screens

---

# 6. Milestone 3 - Authentication and User Management

## Objectives

Implement secure authentication and role-based access.

## Backend Scope

- User Prisma model
- Refresh token model
- Email verification token model
- Password reset token model
- Tourist registration
- Login
- JWT access token generation
- Refresh token generation
- Refresh token rotation
- Logout
- Password hashing
- Current-user endpoint
- Email verification
- Forgot-password flow
- Reset-password flow
- Authentication middleware
- Role-based authorization middleware
- User profile management
- User status management
- User role management

## Frontend Scope

- Registration screen
- Login screen
- Forgot-password screen
- Reset-password screen
- Email-verification screen
- Protected routes
- Role-based navigation
- Profile screen

## Testing

- Registration tests
- Login tests
- Token refresh tests
- Unauthorized access tests
- Role authorization tests
- Password reset tests

## Completion Criteria

- Tourists can register and log in.
- Authenticated users can access protected routes.
- Access and refresh tokens work correctly.
- Admin-only routes reject unauthorized users.
- Passwords are securely hashed.

---

# 7. Milestone 4 - Travel Package Completion

## Objectives

Complete the package-management module according to the approved design.

## Backend Scope

- Migrate package IDs to UUIDs if approved
- Soft deletion
- Package status handling
- Package images
- Primary image management
- Package itineraries
- Package inclusions
- Package exclusions
- Package FAQs
- Package search
- Package filtering
- Package sorting
- Package pagination
- Package lookup by slug
- Transactional package creation
- Transactional package update

## Frontend Scope

- Package listing
- Package details
- Admin package list
- Create package
- Edit package
- Image management
- Itinerary editor
- Inclusion and exclusion management
- FAQ management

## Testing

- Package CRUD tests
- Slug uniqueness tests
- Filtering tests
- Transaction rollback tests
- Soft-delete tests

## Completion Criteria

- Admin can fully manage package templates.
- Public users can browse active packages.
- Package details include images, itinerary, inclusions, exclusions, and FAQs.

---

# 8. Milestone 5 - Tour Guide Management

## Objectives

Allow the agency to manage tour guides and allow tourists to browse guide profiles.

## Backend Scope

- Tour guide profile model
- Guide-user relationship
- Guide creation
- Guide profile update
- Guide status update
- Languages
- Specializations
- Experience
- Location
- Availability
- Rating summary
- Guide search and filtering

## Frontend Scope

- Public guide listing
- Guide details
- Admin guide management
- Guide profile editor
- Guide dashboard foundation

## Testing

- Guide-profile tests
- Guide-filtering tests
- Authorization tests
- Guide-status tests

## Completion Criteria

- Admin can create and manage tour guides.
- Tourists can browse guide profiles.
- Guides can update permitted profile fields.

---

# 9. Milestone 6 - Tour Request Management

## Objectives

Implement the core customer inquiry workflow.

## Backend Scope

- Tour request model
- Package-based request creation
- Fully customized request creation
- Preferred guide selection
- Contact-method selection
- Request status workflow
- Tourist-owned request updates
- Admin assignment
- Admin request editing
- Request cancellation
- Request filtering and pagination
- Request history or status timeline

## Frontend Scope

- Package-based request form
- Plan My Trip form
- Tourist request list
- Tourist request details
- Admin request list
- Admin request details
- Admin assignment
- Status updates
- Edit request interface

## Testing

- Package-based request tests
- Custom request tests
- Ownership tests
- Status-transition tests
- Admin-assignment tests
- Validation tests

## Completion Criteria

- Tourist can submit both request types.
- Admin can review and edit requests.
- Request statuses follow the approved workflow.
- Unauthorized users cannot access another tourist's request.

---

# 10. Milestone 7 - Quotation Management

## Objectives

Allow admins to create and send customized travel quotations.

## Backend Scope

- Tour quotation model
- Quotation itinerary model
- Draft quotation creation
- Guide assignment
- Price breakdown
- Quotation send operation
- Quotation expiration
- Tourist quotation view
- Quotation acceptance
- Quotation rejection
- Change-request flow
- Quotation revision support
- Only one accepted quotation per request
- Transactional status updates

## Frontend Scope

- Admin quotation list
- Create quotation
- Edit draft quotation
- Send quotation
- Tourist quotation list
- Quotation details
- Accept quotation
- Reject quotation
- Request changes
- Revision history display

## Testing

- Draft quotation tests
- Send operation tests
- Acceptance tests
- Expiration tests
- Revision tests
- Single-accepted-quotation constraint tests

## Completion Criteria

- Admin can create and send quotations.
- Tourist can review and respond.
- Sent quotations are preserved.
- Accepted quotation enables payment.

---

# 11. Milestone 8 - Payment Integration

## Objectives

Allow tourists to pay for accepted quotations.

## Backend Scope

- Payment model
- Payment initiation
- Gateway integration
- Payment reference storage
- Webhook processing
- Signature verification
- Idempotency handling
- Payment retry
- Payment status tracking
- Failure reason storage
- Refund foundation

## Frontend Scope

- Payment page
- Payment summary
- Payment success screen
- Payment failure screen
- Retry-payment action
- Payment history

## Testing

- Payment initiation tests
- Webhook signature tests
- Duplicate-webhook tests
- Failed-payment tests
- Successful-payment tests

## Completion Criteria

- Payment is allowed only for accepted quotations.
- Webhook processing is idempotent.
- Successful payment triggers booking creation.

---

# 12. Milestone 9 - Booking Management

## Objectives

Manage confirmed tours after successful payment.

## Backend Scope

- Booking model
- Booking-reference generation
- Booking creation after payment
- Tourist booking list
- Guide-assigned booking list
- Admin booking list
- Booking status workflow
- Start tour
- Complete tour
- Cancel booking
- Booking filtering

## Frontend Scope

- Tourist booking list
- Tourist booking details
- Admin booking management
- Guide assigned tours
- Guide tour details
- Start and complete actions

## Testing

- Booking-creation tests
- Duplicate-booking prevention
- Ownership tests
- Guide-access tests
- Status-transition tests

## Completion Criteria

- A booking is created exactly once after payment.
- Tourist, admin, and assigned guide receive appropriate access.
- Booking lifecycle is enforced.

---

# 13. Milestone 10 - Reviews and Ratings

## Objectives

Allow tourists to submit feedback after completed tours.

## Backend Scope

- Review model
- One review per booking
- Package rating
- Guide rating
- Review moderation
- Average-rating calculations
- Published-review listing
- Soft deletion

## Frontend Scope

- Review form
- Package reviews
- Guide reviews
- Admin moderation
- Tourist review history

## Testing

- Completed-booking rule
- Duplicate-review prevention
- Rating-range validation
- Moderation tests

## Completion Criteria

- Reviews are permitted only for completed bookings.
- Package and guide ratings are displayed correctly.
- Admin can moderate submitted reviews.

---

# 14. Milestone 11 - Admin Dashboard

## Objectives

Provide operational visibility for agency staff.

## Backend Scope

- Dashboard summary
- Pending-request counts
- Quotation-response counts
- Booking counts
- Upcoming-tour counts
- Payment totals
- Revenue summary
- Recent activity

## Frontend Scope

- Dashboard cards
- Recent requests
- Upcoming bookings
- Payment summary
- Guide-assignment overview
- Charts where useful

## Completion Criteria

- Admin can view key operational information.
- Dashboard data respects permissions and filters.

---

# 15. Milestone 12 - Notifications

## Objectives

Notify users about important workflow events.

## Initial Scope

- Email verification
- Password reset
- Quotation sent
- Quotation accepted
- Payment successful
- Booking confirmed
- Upcoming-tour reminder

## Future Scope

- WhatsApp notifications
- SMS
- Push notifications

## Technical Direction

Notification logic should be isolated so it can later be extracted into a separate service.

---

# 16. Milestone 13 - Frontend Completion

## Objectives

Complete the main user interfaces and role-based portals.

## Scope

- Public website
- Tourist portal
- Admin portal
- Tour guide portal
- Responsive layouts
- Accessibility improvements
- Error and empty states
- Loading states
- Toast notifications
- Form validation
- Session handling

## Completion Criteria

- Core user journeys work end to end.
- Screens are responsive.
- Role-based navigation is enforced.
- API errors are presented clearly.

---

# 17. Milestone 14 - Testing and Quality Assurance

## Backend Testing

- Unit tests
- Service tests
- Repository integration tests
- API integration tests
- Authentication tests
- Business workflow tests

## Frontend Testing

- Component tests
- Form-validation tests
- Protected-route tests
- Critical user-flow tests

## Additional Quality Checks

- ESLint
- Prettier
- Security audit
- Dependency audit
- Performance review
- Database index review
- API documentation review

---

# 18. Milestone 15 - Deployment

## Objectives

Deploy Travora in a secure and maintainable production environment.

## Scope

- Backend Dockerfile
- Frontend Dockerfile
- Production Docker Compose
- Reverse proxy
- HTTPS
- Environment configuration
- Database backup plan
- Health checks
- Restart policies
- Logging setup
- CI/CD pipeline
- Domain configuration

## Completion Criteria

- Application is accessible through HTTPS.
- Database data persists across deployments.
- Environment secrets are managed securely.
- Health checks pass.
- Deployment process is documented.

---

# 19. Recommended Implementation Order

```text
1. Authentication and Users
2. Complete Travel Packages
3. Tour Guides
4. Tour Requests
5. Quotations
6. Payments
7. Bookings
8. Reviews
9. Admin Dashboard
10. Notifications
11. Frontend Completion
12. Testing
13. Deployment
```

---

# 20. Definition of Done

A feature is considered complete when:

- Requirements are implemented.
- Validation is included.
- Authorization is enforced.
- Business rules are tested.
- Errors use standard responses.
- Logs include correlation IDs.
- Database migrations are committed.
- API documentation is updated.
- Frontend integration works where applicable.
- Code is reviewed.
- Changes are committed with a meaningful message.

---

# 21. Roadmap Summary

Travora will be developed incrementally, beginning with security and core business data, followed by the complete quotation-driven workflow.

```text
Foundation
    │
    ▼
Authentication
    │
    ▼
Packages and Guides
    │
    ▼
Tour Requests
    │
    ▼
Quotations
    │
    ▼
Payments
    │
    ▼
Bookings
    │
    ▼
Reviews and Reporting
    │
    ▼
Deployment
```

This roadmap provides a practical path from the current backend foundation to a complete, production-ready travel operations platform.