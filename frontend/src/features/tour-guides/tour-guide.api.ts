import type { TourGuide } from "./tour-guide.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * =========================================================
 * Public - Tour Guide List
 * =========================================================
 *
 * GET /api/tour-guides
 *
 * Returns publicly available guides.
 */

export async function getTourGuides(): Promise<TourGuide[]> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}/tour-guides`, {
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load tour guides");
  }

  const result = await response.json();

  return result.data as TourGuide[];
}

/**
 * =========================================================
 * Public - Tour Guide Details
 * =========================================================
 *
 * GET /api/tour-guides/:id
 */

export async function getTourGuideById(id: string): Promise<TourGuide | null> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const response = await fetch(
    `${API_BASE_URL}/tour-guides/${encodeURIComponent(id)}`,
    {
      next: {
        revalidate: 60,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load tour guide");
  }

  const result = await response.json();

  return result.data as TourGuide;
}