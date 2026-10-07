import type { PackageApiQuery } from "./package-query";

import type {
  PackageListData,
  TravelPackage,
} from "./package.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Public package list. `destination` and `title` use the API's
 * existing case-insensitive "contains" filters; sorting uses its
 * existing sortBy/sortOrder. Callers pass values produced by
 * `toPackageApiQuery` (package-query.ts), never raw browser input.
 *
 * `limit` uses the API's existing page size (default 10, at most
 * 100). Only the tour-request form passes it (CR-030 Stage 3), so
 * its package selector is not limited to the 10 newest packages.
 */
export async function getPackages(
  filters: Partial<PackageApiQuery> = {},
  { limit }: { limit?: number } = {},
): Promise<PackageListData> {
  const query = new URLSearchParams();

  if (limit) {
    query.set("limit", String(limit));
  }

  if (filters.destination) {
    query.set("destination", filters.destination);
  }

  if (filters.title) {
    query.set("title", filters.title);
  }

  if (filters.sortBy && filters.sortOrder) {
    query.set("sortBy", filters.sortBy);
    query.set("sortOrder", filters.sortOrder);
  }

  const queryString = query.toString();

  const response = await fetch(
    `${API_BASE_URL}/packages${queryString ? `?${queryString}` : ""}`,
    {
      next: {
        revalidate: 60,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load travel packages"
    );
  }

  const result = await response.json();

  return result.data;
}

export async function getPackageBySlug(
  slug: string
): Promise<TravelPackage | null> {
  const response = await fetch(
    `${API_BASE_URL}/packages/slug/${encodeURIComponent(
      slug
    )}`,
    {
      next: {
        revalidate: 60,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      "Failed to load travel package"
    );
  }

  const result = await response.json();

  return result.data;
}