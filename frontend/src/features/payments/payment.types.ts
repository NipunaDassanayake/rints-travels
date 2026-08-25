/**
 * =========================================================
 * Payment Status
 * =========================================================
 */

export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

/**
 * =========================================================
 * Payment Method
 * =========================================================
 *
 * CARD is the current Travora checkout method.
 *
 * The other values remain in the type because historical
 * payment records may still contain them.
 */

export type PaymentMethod = "CARD" | "BANK_TRANSFER" | "CASH" | "OTHER";

/**
 * =========================================================
 * Stripe Checkout
 * =========================================================
 */

export interface CreateCheckoutSessionPayload {
  quotationId: string;
}

/**
 * =========================================================
 * Tour Request
 * =========================================================
 */

export interface PaymentTourRequest {
  id: string;

  touristId: string;

  status: string;
}

/**
 * =========================================================
 * Guide
 * =========================================================
 */

export interface PaymentGuideUser {
  id: string;

  firstName: string;

  lastName: string;
}

export interface PaymentGuide {
  id: string;

  user: PaymentGuideUser;
}

/**
 * =========================================================
 * Quotation
 * =========================================================
 */

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

/**
 * =========================================================
 * Tourist
 * =========================================================
 */

export interface PaymentTourist {
  id: string;

  firstName: string;

  lastName: string;

  email: string;
}

/**
 * =========================================================
 * Payment
 * =========================================================
 */

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

/**
 * =========================================================
 * Stripe Checkout Response
 * =========================================================
 */

export interface CheckoutSessionResponse {
  payment: Payment;

  checkoutSessionId: string;

  checkoutUrl: string;
}
