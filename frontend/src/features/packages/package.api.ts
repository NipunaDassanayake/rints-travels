import type {
  PackageListData,
  TravelPackage,
} from "./package.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL;

export async function getPackages(): Promise<PackageListData> {
  const response = await fetch(
    `${API_BASE_URL}/packages`,
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