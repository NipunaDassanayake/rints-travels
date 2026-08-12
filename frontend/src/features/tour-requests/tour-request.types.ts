export type ContactMethod =
  | "WHATSAPP"
  | "PHONE"
  | "EMAIL";

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