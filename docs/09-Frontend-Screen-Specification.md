# Travora - Frontend Screen Specification

**Document Version:** 1.0  
**Project:** Travora - Digital Travel Operations Platform  
**Document Type:** Frontend Screen Specification  
**Frontend Technology:** React + Vite

---

# 1. Introduction

This document defines the main frontend screens required for Travora.

The screens are grouped according to the main user roles:

- Public Visitor
- Tourist
- Admin
- Tour Guide
- System Administrator

The frontend should provide a responsive, accessible, and consistent experience across desktop, tablet, and mobile devices.

---

# 2. Frontend Design Principles

The Travora frontend should follow these principles:

- Responsive design
- Clear navigation
- Simple forms
- Consistent visual components
- Accessible color contrast
- Meaningful loading and error states
- Role-based navigation
- Reusable components
- Mobile-friendly layouts
- Secure handling of authentication state

---

# 3. Main Application Areas

```text
Travora Frontend
├── Public Website
├── Tourist Portal
├── Admin Portal
├── Tour Guide Portal
└── System Administration
```

---

# 4. Public Website Screens

## 4.1 Home Page

### Purpose

Introduce Travora and allow visitors to discover packages or start a custom trip request.

### Main Sections

- Header and navigation
- Hero section
- Search bar
- Featured packages
- Popular destinations
- Featured tour guides
- How Travora works
- Customer reviews
- Call-to-action section
- Footer

### Main Actions

- Browse Packages
- Plan My Trip
- View Tour Guides
- Login
- Register

---

## 4.2 Travel Package Listing

### Route

```text
/packages
```

### Purpose

Display active travel package templates.

### Main Components

- Search field
- Destination filter
- Price range filter
- Duration filter
- Sort control
- Package cards
- Pagination
- Loading state
- Empty result state

### Package Card Information

- Primary image
- Package title
- Destination
- Duration
- Starting price
- Average rating
- Short description
- View Details button

---

## 4.3 Travel Package Details

### Route

```text
/packages/:slug
```

### Purpose

Display complete details of a package template.

### Main Components

- Image gallery
- Package title
- Destination
- Duration
- Starting price
- Description
- Day-by-day itinerary
- Inclusions
- Exclusions
- FAQs
- Reviews
- Related packages
- Request This Tour button

### Main Action

```text
Request This Tour
```

This action opens the package-based tour request form.

---

## 4.4 Tour Guide Listing

### Route

```text
/tour-guides
```

### Purpose

Allow visitors to browse available tour guides.

### Filters

- Location
- Language
- Specialization
- Rating
- Availability

### Guide Card Information

- Profile image
- Full name
- Location
- Languages
- Experience
- Average rating
- View Profile button

---

## 4.5 Tour Guide Details

### Route

```text
/tour-guides/:id
```

### Main Components

- Profile image
- Full name
- Biography
- Experience
- Languages
- Specializations
- Location
- Ratings and reviews
- Select as Preferred Guide button

---

## 4.6 Plan My Trip

### Route

```text
/plan-my-trip
```

### Purpose

Allow tourists to submit a fully customized travel request.

### Form Fields

- Request title
- Preferred destinations
- Preferred start date
- Preferred end date
- Number of adults
- Number of children
- Budget
- Currency
- Hotel preference
- Transport preference
- Preferred guide
- Contact method
- Special requirements

### Main Action

```text
Submit Travel Request
```

---

# 5. Authentication Screens

## 5.1 Registration

### Route

```text
/register
```

### Fields

- First name
- Last name
- Email
- Phone
- Password
- Confirm password
- Terms acceptance

### Actions

- Register
- Continue with Google
- Go to Login

---

## 5.2 Login

### Route

```text
/login
```

### Fields

- Email
- Password
- Remember me

### Actions

- Login
- Continue with Google
- Forgot Password
- Create Account

---

## 5.3 Forgot Password

### Route

```text
/forgot-password
```

### Fields

- Email

### Main Action

```text
Send Reset Link
```

---

## 5.4 Reset Password

### Route

```text
/reset-password
```

### Fields

- New password
- Confirm password

---

## 5.5 Email Verification

### Route

```text
/verify-email
```

### States

- Verification in progress
- Verification successful
- Invalid or expired token

---

# 6. Tourist Portal Screens

## 6.1 Tourist Dashboard

### Route

```text
/dashboard
```

### Main Components

- Welcome card
- Active tour requests
- Quotations awaiting response
- Upcoming bookings
- Recent payments
- Quick actions

### Quick Actions

- Browse Packages
- Plan My Trip
- View Requests
- View Quotations

---

## 6.2 Package-Based Tour Request Form

### Route

```text
/packages/:id/request
```

### Fields

- Selected package
- Preferred start date
- Preferred end date
- Adults
- Children
- Budget
- Currency
- Hotel preference
- Transport preference
- Preferred guide
- Contact method
- Special requirements

---

## 6.3 My Tour Requests

### Route

```text
/my-tour-requests
```

