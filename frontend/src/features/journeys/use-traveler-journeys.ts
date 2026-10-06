import { useQuery } from "@tanstack/react-query";

import { getMyBookings } from "@/features/bookings/booking.api";

import { getMyPayments } from "@/features/payments/payment.api";

import { getMyQuotations } from "@/features/quotations/quotation.api";

import { getMyReviews } from "@/features/reviews/review.api";

import { getMyTourRequests } from "@/features/tour-requests/tour-request.api";

import { buildJourneys, type Journey } from "./journey";

/**
 * =========================================================
 * The traveler's journeys (CR-030 Stage 2)
 * =========================================================
 *
 * Loads the traveler's own lists with the same query keys the
 * rest of the portal uses (so TanStack Query shares the cache
 * between the dashboard, My journeys and the entity lists) and
 * joins them with buildJourneys.
 *
 * Requests, quotations, payments and bookings are core: without
 * any of them a journey's stage or next action could be wrong
 * (e.g. "Pay now" for an already paid quotation), so a failure
 * there is an error. Reviews only decide whether to ask for a
 * review; if they fail, journeys still render and simply never
 * ask (the review state is unknown).
 */
export function useTravelerJourneys(): {
  journeys: Journey[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} {
  const requests = useQuery({
    queryKey: ["tour-requests", "me"],
    queryFn: getMyTourRequests,
  });

  const quotations = useQuery({
    queryKey: ["quotations", "me"],
    queryFn: getMyQuotations,
  });

  const payments = useQuery({
    queryKey: ["payments", "me"],
    queryFn: getMyPayments,
  });

  const bookings = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: getMyBookings,
  });

  const reviews = useQuery({
    queryKey: ["reviews", "me"],
    queryFn: getMyReviews,
  });

  const core = [requests, quotations, payments, bookings];

  const failed = core.filter((query) => query.isError);

  const isLoading = core.some((query) => query.isLoading) || reviews.isLoading;

  const journeys =
    isLoading || failed.length > 0
      ? []
      : buildJourneys({
          requests: requests.data ?? [],
          quotations: quotations.data ?? [],
          payments: payments.data ?? [],
          bookings: bookings.data ?? [],
          reviews: reviews.isError ? null : (reviews.data ?? []),
        });

  return {
    journeys,
    isLoading,
    isError: failed.length > 0,
    retry: () => {
      failed.forEach((query) => void query.refetch());
    },
  };
}
