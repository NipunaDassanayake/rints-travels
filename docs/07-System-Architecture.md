# Travora - System Architecture

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** System Architecture  
**Architecture Style:** Modular Monolith  
**Future Direction:** Microservice-Ready Architecture

---

# 1. Introduction

This document describes the proposed software architecture for the Travora platform.

Travora is designed as a **quotation-driven digital travel operations platform** that enables travel agencies to manage the complete customer journey—from travel inquiry to confirmed booking.

The system will initially be developed as a **Modular Monolith**, allowing rapid development while maintaining clear business boundaries. As the platform grows, individual modules can be extracted into independent microservices with minimal architectural changes.

The architecture focuses on:

- High maintainability
- Scalability
- Security
- Separation of concerns
- Clean Architecture principles
- Domain-driven modularization
- Containerized deployment

---

# 2. High-Level System Architecture

```text
                    Tourist / Admin / Tour Guide
                                  │
                                  ▼
                         React Web Application
                                  │
                             HTTPS / REST API
                                  │
                                  ▼
                         Node.js + Express API
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       ▼                          ▼                          ▼
Authentication Module       Business Modules          Shared Core
       │                          │                          │
       └──────────────────────────┼──────────────────────────┘
                                  │
                                  ▼
                             Prisma ORM
                                  │
                                  ▼
                         PostgreSQL Database
```

The frontend communicates with the backend through REST APIs. The backend is organized into independent business modules that share common infrastructure components such as logging, authentication, validation, and database access.

---

# 3. Architecture Style

Travora follows a **Modular Monolith Architecture**.

Although deployed as a single backend application, each business capability is implemented as an independent module.

Benefits include:

- Simpler deployment
- Easier debugging
- Clear module boundaries
- Lower operational cost
- Easier testing
- Future microservice readiness

The major business modules include:

```text
Authentication
Users
Travel Packages
Tour Guides
Tour Requests
Tour Quotations
Payments
Bookings
Reviews
Notifications (Future)
```

Each module owns:

- Routes
- Controllers
- Services
- Repositories
- Validation
- DTOs
- Mappers
- Business Rules

---

# 4. Technology Stack

## Frontend

- React
- Vite
- React Router
- Axios
- Redux Toolkit (or Context API)
- Tailwind CSS / Material UI (TBD)

---

## Backend

- Node.js
- Express.js
- Prisma ORM
- JWT Authentication
- Joi Validation
- Pino Logger

---

## Database

- PostgreSQL

---

## Development Tools

- Docker
- Docker Compose
- Git
- GitHub
- Postman
- Prisma Studio

---

## Future Integrations

- Google OAuth
- WhatsApp Business API
- Email Service
- Payment Gateway
- Google Maps API

---

# 5. Backend Layered Architecture

Every request follows the same layered architecture.

```text
Route
  │
  ▼
Validation Middleware
  │
  ▼
Controller
  │
  ▼
Mapper / DTO
  │
  ▼
Service
  │
  ▼
Repository
  │
  ▼
Prisma ORM
  │
  ▼
PostgreSQL
```

This layered approach ensures that each layer has a single responsibility.

---

## Route Layer

Responsibilities:

- Register API endpoints
- Apply authentication
- Apply authorization
- Apply request validation
- Invoke controllers

Routes should not contain business logic.

---

## Controller Layer

Responsibilities:

- Read request parameters
- Read request body
- Invoke service methods
- Return standardized API responses

Controllers should remain thin and contain no business rules.

---

## DTO & Mapper Layer

Responsibilities:

- Convert HTTP requests into domain objects
- Convert database entities into API responses
- Prevent exposing internal database structures
- Maintain API consistency

---

## Service Layer

Responsibilities:

- Implement business logic
- Validate business rules
- Coordinate repositories
- Handle transactions
- Trigger notifications
- Manage workflow state transitions

All business logic belongs in this layer.

---

## Repository Layer

Responsibilities:

- Execute Prisma queries
- Perform CRUD operations
- Implement filtering
- Implement pagination
- Isolate database access

Repositories should not contain business logic.

---

## Database Layer

The persistence layer is implemented using PostgreSQL and Prisma ORM.

Responsibilities include:

- Data storage
- Constraints
- Relationships
- Transactions
- Indexing

---

# 6. Backend Project Structure

```text
backend/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
│
├── src/
│   ├── config/
│   ├── core/
│   ├── middlewares/
│   ├── modules/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   └── server.js
│
├── tests/
├── .env
├── docker-compose.yml
└── package.json
```

---

## Config

Contains application configuration.

Examples:

- Environment configuration
- Logger configuration
- Prisma configuration

---

## Core

Contains reusable framework-independent components.

Examples:

- Enums
- Constants
- Pagination
- Query Builder
- Shared Utilities

---

## Middlewares

