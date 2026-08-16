export type PaymentMethod = "CARD" | "BANK_TRANSFER" | "CASH" | "OTHER";

export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface InitiatePaymentPayload {
  quotationId: string;
  paymentMethod: PaymentMethod;
}

export interface PaymentTourRequest {
  id: string;
  touristId: string;
  status: string;
}

export interface PaymentGuideUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PaymentGuide {
  id: string;
  user: PaymentGuideUser;
}

export interface PaymentQuotation {
  id: string;

  tourRequestId: string;

  quotationNumber: string;
  title: string;

  totalAmount: string;
  currency: string;

  status: string;

  tourRequest: PaymentTourRequest;

  guide?: PaymentGuide | null;
}

export interface PaymentTourist {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Payment {
  id: string;

  quotationId: string;
  touristId: string;

  paymentReference: string;

  amount: string;
  currency: string;

  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  gatewayReference?: string | null;
  failureReason?: string | null;

  paidAt?: string | null;

  createdAt: string;
  updatedAt: string;

  quotation: PaymentQuotation;
  tourist: PaymentTourist;
}