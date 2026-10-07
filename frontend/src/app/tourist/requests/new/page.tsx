import { PageHeader } from "@/components/patterns/page-header";

import { getPackages } from "@/features/packages/package.api";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

import { TourRequestForm } from "@/features/tour-requests/components/tour-request-form";

type NewTourRequestPageProps = {
  searchParams: Promise<{
    packageId?: string;
    preferredGuideId?: string;
  }>;
};

/** The API's largest page: the selector offers every active package up to 100. */
const PACKAGE_SELECTOR_LIMIT = 100;

export default async function NewTourRequestPage({ searchParams }: NewTourRequestPageProps) {
  const params = await searchParams;

  const [packageData, tourGuides] = await Promise.all([
    getPackages({}, { limit: PACKAGE_SELECTOR_LIMIT }),
    getTourGuides(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        editorial
        overline="Plan your journey"
        title="Tell us about your trip"
        description="Share your preferences and our team will prepare a personalized travel plan and quotation."
      />

      <div className="mt-8">
        <TourRequestForm
          packages={packageData.items}
          guides={tourGuides}
          initialPackageId={params.packageId}
          initialGuideId={params.preferredGuideId}
        />
      </div>
    </main>
  );
}
