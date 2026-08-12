export interface TourGuideUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TourGuide {
  id: string;
  userId: string;

  bio: string | null;
  experienceYears: number;

  languages: string[];
  specializations: string[];

  location: string | null;

  /*
   * Prisma Decimal is returned through JSON
   * as a string in your API.
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