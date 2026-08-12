import {
  getPackages,
} from "@/features/packages/package.api";

import {
  getTourGuides,
} from "@/features/tour-guides/tour-guide.api";

import {
  TourRequestForm,
} from "@/features/tour-requests/components/tour-request-form";

type NewTourRequestPageProps = {
  searchParams: Promise<{
    packageId?: string;
    preferredGuideId?: string;
  }>;
};

export default async function NewTourRequestPage({
  searchParams,
}: NewTourRequestPageProps) {
  const params = await searchParams;

  const [
    packageData,
    tourGuides,
  ] = await Promise.all([
    getPackages(),
    getTourGuides(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Plan your journey
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Tell us about your trip
        </h1>

        <p className="mt-3 text-muted-foreground">
          Share your preferences and our team
          will prepare a personalized travel plan
          and quotation.
        </p>
      </div>

      <TourRequestForm
        packages={packageData.items}
        guides={tourGuides}
        initialPackageId={
          params.packageId
        }
        initialGuideId={
          params.preferredGuideId
        }
      />
    </div>
  );
}