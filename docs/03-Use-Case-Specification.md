# Travora - Use Case Specification

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** Use Case Specification

---

## 1. Overview

This document defines the main use cases supported by Travora. Each use case describes how tourists, admins, tour guides, and system administrators interact with the platform.

---

## 2. Actors

| Actor | Description |
|---|---|
| Tourist | Customer who browses packages, submits requests, reviews quotations, makes payments, and leaves reviews |
| Admin | Travel agency staff member who manages requests, quotations, guides, payments, and bookings |
| Tour Guide | Guide who views assigned tours and receives reviews |
| System Administrator | User who manages system-level settings and access |
| Payment Provider | External service used to process payments |

---

## 3. Use Case List

| ID | Use Case | Primary Actor |
|---|---|---|
| UC-001 | Register Account | Tourist |
| UC-002 | Login | Tourist / Admin / Tour Guide |
| UC-003 | Browse Travel Packages | Tourist |
| UC-004 | View Package Details | Tourist |
| UC-005 | Submit Package-Based Tour Request | Tourist |
| UC-006 | Submit Fully Customized Tour Request | Tourist |
| UC-007 | Review Tour Request | Admin |
| UC-008 | Edit Tour Request | Admin |
| UC-009 | Assign Tour Guide | Admin |
| UC-010 | Create Tour Quotation | Admin |
| UC-011 | Send Tour Quotation | Admin |
| UC-012 | View Tour Quotation | Tourist |
| UC-013 | Accept Tour Quotation | Tourist |
| UC-014 | Reject Tour Quotation | Tourist |
| UC-015 | Request Quotation Changes | Tourist |
| UC-016 | Make Payment | Tourist |
| UC-017 | Confirm Booking | System |
| UC-018 | View Assigned Tours | Tour Guide |
| UC-019 | Complete Tour | Admin / Tour Guide |
| UC-020 | Submit Review | Tourist |

---

## 4. Detailed Use Cases

### UC-001 - Register Account

**Primary Actor:** Tourist  
**Goal:** Create a tourist account.

**Preconditions:**
- Tourist is not already registered.

**Main Flow:**
1. Tourist opens registration page.
2. Tourist enters required details.
3. System validates details.
4. System creates account.
5. System confirms registration.

**Postconditions:**
- Tourist account is created.

---

### UC-005 - Submit Package-Based Tour Request

**Primary Actor:** Tourist  
**Goal:** Submit a travel request based on an existing package.

**Preconditions:**
- Package is active.
- Tourist has selected a package.

**Main Flow:**
1. Tourist opens package details.
2. Tourist clicks "Request This Tour".
3. Tourist enters preferred date, travelers, budget, preferred guide, and special requirements.
4. System validates request.
5. System creates tour request with package reference.
6. System marks request as Pending Review.

**Postconditions:**
- Tour request is created.

---

### UC-006 - Submit Fully Customized Tour Request

**Primary Actor:** Tourist  
**Goal:** Submit a custom travel request without selecting a package.

**Main Flow:**
1. Tourist opens "Plan My Trip".
2. Tourist enters destination preferences, dates, travelers, budget, hotel preference, and special requirements.
3. System validates request.
4. System creates custom tour request.
5. System marks request as Pending Review.

**Postconditions:**
- Custom tour request is created.

---

### UC-010 - Create Tour Quotation

**Primary Actor:** Admin  
**Goal:** Create a customized quotation for a tour request.

**Preconditions:**
- Tour request exists.
- Admin has reviewed the request.

**Main Flow:**
1. Admin opens tour request.
2. Admin updates itinerary and package details.
3. Admin assigns tour guide.
4. Admin enters quotation price.
5. System saves quotation as Draft.

**Postconditions:**
- Draft quotation is created.

---

### UC-013 - Accept Tour Quotation

**Primary Actor:** Tourist  
**Goal:** Accept a quotation and proceed to payment.

**Preconditions:**
- Quotation status is Sent.

**Main Flow:**
1. Tourist opens quotation.
2. Tourist reviews quotation details.
3. Tourist clicks Accept.
4. System updates quotation status to Accepted.
5. System enables payment.

**Postconditions:**
- Quotation is accepted.
- Payment can be initiated.

---

### UC-016 - Make Payment

**Primary Actor:** Tourist  
**Goal:** Pay for an accepted quotation.

**Preconditions:**
- Quotation is accepted.

**Main Flow:**
1. Tourist clicks Pay Now.
2. System creates payment record.
3. Tourist completes payment through payment provider.
4. Payment provider confirms payment.
5. System updates payment status to Paid.
6. System creates confirmed booking.

**Postconditions:**
- Payment is completed.
- Booking is confirmed.