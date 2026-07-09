# Travora - System Requirements Specification (SRS)

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** Software Requirements Specification (SRS)  
**Prepared By:** Project Team

---

# 1. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements of the Travora platform. The document translates the business requirements into technical requirements that will guide the design, development, testing, deployment, and maintenance of the system.

## 1.2 Scope

Travora is a quotation-driven digital travel operations platform that enables travel agencies to manage the complete customer journey from travel inquiry to confirmed booking.

The platform allows tourists to:

- Browse travel package templates
- Submit package-based or custom travel requests
- Receive customized travel quotations
- Accept quotations
- Complete online payments
- View confirmed bookings
- Submit reviews after travel completion

The platform enables administrators to:

- Manage travel packages
- Manage tour guides
- Manage customer requests
- Prepare customized quotations
- Assign tour guides
- Track bookings
- Monitor payments
- Generate reports

---

# 2. Overall System Description

Travora follows a quotation-driven workflow instead of a fixed booking workflow.

Every customer journey starts with a Tour Request.

Travel packages act as templates or inspiration rather than directly bookable tours.

The overall workflow is:

```
Package (Optional)
        │
        ▼
 Tour Request
        │
        ▼
 Admin Discussion
        │
        ▼
 Tour Quotation
        │
        ▼
 Tourist Decision
        │
        ▼
 Payment
        │
        ▼
 Booking
        │
        ▼
 Completed Tour
        │
        ▼
 Review
```

---

# 3. User Types

## Tourist

- Register/Login
- Browse packages
- Submit requests
- View quotations
- Make payments
- View bookings
- Leave reviews

---

## Admin

- Manage users
- Manage packages
- Manage guides
- Review requests
- Prepare quotations
- Assign guides
- Manage bookings
- Manage payments
- View reports

---

## Tour Guide

- Maintain profile
- View assigned tours
- View traveler information
- Complete assigned tours

---

## System Administrator

- Manage system configuration
- Manage user permissions
- Monitor platform health

---

# 4. Functional Requirements

## FR-001 User Registration

The system shall allow tourists to register using email and password.

---

## FR-002 User Authentication

The system shall authenticate users using JWT authentication.

---

## FR-003 Browse Packages

The system shall display active travel package templates.

---

## FR-004 Search Packages

The system shall allow tourists to search, sort, and filter travel packages.

---

## FR-005 Submit Package-Based Tour Request

The system shall allow tourists to submit travel requests based on existing travel package templates.

---

## FR-006 Submit Custom Tour Request

The system shall allow tourists to submit fully customized travel requests.

---

## FR-007 Manage Tour Requests

The system shall allow administrators to review, update, and manage tour requests.

---

## FR-008 Prepare Tour Quotation

The system shall allow administrators to prepare customized quotations.

---

## FR-009 Assign Tour Guide

The system shall allow administrators to assign tour guides during quotation preparation.

---

## FR-010 Send Quotation

The system shall allow administrators to send quotations to tourists.

---

## FR-011 Accept Quotation

The system shall allow tourists to accept quotations.

---

## FR-012 Reject Quotation

The system shall allow tourists to reject quotations.

---

## FR-013 Payment Processing

The system shall allow tourists to complete payments after quotation acceptance.

---

## FR-014 Booking Management

The system shall create bookings after successful payments.

---

## FR-015 Review Management

The system shall allow tourists to submit reviews after tour completion.

---

## FR-016 Package Management

The system shall allow administrators to create, update, deactivate, and manage travel package templates.

---

## FR-017 Tour Guide Management

The system shall allow administrators to manage tour guide profiles.

---

## FR-018 Dashboard

The system shall provide dashboards for administrators to monitor requests, quotations, bookings, and payments.

---

# 5. Non-Functional Requirements

## Performance

- API response time should be less than 500ms under normal operating conditions.
- Pagination shall be implemented for all listing endpoints.
- Database queries shall be optimized.

---

## Security

- Passwords shall be encrypted using bcrypt.
- Authentication shall use JWT.
- Role-based authorization shall be enforced.
- HTTPS shall be used in production.
- Input validation shall be implemented.
- SQL Injection protection shall be provided through Prisma ORM.

---

## Reliability

- System shall support graceful error handling.
- Database transactions shall ensure data consistency.
- Logging shall be available for all critical operations.

---

## Maintainability

The system shall follow:

- Layered Architecture
- Repository Pattern
- Service Layer
- DTO Pattern
- Mapper Pattern
- Modular Architecture

---

## Scalability

The platform shall support future migration from a modular monolith to a microservice architecture.

---

## Availability

The system should target 99.9% availability.

---

# 6. Technology Stack

## Backend

- Node.js
- Express.js

## Database

- PostgreSQL

## ORM

- Prisma ORM

## Authentication

- JWT
- Google OAuth (Future)

## Frontend

- React.js

## State Management

- Redux Toolkit

## Validation

- Joi

## Logging

- Pino

## Containerization

- Docker

## Version Control

- Git
- GitHub

---

# 7. External Integrations

Future integrations include:

- Google OAuth
- Payment Gateway (Stripe / PayHere / PayPal)
- WhatsApp Business API
- Email Service (SMTP)
- Google Maps API
- SMS Gateway

---

# 8. Security Requirements

The system shall:

- Hash passwords before storage.
- Validate all API inputs.
- Protect routes using JWT.
- Implement Role-Based Access Control (RBAC).
- Maintain audit-friendly logs.
- Support soft deletion of business records.
- Use Correlation IDs for request tracing.

---

# 9. Architectural Requirements

The platform shall follow a Modular Monolith architecture consisting of:

- Authentication Module
- User Module
- Travel Package Module
- Tour Guide Module
- Tour Request Module
- Tour Quotation Module
- Booking Module
- Payment Module
- Review Module

Each module shall contain:

- Routes
- Controllers
- Services
- Repositories
- Validation
- DTOs
- Mappers

Shared functionality shall be maintained within a reusable Core module.

---

# 10. Deployment Requirements

The application shall support deployment using Docker.

Development environment shall include:

- Backend API
- PostgreSQL Database

Production deployment should support:

- Docker Compose
- Reverse Proxy
- HTTPS
- Environment-based configuration

---

# 11. Future Enhancements

Future versions of Travora may include:

- AI itinerary recommendations
- Dynamic quotation revisions
- WhatsApp chatbot
- Hotel reservation integration
- Flight reservation integration
- Mobile applications
- Customer loyalty programme
- Tour guide scheduling
- Multi-agency SaaS platform
- Analytics Dashboard
- AI-powered travel assistant

---

# 12. Acceptance Criteria

The system shall be considered complete when:

- Tourists can successfully register and authenticate.
- Tourists can browse travel packages.
- Tourists can submit package-based and custom travel requests.
- Administrators can manage requests and prepare quotations.
- Tourists can accept quotations and complete payments.
- Bookings are created only after successful payment.
- Tour guides can access assigned tours.
- Customers can submit reviews after completed tours.
- All APIs are secured using role-based authentication.
- The application is deployable using Docker.

---

# 13. Document References

- 01 - Business Requirements Document (BRD)
- 02 - Business Process & Workflows
- 03 - Use Case Specification