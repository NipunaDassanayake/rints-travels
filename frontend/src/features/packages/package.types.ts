export interface PackageImage {
  id: number;
  imageUrl: string;
  altText?: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface PackageItinerary {
  id: number;
  dayNumber: number;
  title: string;
  description: string;
}

export interface PackageInclusion {
  id: number;
  title: string;
}

export interface PackageExclusion {
  id: number;
  title: string;
}

export interface PackageFaq {
  id: number;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface TravelPackage {
  id: number;
  title: string;
  slug: string;
  destination: string;
  description: string;
  durationDays: number;

  /*
   * Prisma Decimal values are serialized
   * as strings by your API.
   */
  price: string;

  status: string;

  images: PackageImage[];
  itineraries: PackageItinerary[];
  inclusions: PackageInclusion[];
  exclusions: PackageExclusion[];
  faqs: PackageFaq[];

  createdAt: string;
  updatedAt: string;
}

export interface PackagePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PackageListData {
  items: TravelPackage[];
  pagination: PackagePagination;
}