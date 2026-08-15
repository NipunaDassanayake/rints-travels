export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "SUPERSEDED";

export interface QuotationItinerary {
  id?: string;
  dayNumber: number;
  title: string;
  description: string;
}

export interface QuotationItem {
  id?: string;
  title: string;
}

export interface Quotation {
  id: string;

  tourRequestId: string;

  guideId?: string | null;

  quotationNumber: string;
  revisionNumber: number;

  title: string;
  description?: string | null;

  startDate: string;
  endDate: string;

  adultCount: number;
  childCount: number;

  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;

  currency: string;

  notes?: string | null;
  termsConditions?: string | null;

  validUntil?: string | null;

  status: QuotationStatus;

  sentAt?: string | null;
  respondedAt?: string | null;

  createdAt: string;
  updatedAt: string;

  itineraries: QuotationItinerary[];
  inclusions: QuotationItem[];
  exclusions: QuotationItem[];
}

export interface CreateQuotationItineraryItem {
  dayNumber: number;
  title: string;
  description: string;
}

export interface CreateQuotationPayload {
  guideId?: string | null;

  title: string;
  description?: string | null;

  startDate: string;
  endDate: string;

  adultCount: number;
  childCount: number;

  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;

  currency: string;

  notes?: string | null;
  termsConditions?: string | null;

  validUntil?: string | null;

  itineraries?: CreateQuotationItineraryItem[];

  inclusions?: string[];

  exclusions?: string[];
}
