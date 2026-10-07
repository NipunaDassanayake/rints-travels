export type BookingStatus =
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";


export type BookingPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";


export type BookingPaymentMethod =
  | "CARD"
  | "BANK_TRANSFER"
  | "CASH"
  | "OTHER";


export interface BookingTourist {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}


export interface BookingGuideUser {
  id: string;
  firstName: string;
  lastName: string;
}


export interface BookingGuide {
  id: string;
  userId: string;

  bio: string | null;
  experienceYears: number;

  languages: string[];
  specializations: string[];

  location: string | null;

  dailyRate: string | null;
  averageRating: string;
  totalReviews: number;

  isAvailable: boolean;

  user: BookingGuideUser;
}


export interface BookingTourRequest {
  id: string;
  touristId: string;

  packageId: number | null;

  preferredGuideId: string | null;
  assignedAdminId: string | null;

  requestType:
    | "PACKAGE_BASED"
    | "CUSTOM";

  title: string | null;

  preferredStartDate: string;
  preferredEndDate: string | null;

  adultCount: number;
  childCount: number;

  destinationPreferences: string | null;

  budget: string | null;
  currency: string;

  hotelPreference: string | null;
  transportPreference: string | null;
  specialRequirements: string | null;

  contactMethod:
    | "WHATSAPP"
    | "PHONE"
    | "EMAIL"
    | null;

  status:
    | "PENDING_REVIEW"
    | "UNDER_DISCUSSION"
    | "READY_FOR_QUOTATION"
    | "QUOTATION_SENT"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELLED"
    | "BOOKED";

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}


export interface BookingQuotationItinerary {
  id: number;
  quotationId: string;

  dayNumber: number;
  title: string;
  description: string;
}


export interface BookingQuotationInclusion {
  id: number;
  quotationId: string;

  title: string;
}


export interface BookingQuotationExclusion {
  id: number;
  quotationId: string;

  title: string;
}


export interface BookingQuotation {
  id: string;

  tourRequestId: string;
  guideId: string | null;

  quotationNumber: string;
  revisionNumber: number;

  title: string;
  description: string | null;

  startDate: string;
  endDate: string;

  adultCount: number;
  childCount: number;

  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;

  currency: string;

  notes: string | null;
  termsConditions: string | null;

  validUntil: string | null;

  status:
    | "DRAFT"
    | "SENT"
    | "ACCEPTED"
    | "REJECTED"
    | "EXPIRED"
    | "SUPERSEDED";

  sentAt: string | null;
  respondedAt: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  guide: BookingGuide | null;

  itineraries: BookingQuotationItinerary[];

  inclusions: BookingQuotationInclusion[];

  exclusions: BookingQuotationExclusion[];
}


export interface BookingPayment {
  id: string;

  quotationId: string;
  touristId: string;

  paymentReference: string;
  gatewayReference: string | null;

  amount: string;
  currency: string;

  paymentMethod:
    | BookingPaymentMethod
    | null;

  status: BookingPaymentStatus;

  failureReason: string | null;
  paidAt: string | null;

  createdAt: string;
  updatedAt: string;
}


export interface Booking {
  id: string;

  tourRequestId: string;
  quotationId: string;
  paymentId: string;
  touristId: string;

  bookingReference: string;

  status: BookingStatus;

  startDate: string;
  endDate: string;

  totalAmount: string;
  currency: string;

  confirmedAt: string;

  completedAt: string | null;
  cancelledAt: string | null;

  createdAt: string;
  updatedAt: string;

  tourRequest: BookingTourRequest;

  quotation: BookingQuotation;

  payment: BookingPayment;

  tourist: BookingTourist;
}