Contains reusable Express middleware.

Examples:

- Authentication
- Authorization
- Correlation ID
- Request Logger
- Validation
- Error Handler

---

## Modules

Contains all business modules.

Each module is completely independent.

---

## Utils

Contains shared helper functions.

Examples:

- API Response Helpers
- Custom Errors
- Async Handler
- Date Helpers

---

# 7. Module Structure

Each module follows the same internal architecture.

Example:

```text
packages/
├── packages.routes.js
├── packages.controller.js
├── packages.service.js
├── packages.repository.js
├── packages.validation.js
├── packages.mapper.js
├── packages.query.js
└── packages.include.js
```

### Responsibilities

**Routes**

- API registration

**Controller**

- HTTP request handling

**Service**

- Business logic

**Repository**

- Database access

**Validation**

- Joi schemas

**Mapper**

- DTO conversion

**Query**

- Filtering and searching

**Include**

- Prisma include/select definitions

This consistent structure improves readability and maintainability.

---

# 8. Frontend Architecture

The frontend follows a feature-based architecture.

```text
frontend/
│
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── store/
│   ├── hooks/
│   ├── utils/
│   └── features/
│
└── public/
```

Each feature owns:

- Pages
- Components
- API Services
- State Management
- Validation
- Types

This structure keeps related functionality together and supports future growth of the application.

# 9. Request Lifecycle

Every API request follows a standardized processing pipeline to ensure consistency, security, validation, and traceability.

```text
Client Request
      │
      ▼
Correlation ID Middleware
      │
      ▼
Request Logger
      │
      ▼
Authentication Middleware
      │
      ▼
Authorization Middleware
      │
      ▼
Validation Middleware
      │
      ▼
Controller
      │
      ▼
Service
      │
      ▼
Repository
      │
      ▼
Prisma ORM
      │
      ▼
PostgreSQL
      │
      ▼
Repository
      │
      ▼
Service
      │
      ▼
Controller
      │
      ▼
Standard API Response
```

This lifecycle guarantees:

- Every request has a Correlation ID.
- Every request is logged.
- Every protected endpoint is authenticated.
- Every request is validated before business logic executes.
- Business logic remains independent from HTTP concerns.
- Responses follow a consistent structure.

---

# 10. Standard API Response Format

Travora follows a consistent response structure for all REST APIs.

## Success Response

```json
{
  "success": true,
  "message": "Tour request created successfully",
  "data": {},
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00Z",
    "correlationId": "f8bb8c78-d09f-4e93-a8de-a5a9cb4d21d1"
  }
}
```

---

## Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "Preferred travel date is required",
    "Budget must be greater than zero"
  ],
  "meta": {
    "timestamp": "2026-07-11T12:30:00Z",
    "correlationId": "f8bb8c78-d09f-4e93-a8de-a5a9cb4d21d1"
  }
}
```

---

## Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "data": null,
  "errors": null,
  "meta": {
    "timestamp": "2026-07-11T12:30:00Z",
    "correlationId": "f8bb8c78-d09f-4e93-a8de-a5a9cb4d21d1"
  }
}
```

This standardized response format simplifies frontend development and debugging.

---

# 11. Authentication Architecture

Travora uses **JWT-based authentication**.

## Login Flow

```text
User Login
      │
      ▼
Validate Credentials
      │
      ▼
Generate Access Token
      │
      ▼
Generate Refresh Token
      │
      ▼
Store Refresh Token
      │
      ▼
Return Tokens
```

---

## Access Token

Purpose:

- Authenticate API requests

Characteristics:

- Short-lived
- Contains:
  - User ID
  - User Role
  - Token Expiry

---

## Refresh Token

Purpose:

- Generate new access tokens

Characteristics:

- Long-lived
- Stored securely (hashed)
- Revocable
- Rotated after refresh

---

## Authentication Flow

```text
Login
   │
   ▼
Access Token
Refresh Token
      │
      ▼
Protected API
      │
      ▼
Token Expired?
      │
 ┌────┴────┐
 │         │
No        Yes
 │         │
 ▼         ▼
API      Refresh Token
            │
            ▼
      New Access Token
```

---

## Future Authentication

Travora may later support:

- Google OAuth
- Microsoft OAuth
- Multi-factor Authentication (MFA)
- Single Sign-On (SSO)

---

# 12. Authorization Architecture

Travora implements **Role-Based Access Control (RBAC).**

## User Roles

```text
SYSTEM_ADMIN

ADMIN

TOUR_GUIDE

TOURIST
```

---

## Permission Matrix

