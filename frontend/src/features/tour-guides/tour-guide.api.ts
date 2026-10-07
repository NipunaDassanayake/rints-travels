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

async function fetchTourGuides(init: RequestInit): Promise<TourGuide[]> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}/tour-guides`, init);

  if (!response.ok) {
    throw new Error("Failed to load tour guides");
  }

  const result = await response.json();

  return result.data as TourGuide[];
}

/**
 * Cached for up to 60 seconds. Used by the statically generated
 * home page (featured guides) and client-side lists.
 */
export async function getTourGuides(): Promise<TourGuide[]> {
  return fetchTourGuides({
    next: {
      revalidate: 60,
    },
  });
}

/**
 * Not cached: used by the public guide directory (/guides), where
 * a guide that is deactivated or marked unavailable must
 * disappear immediately rather than after a revalidation window.
 * Only call from dynamically rendered routes.
 */
export async function getTourGuidesUncached(): Promise<TourGuide[]> {
  return fetchTourGuides({
    cache: "no-store",
  });
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
      // Not cached, for the same reason as getTourGuidesUncached.
      // Only used by the dynamically rendered /guides/[id] page.
      cache: "no-store",
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