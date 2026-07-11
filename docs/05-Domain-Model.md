# Travora - Domain Model

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** Domain Model

---

# 1. Introduction

This document defines the core business entities of the Travora platform and their relationships.

The Domain Model represents the business concepts that drive the application and serves as the foundation for database design, API development, and business logic implementation.

---

# 2. Domain Overview

Travora is centered around the **Tour Request**.

Unlike traditional travel booking systems, customers do not directly purchase travel packages. Instead, they submit a travel request, collaborate with the travel agency, receive a customized quotation, and complete payment only after accepting the quotation.

```
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

# 3. Core Business Entities

## 3.1 User

### Description

Represents every authenticated user of the platform.

### User Types

- Tourist
- Admin
- Tour Guide

### Responsibilities

- Authenticate into the system
- Perform role-based actions
- Maintain profile information

### Relationships

- Tourist creates Tour Requests
- Admin manages Tour Requests
- Tour Guide is assigned to Quotations
- Tourist submits Reviews

---

## 3.2 Travel Package Template

### Description

Represents predefined travel packages published by the travel agency.

Packages are not directly bookable.

They act as inspiration for tourists.

### Contains

- Basic Information
- Images
- Sample Itinerary
- Inclusions
- Exclusions
- FAQs

### Relationships

- May be referenced by a Tour Request

---

## 3.3 Tour Request

### Description

The starting point of every customer journey.

A Tour Request may be:

- Package-Based
- Fully Customized

### Contains

- Travel Preferences
- Travel Dates
- Number of Travelers
- Budget
- Preferred Guide
- Special Requirements
- Contact Preference

### Relationships

- Created by Tourist
- Reviewed by Admin
- Generates Tour Quotation

---

## 3.4 Tour Quotation

### Description

Represents the customized travel proposal prepared by the travel agency.

### Contains

- Final Itinerary
- Hotels
- Transportation
- Activities
- Assigned Tour Guide
- Total Price

### Relationships

- Linked to one Tour Request
- Assigned to one Tour Guide
- Generates one Payment

---

## 3.5 Payment

### Description

Represents the payment made for an accepted quotation.

### Relationships

- Linked to one Tour Quotation
- Generates one Booking

---

## 3.6 Booking

### Description

Represents a confirmed travel plan.

A booking only exists after successful payment.

### Relationships

- Linked to Payment
- Linked to Tourist
- Linked to Tour Guide

---

## 3.7 Review

### Description

Represents customer feedback submitted after a completed tour.

### Relationships

- Created by Tourist
- May reference Booking
- May rate Tour Guide
- May rate Travel Package

---

# 4. Supporting Entities

## Package Image

Stores package images.

---

## Itinerary Item

Represents one day of a travel itinerary.

---

## Inclusion

Represents services included within a package.

Examples

- Breakfast
- Airport Pickup
- Accommodation

---

## Exclusion

Represents services not included.

Examples

- Air Tickets
- Visa Fees
- Personal Expenses

---

## FAQ

Frequently asked questions related to a package.

---

# 5. Entity Relationships

| Parent | Relationship | Child |
|---------|--------------|-------|
| User (Tourist) | Creates | Tour Request |
| Tour Request | Generates | Tour Quotation |
| Tour Quotation | Produces | Payment |
| Payment | Confirms | Booking |
| Booking | Receives | Review |
| Travel Package Template | May Be Referenced By | Tour Request |
| Tour Guide | Assigned To | Tour Quotation |

---

# 6. Aggregate Boundaries

## Travel Package Aggregate

- Travel Package
- Images
- Itinerary
- Inclusions
- Exclusions
- FAQs

---

## Tour Request Aggregate

- Tour Request
- Preferred Guide
- Travel Preferences

---

## Quotation Aggregate

- Tour Quotation
- Assigned Guide
- Final Price
- Customized Itinerary

---

## Booking Aggregate

- Booking
- Payment
- Review

---

# 7. Domain Rules

- A Travel Package Template cannot be booked directly.
- Every Booking originates from a Tour Request.
- Every Tour Request may produce one or more quotation revisions.
- Payment is only possible after quotation acceptance.
- Booking is only created after successful payment.
- Tour Guides are assigned during quotation preparation.
- Reviews are only allowed after tour completion.

---

# 8. Future Domain Extensions

Future versions may introduce:

- Hotel Entity
- Vehicle Entity
- Driver Entity
- Promotion Entity
- Coupon Entity
- Travel Insurance
- Visa Assistance
- Flight Reservation
- Activity Booking
- Multi-Agency Support