| Operation | Tourist | Tour Guide | Admin | System Admin |
|------------|:-------:|:----------:|:-----:|:------------:|
| Register | ✅ | ❌ | ❌ | ❌ |
| Login | ✅ | ✅ | ✅ | ✅ |
| Browse Packages | ✅ | ✅ | ✅ | ✅ |
| Submit Tour Request | ✅ | ❌ | ❌ | ❌ |
| View Own Quotations | ✅ | ❌ | ❌ | ❌ |
| Accept Quotation | ✅ | ❌ | ❌ | ❌ |
| Make Payment | ✅ | ❌ | ❌ | ❌ |
| View Assigned Tours | ❌ | ✅ | ✅ | ✅ |
| Manage Packages | ❌ | ❌ | ✅ | ✅ |
| Manage Quotations | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |

Authorization is enforced through middleware before controller execution.

---

# 13. Database Access Architecture

The application uses the **Repository Pattern**.

```text
Controller
      │
      ▼
Service
      │
      ▼
Repository
      │
      ▼
Prisma ORM
      │
      ▼
PostgreSQL
```

Advantages:

- Loose coupling
- Easier testing
- Cleaner business logic
- Database abstraction
- Easier migration to another ORM

Business logic must never directly access Prisma.

---

# 14. Transaction Management

Business operations involving multiple database updates shall execute within a single database transaction.

Example:

## Create Travel Package

```text
Create Package
      │
      ▼
Create Images
      │
      ▼
Create Itinerary
      │
      ▼
Create Inclusions
      │
      ▼
Create Exclusions
      │
      ▼
Create FAQs
```

If any step fails:

- Entire transaction rolls back.

---

## Accept Quotation

```text
Update Quotation Status
        │
        ▼
Update Tour Request
        │
        ▼
Create Payment Record
```

---

## Payment Success

```text
Update Payment
      │
      ▼
Create Booking
      │
      ▼
Update Tour Request
```

Transactions ensure database consistency.

---

# 15. Logging & Observability

Travora uses **Pino** for structured logging.

Each request log should include:

- Correlation ID
- HTTP Method
- Endpoint
- Response Status
- Response Time
- Authenticated User ID
- Client IP
- Error Details (when applicable)

Example log:

```json
{
  "level": "info",
  "correlationId": "f8bb8c78-d09f",
  "method": "POST",
  "url": "/api/tour-requests",
  "status": 201,
  "duration": "85ms",
  "userId": "usr_001"
}
```

Future integrations may include:

- Grafana
- Loki
- OpenTelemetry
- Elasticsearch
- CloudWatch

---

# 16. Error Handling Strategy

Travora implements centralized error handling.

Controllers never send error responses directly.

Instead, errors propagate to a global error handler.

```text
Controller
      │
      ▼
Throw AppError
      │
      ▼
Global Error Handler
      │
      ▼
Standard API Response
```

---

## Error Types

| Error | HTTP Status |
|---------|------------|
| BadRequestError | 400 |
| UnauthorizedError | 401 |
| ForbiddenError | 403 |
| NotFoundError | 404 |
| ConflictError | 409 |
| ValidationError | 422 |
| InternalServerError | 500 |

---

## Error Handling Principles

- Never expose internal implementation details.
- Log unexpected errors.
- Return user-friendly messages.
- Preserve Correlation ID for troubleshooting.
- Use custom exception classes.
- Handle operational and unexpected errors separately.


# 17. Security Architecture

Security is implemented across every layer of the application.

## Authentication

Travora uses JSON Web Tokens (JWT) for authentication.

Features include:

- Access Tokens
- Refresh Tokens
- Token Rotation
- Token Revocation
- Password Hashing using bcrypt

---

## Authorization

Role-Based Access Control (RBAC) is implemented for all protected resources.

Supported roles:

- Tourist
- Tour Guide
- Admin
- System Administrator

Each protected endpoint validates the user's permissions before allowing access.

---

## Input Validation

All incoming requests are validated using Joi before reaching the business logic.

Validation includes:

- Required fields
- Data types
- String lengths
- Date validation
- Numeric ranges
- Enum validation

---

## API Security

The API should implement:

- JWT Authentication
- CORS Configuration
- Helmet Security Headers
- Rate Limiting
- Request Validation
- SQL Injection Protection via Prisma
- XSS Protection
- Environment Variable Management

---

## Password Security

Passwords shall:

- Never be stored in plain text
- Be hashed using bcrypt
- Require minimum complexity
- Be reset using secure tokens

---

## Audit & Traceability

Important operations shall be logged.

Examples:

- Login
- Logout
- Tour Request Creation
- Quotation Acceptance
- Payment Completion
- Booking Confirmation

Every request shall include a Correlation ID for end-to-end traceability.

---

# 18. Deployment Architecture

## Development Environment

The local development environment consists of:

```text
Docker Compose

├── Backend API
└── PostgreSQL Database
```

---

## Production Environment