### Main Components

- Request list
- Status badges
- Request type
- Preferred dates
- Selected package
- Created date
- View Details action

### Filters

- Status
- Request type
- Date

---

## 6.4 Tour Request Details

### Route

```text
/my-tour-requests/:id
```

### Main Components

- Request information
- Package reference
- Preferred guide
- Status timeline
- Contact preference
- Special requirements
- Related quotations
- Cancel request action where permitted

---

## 6.5 My Quotations

### Route

```text
/my-quotations
```

### Main Components

- Quotation cards
- Revision number
- Total price
- Valid-until date
- Assigned guide
- Status badge
- View Quotation action

---

## 6.6 Quotation Details

### Route

```text
/quotations/:id
```

### Main Components

- Quotation title
- Revision number
- Travel dates
- Assigned guide
- Final itinerary
- Price breakdown
- Total price
- Notes
- Expiration date
- Status

### Actions

- Accept
- Reject
- Request Changes
- Proceed to Payment

---

## 6.7 Payment Page

### Route

```text
/payments/:id
```

### Main Components

- Quotation summary
- Payment amount
- Currency
- Payment method
- Billing details
- Payment status

### Actions

- Pay Now
- Retry Payment

---

## 6.8 My Bookings

### Route

```text
/my-bookings
```

### Main Components

- Booking reference
- Tour title
- Travel dates
- Assigned guide
- Booking status
- Total amount
- View Details action

---

## 6.9 Booking Details

### Route

```text
/my-bookings/:id
```

### Main Components

- Booking reference
- Tourist details
- Assigned guide
- Travel dates
- Final itinerary
- Payment summary
- Booking status timeline
- Review action after completion

---

## 6.10 Submit Review

### Route

```text
/my-bookings/:id/review
```

### Fields

- Package rating
- Guide rating
- Comment

### Main Action

```text
Submit Review
```

---

## 6.11 Tourist Profile

### Route

```text
/profile
```

### Main Components

- Profile image
- First name
- Last name
- Email
- Phone
- Password change
- Session management

---

# 7. Admin Portal Screens

## 7.1 Admin Dashboard

### Route

```text
/admin
```

### Dashboard Cards

- Pending tour requests
- Requests under discussion
- Quotations awaiting response
- Confirmed bookings
- Upcoming tours
- Completed tours
- Paid revenue

### Additional Components

- Recent requests
- Upcoming bookings
- Payment summary
- Guide assignment overview

---

## 7.2 Package Management

### Route

```text
/admin/packages
```

### Main Components

- Package table
- Search
- Filters
- Status
- Pagination
- Create Package button

### Actions

- View
- Edit
- Activate
- Deactivate
- Soft Delete

---

## 7.3 Create Package

### Route

```text
/admin/packages/create
```

### Sections

- Basic information
- Pricing
- Images
- Itinerary
- Inclusions
- Exclusions
- FAQs
- Status

---

## 7.4 Edit Package

### Route

```text
/admin/packages/:id/edit
```

Uses the same sections as Create Package.

---

## 7.5 Tour Request Management

### Route

```text
/admin/tour-requests
```

### Main Components

- Request table
- Tourist name
- Request type
- Package
- Preferred dates
- Assigned admin
- Status
- Created date

### Filters

- Status
- Request type
- Assigned admin
- Date range

---

## 7.6 Admin Tour Request Details

### Route

```text
/admin/tour-requests/:id
```

### Main Components

- Tourist details
- Original request
- Package details
- Preferred guide
- Budget
- Contact method
- Status timeline
- Related quotations
- Internal notes

### Actions

- Assign Admin
- Update Status
- Edit Request
- Contact Tourist
- Create Quotation

---

## 7.7 Quotation Management

### Route

```text
/admin/quotations
```

### Main Components

- Quotation table
- Tourist
- Tour request
- Revision
- Assigned guide
- Total price
- Status
- Valid-until date

---

## 7.8 Create Quotation

### Route

```text
/admin/tour-requests/:id/quotations/create
```

### Sections

- Quotation basic details
- Final travel dates
- Travelers
- Assigned guide
- Itinerary
- Accommodation
- Meals
- Price breakdown
- Notes
- Valid-until date

### Actions

- Save Draft
- Send to Tourist

---

## 7.9 Edit Quotation

### Route

```text
/admin/quotations/:id/edit
```

Only draft quotations can be directly edited.

Sent quotations require a new revision.

---

## 7.10 Booking Management

### Route

```text
/admin/bookings
```

### Main Components

- Booking reference
- Tourist
- Guide
- Travel dates
- Amount
- Payment status
- Booking status

### Actions

- View
- Start Tour
- Complete Tour
- Cancel Booking

---

## 7.11 Payment Management

### Route

```text
/admin/payments
```

### Main Components

- Payment reference
- Tourist
- Quotation
- Amount
- Provider
- Status
- Paid date

---

## 7.12 Tour Guide Management

### Route

```text
/admin/tour-guides
```

### Main Components

