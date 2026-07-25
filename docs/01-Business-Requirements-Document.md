# Travora - Business Requirements Document

## 1. Executive Summary

Travora is a travel agency management platform designed to help tourists explore travel packages, submit customized tour requests, communicate with the agency, receive tailored quotations, accept offers, and proceed with payment.

Unlike a fixed-schedule booking system, Travora follows a quotation-driven travel planning model. Travel packages act as templates or inspiration, while the final tour is customized by the agency based on the tourist’s requirements.

## 2. Business Objectives

- Provide tourists with an easy way to explore available travel packages.
- Allow tourists to request customized travel plans.
- Enable admin users to review, edit, and manage tour requests.
- Allow admins to assign suitable tour guides.
- Enable admins to create and send customized quotations.
- Allow tourists to accept quotations and proceed with payment.
- Maintain a structured workflow from inquiry to confirmed booking.

## 3. Key Stakeholders

- Tourists
- Travel Agency Admin
- Tour Guides
- System Administrator
- Payment Service Provider

## 4. User Roles

### Tourist
Can browse packages, submit tour requests, view quotations, accept or reject quotations, make payments, and leave reviews.

### Admin
Can manage packages, tour guides, tourist requests, quotations, payments, and bookings.

### Tour Guide
Can manage profile, view assigned tours, and receive reviews.

## 5. Proposed Business Workflow

1. Tourist browses travel packages.
2. Tourist selects a package or submits a fully customized request.
3. Tourist enters travel preferences.
4. Admin reviews the request.
5. Admin contacts tourist through call or WhatsApp.
6. Admin customizes the travel plan.
7. Admin assigns a suitable tour guide.
8. Admin sends quotation to tourist.
9. Tourist accepts or rejects quotation.
10. If accepted, tourist proceeds with payment.
11. After payment, booking is confirmed.

## 6. Core System Modules

- Authentication and User Management
- Travel Package Management
- Tour Guide Management
- Tour Request Management
- Tour Quotation Management
- Payment Management
- Booking Management
- Review and Rating Management
- Admin Dashboard

## 7. Functional Requirements

### Travel Package Management
- Admin can create travel packages.
- Admin can update package details.
- Admin can deactivate or delete packages.
- Tourist can view active packages.
- Tourist can search and filter packages.

### Tour Request Management
- Tourist can submit a package-based request.
- Tourist can submit a fully customized request.
- Tourist can select preferred travel dates.
- Tourist can mention budget, number of travelers, and special requirements.
- Tourist can select a preferred tour guide optionally.
- Admin can view and update request status.

### Tour Quotation Management
- Admin can create a customized quotation.
- Admin can edit quotation details.
- Admin can assign a tour guide.
- Admin can send quotation to tourist.
- Tourist can accept or reject quotation.

### Payment Management
- Tourist can proceed to payment after accepting quotation.
- System should record payment status.
- Admin can view payment records.

### Booking Management
- Booking is created after successful payment.
- Admin can track confirmed bookings.
- Tour guide can view assigned bookings.

## 8. Non-Functional Requirements

- System should be secure.
- APIs should use authentication and role-based authorization.
- System should support future microservice migration.
- System should maintain audit-friendly records.
- System should be scalable for future modules.
- System should provide consistent API responses.
- System should support logging and traceability using correlation IDs.

## 9. Business Rules

- A travel package is only a template, not a confirmed tour.
- A tourist must submit a tour request before receiving a quotation.
- Payment is only allowed after quotation acceptance.
- A booking is only confirmed after successful payment.
- Admin can modify requests after discussion with the tourist.
- A quotation must be linked to a tour request.
- A quotation may have one selected tour guide.
- Deleted records should preferably be soft deleted.

## 10. Assumptions

- Tourists may contact the agency through WhatsApp or phone before confirmation.
- Admin users manually review and customize requests.
- Payment integration will be added after quotation acceptance flow is completed.
- Google login may be added after basic authentication is completed.

## 11. Future Enhancements

- AI travel plan suggestions
- WhatsApp API integration
- Email notifications
- PDF quotation generation
- Online payment gateway
- Tour guide mobile dashboard
- Customer loyalty program
- Admin analytics dashboard