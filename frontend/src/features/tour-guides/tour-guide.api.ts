import type {
  TourGuide,
} from "./tour-guide.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL;

export async function getTourGuides(): Promise<
  TourGuide[]
> {
  const response = await fetch(
    `${API_BASE_URL}/tour-guides`,
    {
      next: {
        revalidate: 60,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load tour guides"
    );
  }

  const result = await response.json();

  return result.data;
}

export async function getTourGuideById(
  id: string
): Promise<TourGuide | null> {
  const response = await fetch(
    `${API_BASE_URL}/tour-guides/${encodeURIComponent(
      id
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
      "Failed to load tour guide"
    );
  }

  const result = await response.json();

  return result.data;
}