- Guide table
- Location
- Languages
- Experience
- Rating
- Availability
- Status

### Actions

- Create Guide
- View
- Edit
- Activate
- Deactivate

---

## 7.13 Review Management

### Route

```text
/admin/reviews
```

### Main Components

- Tourist
- Booking
- Package rating
- Guide rating
- Comment
- Status

### Actions

- Publish
- Hide
- Delete

---

## 7.14 User Management

### Route

```text
/admin/users
```

### Access

```text
SYSTEM_ADMIN
```

### Main Components

- User name
- Email
- Role
- Provider
- Status
- Registration date

### Actions

- View
- Change Role
- Suspend
- Activate

---

# 8. Tour Guide Portal Screens

## 8.1 Guide Dashboard

### Route

```text
/guide
```

### Main Components

- Upcoming tours
- Active tours
- Completed tours
- Average rating
- Recent reviews

---

## 8.2 Assigned Tours

### Route

```text
/guide/assigned-tours
```

### Main Components

- Booking reference
- Tourist
- Travel dates
- Destination
- Status
- View Details

---

## 8.3 Assigned Tour Details

### Route

```text
/guide/assigned-tours/:id
```

### Main Components

- Traveler information
- Travel dates
- Final itinerary
- Accommodation
- Contact details
- Special requirements
- Booking status

### Actions

- Start Tour
- Complete Tour

---

## 8.4 Guide Profile

### Route

```text
/guide/profile
```

### Fields

- Profile image
- Biography
- Languages
- Specializations
- Experience
- Location
- Daily rate
- General availability

---

## 8.5 Guide Reviews

### Route

```text
/guide/reviews
```

Displays ratings and customer feedback.

---

# 9. Shared UI Components

Recommended reusable components:

- Header
- Footer
- Sidebar
- Breadcrumbs
- Page title
- Data table
- Pagination
- Search bar
- Filter panel
- Status badge
- Package card
- Guide card
- Review card
- Confirmation modal
- Loading spinner
- Skeleton loader
- Empty state
- Error alert
- Toast notification
- Form input
- Date picker
- Currency input
- Rating input
- File uploader

---

# 10. Route Protection

Routes should be protected according to authentication and user role.

Examples:

```text
/admin/*  → ADMIN or SYSTEM_ADMIN

/guide/*  → TOUR_GUIDE

/dashboard/* → TOURIST

/profile → Authenticated User
```

Unauthorized users should be redirected to:

```text
/login
```

Authenticated users without permission should see:

```text
403 - Access Denied
```

---

# 11. Application States

Every screen that loads remote data should support:

- Initial loading
- Successful response
- Empty result
- Validation error
- API error
- Unauthorized state
- Forbidden state
- Offline or network failure
- Retry action

---

# 12. Form Behaviour

All forms should provide:

- Client-side validation
- Server-side validation feedback
- Disabled submit button while processing
- Clear required-field indicators
- Confirmation for destructive actions
- Unsaved-change warning where appropriate
- Success notification after completion

---

# 13. Responsive Design

The application should support:

- Desktop
- Tablet
- Mobile

Desktop layouts may use tables and sidebars.

Mobile layouts should use:

- Cards
- Drawers
- Collapsible filters
- Stacked forms
- Mobile-friendly navigation

---

# 14. Accessibility Requirements

The frontend should include:

- Semantic HTML
- Keyboard navigation
- Visible focus indicators
- Form labels
- Alternative image text
- Sufficient color contrast
- Accessible error messages
- Screen-reader-friendly controls

---

# 15. Navigation Structure

## Public Navigation

```text
Home
Packages
Tour Guides
Plan My Trip
About
Contact
Login
Register
```

## Tourist Navigation

```text
Dashboard
Tour Requests
Quotations
Bookings
Payments
Profile
Logout
```

## Admin Navigation

```text
Dashboard
Packages
Tour Requests
Quotations
Bookings
Payments
Tour Guides
Reviews
Users
Settings
```

## Tour Guide Navigation

```text
Dashboard
Assigned Tours
Reviews
Profile
Logout
```

---

# 16. Screen Implementation Priority

## Phase 1

- Home
- Package listing
- Package details
- Login
- Registration
- Basic tourist dashboard

## Phase 2

- Package-based request
- Plan My Trip
- Tour request list
- Tour request details
- Admin request management

## Phase 3

- Quotation screens
- Guide assignment
- Tourist quotation decision

## Phase 4

- Payment page
- Booking screens
- Guide portal

## Phase 5

- Reviews
- Admin analytics
- Notifications
- User management

---

# 17. Frontend Summary

The Travora frontend supports the complete travel-planning lifecycle:

```text
Discover
    │
    ▼
Submit Request
    │
    ▼
Review Quotation
    │
    ▼
Accept and Pay
    │
    ▼
Manage Booking
    │
    ▼
Complete Tour
    │
    ▼
Submit Review
```

The frontend architecture should remain feature-based, responsive, accessible, and aligned with the backend API and role-based permissions.