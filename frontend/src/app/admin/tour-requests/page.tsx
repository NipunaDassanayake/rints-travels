"use client";

import {
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  LoaderCircle,
} from "lucide-react";

import {
  getAdminTourRequests,
} from "@/features/tour-requests/admin-tour-request.api";

import {
  AdminTourRequestCard,
} from "@/features/tour-requests/components/admin-tour-request-card";

import type {
  TourRequestStatus,
  TourRequestType,
} from "@/features/tour-requests/tour-request.types";

type StatusFilter =
  | TourRequestStatus
  | "";

type RequestTypeFilter =
  | TourRequestType
  | "";

export default function AdminTourRequestsPage() {
  const [
    status,
    setStatus,
  ] =
    useState<StatusFilter>(
      ""
    );

  const [
    requestType,
    setRequestType,
  ] =
    useState<RequestTypeFilter>(
      ""
    );

  const {
    data: requests,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "admin",
      "tour-requests",
      status,
      requestType,
    ],

    queryFn: () =>
      getAdminTourRequests({
        status,
        requestType,
      }),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Admin
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Tour requests
        </h1>

        <p className="mt-2 text-muted-foreground">
          Review tourist requests,
          manage discussions, update
          request details, and prepare
          quotations.
        </p>
      </div>

      <div className="mt-8 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="status"
            className="text-sm font-medium"
          >
            Status
          </label>

          <select
            id="status"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as StatusFilter
              )
            }
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              All statuses
            </option>

            <option value="PENDING_REVIEW">
              Pending Review
            </option>

            <option value="UNDER_DISCUSSION">
              Under Discussion
            </option>

            <option value="READY_FOR_QUOTATION">
              Ready For Quotation
            </option>

            <option value="QUOTATION_SENT">
              Quotation Sent
            </option>

            <option value="ACCEPTED">
              Accepted
            </option>

            <option value="REJECTED">
              Rejected
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>

            <option value="BOOKED">
              Booked
            </option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="requestType"
            className="text-sm font-medium"
          >
            Request type
          </label>

          <select
            id="requestType"
            value={requestType}
            onChange={(event) =>
              setRequestType(
                event.target
                  .value as RequestTypeFilter
              )
            }
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              All request types
            </option>

            <option value="PACKAGE_BASED">
              Package Based
            </option>

            <option value="CUSTOM">
              Custom
            </option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="mt-8 rounded-xl border border-destructive/40 p-5 text-sm text-destructive">
          Unable to load tour
          requests.
        </div>
      )}

      {!isLoading &&
        !isError &&
        requests && (
          <>
            {requests.length >
            0 ? (
              <div className="mt-8 grid gap-5">
                {requests.map(
                  (request) => (
                    <AdminTourRequestCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed p-12 text-center">
                <h2 className="text-lg font-semibold">
                  No tour requests
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  No requests match
                  the selected filters.
                </p>
              </div>
            )}
          </>
        )}
    </main>
  );
}