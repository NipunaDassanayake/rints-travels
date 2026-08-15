import { apiClient } from "@/lib/api/client";

import type {
  TourRequest,
  TourRequestStatus,
  TourRequestType,
} from "./tour-request.types";

export interface AdminTouristSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface AdminPreferredGuideSummary {
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

  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface AdminTourRequest extends TourRequest {
  tourist: AdminTouristSummary;

  preferredGuide:
    | AdminPreferredGuideSummary
    | null;
}

export interface AdminTourRequestFilters {
  status?: TourRequestStatus | "";
  requestType?: TourRequestType | "";
}

export async function getAdminTourRequests(
  filters: AdminTourRequestFilters = {}
): Promise<AdminTourRequest[]> {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set(
      "status",
      filters.status
    );
  }

  if (filters.requestType) {
    params.set(
      "requestType",
      filters.requestType
    );
  }

  const queryString =
    params.toString();

  const response =
    await apiClient.get(
      queryString
        ? `/tour-requests?${queryString}`
        : "/tour-requests"
    );

  return response.data.data;
}