```text
Internet
      │
      ▼
Reverse Proxy (Nginx)
      │
      ├───────────────┐
      ▼               ▼
React Frontend   Express Backend
                      │
                      ▼
                 PostgreSQL
```

Production deployment should support:

- HTTPS
- Environment Variables
- Automatic Restarts
- Persistent Database Storage
- Daily Database Backups
- Health Checks
- Docker Containers

---

# 19. Module Responsibilities

Each module owns its own business logic.

---

## Authentication Module

Responsibilities

- Register
- Login
- Logout
- Refresh Token
- Password Reset
- Email Verification

---

## Users Module

Responsibilities

- User Profiles
- User Status
- Role Management

---

## Packages Module

Responsibilities

- Travel Package Templates
- Images
- Itineraries
- Inclusions
- Exclusions
- FAQs

---

## Tour Requests Module

Responsibilities

- Package-Based Requests
- Custom Requests
- Status Management
- Admin Assignment

---

## Quotations Module

Responsibilities

- Create Quotations
- Edit Quotations
- Send Quotations
- Assign Tour Guides
- Manage Revisions

---

## Payments Module

Responsibilities

- Payment Initiation
- Payment Status
- Gateway Integration
- Refund Handling (Future)

---

## Bookings Module

Responsibilities

- Booking Confirmation
- Booking Status
- Tour Completion

---

## Reviews Module

Responsibilities

- Submit Reviews
- Moderate Reviews
- Guide Ratings
- Package Ratings

---

## Notifications Module (Future)

Responsibilities

- Email Notifications
- SMS Notifications
- WhatsApp Notifications
- Push Notifications

---

# 20. Future Microservice Architecture

When Travora grows, selected modules may be extracted into independent services.

```text
                     API Gateway
                          │
 ┌──────────┬──────────┬──────────┬──────────┐
 │          │          │          │          │
 ▼          ▼          ▼          ▼          ▼
Identity  Package   Request   Booking   Payment
Service   Service   Service   Service   Service
                          │
                          ▼
                  Notification Service
```

Each service should own:

- Business Logic
- API
- Database
- Deployment Pipeline

Communication options include:

- REST APIs
- RabbitMQ
- Kafka

---

## Candidate Domain Events

Examples:

```text
TourRequestCreated

QuotationCreated

QuotationSent

QuotationAccepted

PaymentCompleted

BookingConfirmed

GuideAssigned

TourCompleted

ReviewSubmitted
```

These events enable loose coupling between services in a future distributed architecture.

---

# 21. Architecture Decision Records (ADR)

## ADR-001

### Decision

Use Modular Monolith Architecture.

### Reason

Provides fast development while maintaining clear module boundaries.

---

## ADR-002

### Decision

Use PostgreSQL.

### Reason

Provides strong relational modeling, transactions, indexing, and scalability.

---

## ADR-003

### Decision

Use Prisma ORM.

### Reason

Provides type-safe database access, migrations, and clean model definitions.

---

## ADR-004

### Decision

Use REST APIs.

### Reason

Simple integration with React frontend and external systems.

---

## ADR-005

### Decision

Use Docker.

### Reason

Ensures consistent development, testing, and production environments.

---

## ADR-006

### Decision

Use JWT Authentication.

### Reason

Stateless authentication suitable for modern web applications.

---

## ADR-007

### Decision

Adopt Layered Architecture.

### Reason

Improves maintainability by separating presentation, business logic, and data access.

---

# 22. Scalability Strategy

Travora is designed to scale progressively.

## Phase 1

Single Server

```text
React

↓

Express

↓

PostgreSQL
```

---

## Phase 2

Containerized Deployment

```text
Docker

↓

Express

↓

PostgreSQL
```

---

## Phase 3

Load Balanced Deployment

```text
Load Balancer

↓

Multiple Backend Instances

↓

Shared PostgreSQL Database
```

---

## Phase 4

Microservices

```text
API Gateway

↓

Independent Business Services

↓

Separate Databases
```

This phased approach minimizes complexity while supporting long-term growth.

---

# 23. Architecture Summary

Travora follows a clean, layered, modular architecture.

Overall architecture:

```text
React Frontend
        │
        ▼
REST API
        │
        ▼
Express.js Backend
        │
        ▼
Layered Business Modules
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL Database
```

### Architectural Principles

- Modular Monolith
- Layered Architecture
- Repository Pattern
- Service Layer Pattern
- DTO & Mapper Pattern
- Role-Based Access Control (RBAC)
- JWT Authentication
- Structured Logging
- Correlation IDs
- Transaction Management
- Soft Deletion
- Containerized Deployment
- Microservice Ready

### Conclusion

The proposed architecture provides a maintainable, scalable, and secure foundation for Travora. By adopting a modular monolith with clear separation of concerns, the platform supports rapid development today while remaining flexible enough to evolve into a distributed microservice architecture as business requirements grow.