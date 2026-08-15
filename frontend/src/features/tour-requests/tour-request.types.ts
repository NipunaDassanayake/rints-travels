export type ContactMethod = "WHATSAPP" | "PHONE" | "EMAIL";

export type TourRequestType = "PACKAGE_BASED" | "CUSTOM";

export type TourRequestStatus =
  | "PENDING_REVIEW"
  | "UNDER_DISCUSSION"
  | "READY_FOR_QUOTATION"
  | "QUOTATION_SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "BOOKED";

export interface PackageBasedTourRequestPayload {
  packageId: number;

  preferredStartDate: string;
  preferredEndDate?: string | null;

  adultCount: number;
  childCount: number;

  budget?: number | null;
  currency: string;

  preferredGuideId?: string | null;

  hotelPreference?: string | null;
  transportPreference?: string | null;
  specialRequirements?: string | null;

  contactMethod?: ContactMethod | null;
}

export interface CustomTourRequestPayload {
  title: string;

  preferredStartDate: string;
  preferredEndDate?: string | null;

  adultCount: number;
  childCount: number;

  destinationPreferences: string;

  budget?: number | null;
  currency: string;

  preferredGuideId?: string | null;

  hotelPreference?: string | null;
  transportPreference?: string | null;
  specialRequirements?: string | null;

  contactMethod?: ContactMethod | null;
}

export interface TourRequestTravelPackage {
  id: number;

  title: string;
  slug: string;

  destination: string;
  description: string;

  durationDays: number;
  price: string;

  status: string;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TourRequestTourist {
  id: string;

  firstName: string;
  lastName: string;

  email: string;
  phone: string | null;
}

export interface TourRequestPreferredGuideUser {
  id: string;

  firstName: string;
  lastName: string;
}

export interface TourRequestPreferredGuide {
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

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  user: TourRequestPreferredGuideUser;
}

export interface TourRequest {
  id: string;

  touristId: string;
  packageId: number | null;

  preferredGuideId: string | null;
  assignedAdminId: string | null;

  requestType: TourRequestType;

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

  contactMethod: ContactMethod | null;

  status: TourRequestStatus;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  travelPackage: TourRequestTravelPackage | null;

  tourist?: TourRequestTourist | null;

  preferredGuide?: TourRequestPreferredGuide | null;
}