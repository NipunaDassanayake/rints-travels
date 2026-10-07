export type TourGuideUserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "DELETED";

export interface TourGuideUser {
  id: string;

  firstName: string;

  lastName: string;

  /**
   * Public endpoints may not return these fields.
   * Admin endpoints do.
   */
  email?: string;

  phone?: string | null;

  status?: TourGuideUserStatus;
}

export interface TourGuide {
  id: string;

  userId: string;

  bio: string | null;

  experienceYears: number;

  languages: string[];

  specializations: string[];

  location: string | null;

  /**
   * Prisma Decimal is serialized as a string.
   */
  dailyRate: string | null;

  averageRating: string;

  totalReviews: number;

  isAvailable: boolean;

  createdAt: string;

  updatedAt: string;

  deletedAt: string | null;

  user: TourGuideUser;
}