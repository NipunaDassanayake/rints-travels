export interface ReviewTourist {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ReviewGuideUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ReviewGuide {
  id: string;
  userId?: string;

  firstName?: string;
  lastName?: string;

  averageRating?: number | string;
  totalReviews?: number;

  user?: ReviewGuideUser;
}

export interface Review {
  id: string;

  bookingId: string;
  guideId: string;
  touristId: string;

  rating: number;
  comment: string | null;

  createdAt: string;
  updatedAt: string;

  tourist?: ReviewTourist;
  guide?: ReviewGuide;
}

export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface GuideReviewSummary {
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    averageRating: number;
    totalReviews: number;
  };

  reviews: Review[];
}