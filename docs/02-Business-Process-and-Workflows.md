# Travora - Business Process & Workflows

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Prepared By:** Project Team  
**Document Type:** Business Process Documentation

---

# 1. Introduction

This document describes the end-to-end business workflows supported by the Travora platform.

Unlike traditional online travel booking systems, Travora follows a quotation-driven travel planning process where every customer journey begins with a travel request rather than an immediate booking. The platform enables collaboration between tourists and travel consultants to create personalized travel experiences before payment and booking confirmation.

The workflows defined in this document will serve as the foundation for database design, API development, frontend implementation, and future business enhancements.

---

# 2. High-Level Business Workflow

```
                    Tourist
                       │
                       ▼
      Browse Packages / Plan My Trip
                       │
                       ▼
             Submit Travel Request
                       │
                       ▼
             Admin Reviews Request
                       │
                       ▼
        Contact Tourist (Call / WhatsApp / Email)
                       │
                       ▼
           Customize Travel Plan
                       │
                       ▼
            Assign Tour Guide
                       │
                       ▼
            Prepare Quotation
                       │
                       ▼
             Send Quotation
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
         Accept    Request Changes Reject
             │         │
             │         ▼
             │   Update Quotation
             │         │
             └─────────┘
                       │
                       ▼
                  Make Payment
                       │
                       ▼
              Booking Confirmation
                       │
                       ▼
                  Tour Execution
                       │
                       ▼
               Customer Review
```

---

# 3. Customer Journey Types

Travora supports two customer journey types.

## 3.1 Package-Based Travel Request

The tourist begins by browsing existing travel packages published by the travel agency.

Travel packages serve as inspiration rather than fixed tours.

The tourist selects a package and submits a customized request.

Example:

- Package: Amazing Sri Lanka
- Preferred Date: 15 December
- Adults: 4
- Children: 2
- Budget: $2,000
- Preferred Guide: Nimal
- Special Requirement: Vegetarian meals

Business Flow

1. Browse Packages
2. View Package Details
3. Click "Request This Tour"
4. Submit Request
5. Admin Review
6. Discussion
7. Customized Quotation
8. Tourist Decision
9. Payment
10. Booking

---

## 3.2 Fully Customized Travel Request

The tourist does not select an existing package.

Instead, they request a completely personalized travel plan.

Example Information

- Destination Preferences
- Arrival Date
- Departure Date
- Number of Travelers
- Budget
- Hotel Category
- Vehicle Preference
- Preferred Language
- Special Requirements

Business Flow

1. Click "Plan My Trip"
2. Complete Request Form
3. Submit Request
4. Admin Review
5. Discussion
6. Customized Quotation
7. Tourist Decision
8. Payment
9. Booking

---

# 4. Tour Request Workflow

## Description

A Tour Request is the starting point of every customer journey.

The request may be based on:

- Existing Package
- Fully Customized Trip

### Workflow

```
Tourist
    │
    ▼
Create Tour Request
    │
    ▼
Pending Review
    │
    ▼
Admin Reviews Request
    │
    ▼
Under Discussion
    │
    ▼
Ready for Quotation
```

---

# 5. Tour Quotation Workflow

After reviewing the request, the admin prepares a customized quotation.

The quotation may include:

- Customized Itinerary
- Selected Tour Guide
- Hotels
- Transportation
- Activities
- Total Price

### Workflow

```
Tour Request
      │
      ▼
Prepare Quotation
      │
      ▼
Send to Tourist
      │
      ▼
Tourist Decision
```

Possible decisions

- Accept
- Request Changes
- Reject

If changes are requested:

```
Quotation
      │
      ▼
Customer Feedback
      │
      ▼
Admin Updates Quotation
      │
      ▼
Resend Quotation
```

---

# 6. Tour Guide Assignment Workflow

Tour guides are assigned during quotation preparation.

Workflow

```
Tour Request
      │
      ▼
Available Guides
      │
      ▼
Admin Selects Guide
      │
      ▼
Guide Assigned
```

Future versions may support:

- Availability checking
- Language matching
- Experience matching
- Automatic recommendations

---

# 7. Payment Workflow

Payment is only available after quotation acceptance.

Workflow

```
Quotation Accepted
       │
       ▼
Generate Payment
       │
       ▼
Customer Payment
       │
       ▼
Payment Successful
       │
       ▼
Booking Created
```

If payment fails

```
Payment Failed
      │
      ▼
Retry Payment
```

---

# 8. Booking Workflow

A booking represents a confirmed travel plan.

Workflow

```
Payment Successful
        │
        ▼
Create Booking
        │
        ▼
Assign Guide
        │
        ▼
Prepare Tour
        │
        ▼
Tour Completed
```

---

# 9. Review Workflow

After tour completion

```
Completed Tour
       │
       ▼
Customer Review
       │
       ▼
Guide Rating
       │
       ▼
Package Rating
```

---

# 10. Admin Workflow

The Admin performs the following activities:

- Manage Packages
- Manage Tour Guides
- Review Tour Requests
- Contact Tourists
- Customize Travel Plans
- Create Quotations
- Assign Guides
- Manage Payments
- Confirm Bookings
- View Reports

---

# 11. Tour Guide Workflow

The Tour Guide can:

- View Assigned Tours
- View Traveler Details
- Manage Profile
- Update Availability (Future)
- Receive Ratings
- Complete Tours

---

# 12. State Transition Tables

## Tour Request

| Current State | Action | Next State |
|---------------|--------|------------|
| Draft | Submit | Pending Review |
| Pending Review | Review | Under Discussion |
| Under Discussion | Create Quotation | Quotation Sent |
| Quotation Sent | Customer Accepts | Accepted |
| Quotation Sent | Customer Requests Changes | Under Discussion |
| Quotation Sent | Customer Rejects | Rejected |
| Accepted | Payment Success | Booked |

---

## Quotation

| Current State | Action | Next State |
|---------------|--------|------------|
| Draft | Send | Sent |
| Sent | Accept | Accepted |
| Sent | Reject | Rejected |
| Sent | Request Changes | Draft |

---

## Booking

| Current State | Action | Next State |
|---------------|--------|------------|
| Confirmed | Tour Starts | In Progress |
| In Progress | Tour Completed | Completed |
| Confirmed | Cancel | Cancelled |

---

## Payment

| Current State | Action | Next State |
|---------------|--------|------------|
| Pending | Success | Paid |
| Pending | Failure | Failed |
| Failed | Retry | Pending |

---

# 13. Future Workflow Enhancements

Future versions of Travora may include:

- AI itinerary recommendations
- Automatic guide assignment
- Tour guide availability calendar
- WhatsApp API integration
- Email notifications
- Quotation revision history
- Online booking modifications
- Customer loyalty program
- Multi-agency (SaaS) support

---

# 14. Workflow Summary

Travora follows a quotation-driven business model where every journey starts with a travel request.

The complete customer lifecycle is:

```
Travel Package (Optional)
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
   Tour Completion
          │
          ▼
      Review
```

This workflow ensures flexibility for customized travel planning while maintaining complete visibility over customer requests, quotations, payments, bookings, and tour operations.