import type { Metadata } from "next";

import Link from "next/link";

import { notFound } from "next/navigation";

import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, MapPin, X } from "lucide-react";

import { CustomTripCta } from "@/components/public/custom-trip-cta";

import { buttonVariants } from "@/components/ui/button";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import { PackageImageGallery } from "@/features/packages/components/package-image-gallery";

import { getPackageBySlug } from "@/features/packages/package.api";

import { formatUsdPrice } from "@/lib/format";

import { cn } from "@/lib/utils";

type PackagePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getValidPrimaryImage = (
  images: {
    id: number;
    imageUrl: string;
    isPrimary: boolean;
    displayOrder: number;
    altText?: string | null;
  }[],
) => {
  return (
    images.find(
      (image) => image.isPrimary && !image.imageUrl.includes("example.com"),
    ) ?? images.find((image) => !image.imageUrl.includes("example.com"))
  );
};

export async function generateMetadata({
  params,
}: PackagePageProps): Promise<Metadata> {
  const { slug } = await params;

  const travelPackage = await getPackageBySlug(slug);

  if (!travelPackage) {
    return {
      title: "Package Not Found",
    };
  }

  const primaryImage = getValidPrimaryImage(travelPackage.images);

  const primaryImageUrl = primaryImage
    ? getPackageImageUrl(primaryImage.imageUrl)
    : null;

  return {
    title: travelPackage.title,

    description: travelPackage.description.slice(0, 160),

    openGraph: {
      title: travelPackage.title,

      description: travelPackage.description.slice(0, 160),

      images: primaryImageUrl ? [primaryImageUrl] : [],
    },
  };
}

/** A content section in the main column, labelled by its heading. */
function DetailSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className={className}>
      <h2 id={`${id}-heading`} className="font-display text-display-md text-foreground">
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

/*
 * Public package detail (CR-029 Stage 4): title and facts first,
 * then the gallery, the price and package-aware action, and the
 * content (overview, itinerary, inclusions, FAQs). From `lg` the
 * price card moves into a sticky rail beside the content; its
 * place in the reading order stays right after the gallery.
 *
 * Everything is server-rendered; only the gallery's lightbox
 * needs JavaScript.
 */
export default async function PackagePage({ params }: PackagePageProps) {
  const { slug } = await params;

  const travelPackage = await getPackageBySlug(slug);

  if (!travelPackage) {
    notFound();
  }

  const price = formatUsdPrice(travelPackage.price);

  const durationLabel = `${travelPackage.durationDays} ${
    travelPackage.durationDays === 1 ? "day" : "days"
  }`;

  const itinerary = [...travelPackage.itineraries].sort(
    (a, b) => a.dayNumber - b.dayNumber,
  );

  const faqs = [...travelPackage.faqs].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  const { inclusions, exclusions } = travelPackage;

  return (
    <>
      <div className="mx-auto max-w-wide px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <Link
          href="/packages"
          className="inline-flex min-h-10 items-center gap-2 rounded-sm text-label text-foreground-secondary transition-colors duration-fast hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All packages
        </Link>

        {/* Where, what and how long, before the photography */}
        <header className="mt-4 max-w-3xl sm:mt-6">
          <h1 className="text-balance break-words font-display text-display-lg text-foreground lg:text-display-xl">
            {travelPackage.title}
          </h1>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-body text-foreground-secondary">
            <div>
              <dt className="sr-only">Destination</dt>

              <dd className="flex items-start gap-2">
                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-tea-700" />
                {travelPackage.destination}
              </dd>
            </div>

            <div>
              <dt className="sr-only">Duration</dt>

              <dd className="flex items-start gap-2">
                <Clock3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-tea-700" />
                {durationLabel}
              </dd>
            </div>
          </dl>
        </header>

        {/* Adaptive gallery with an accessible lightbox (Stage 4C) */}
        <div className="mt-6 sm:mt-8">
          <PackageImageGallery title={travelPackage.title} images={travelPackage.images} />
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-wide px-4 pb-16 sm:mt-10 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 lg:px-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-16">
        {/* Price and package-aware action */}
        <aside aria-label="Tour details and customization" className="lg:col-start-2 lg:row-start-1">
          <div className="rounded-card border border-border bg-card p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6 lg:sticky lg:top-24 lg:block">
            <div>
              {price && (
                <>
                  <p className="text-caption text-muted-foreground">Starting from</p>

                  <p className="mt-1 font-display text-display-md text-foreground">{price}</p>
                </>
              )}

              <dl className="mt-4 hidden space-y-2 border-t border-border pt-4 text-body-sm text-foreground-secondary lg:block">
                <div>
                  <dt className="sr-only">Duration</dt>

                  <dd className="flex gap-2">
                    <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tea-700" />
                    {durationLabel}
                  </dd>
                </div>

                <div>
                  <dt className="sr-only">Destination</dt>

                  <dd className="flex gap-2">
                    <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tea-700" />
                    {travelPackage.destination}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 sm:mt-0 sm:shrink-0 lg:mt-6">
              <Link
                href={`/tourist/requests/new?packageId=${travelPackage.id}`}
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto lg:w-full")}
              >
                Customize this tour
                <ArrowRight aria-hidden="true" />
              </Link>

              <p className="mt-3 text-caption text-muted-foreground sm:max-w-64 lg:max-w-none">
                Final pricing is customized based on your dates, accommodation,
                transport and selected experiences.
              </p>
            </div>
          </div>
        </aside>

        {/*
          Content. One rhythm for every block: a hairline divider and the
          same vertical spacing, so sections read as one editorial page.
        */}
        <div className="mt-12 min-w-0 divide-y divide-border sm:mt-14 lg:col-start-1 lg:row-start-1 lg:mt-0 [&>*]:py-12 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0 sm:[&>*]:py-14">
          <DetailSection id="overview" title="Overview">
            <p className="max-w-reading whitespace-pre-line text-body-lg text-foreground-secondary">
              {travelPackage.description}
            </p>
          </DetailSection>

          {itinerary.length > 0 && (
            <DetailSection id="itinerary" title="Itinerary">
              {/* Editorial timeline: a quiet day marker on a thin guide. */}
              <ol className="max-w-reading">
                {itinerary.map((day, position) => (
                  <li
                    key={day.id}
                    className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-6"
                  >
                    <div aria-hidden="true" className="flex flex-col items-center">
                      <span className="text-overline text-muted-foreground">Day</span>

                      <span className="font-display text-heading-xl leading-none text-tea-700 tabular-nums">
                        {day.dayNumber}
                      </span>

                      {position < itinerary.length - 1 && (
                        <span className="mt-3 w-px flex-1 bg-sand-300" />
                      )}
                    </div>

                    <div className={cn("pt-1", position < itinerary.length - 1 && "pb-8 sm:pb-9")}>
                      <h3 className="text-heading-md text-foreground">
                        <span className="sr-only">Day {day.dayNumber}: </span>
                        {day.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-line text-body text-foreground-secondary">
                        {day.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </DetailSection>
          )}

          {(inclusions.length > 0 || exclusions.length > 0) && (
            <div
              className={cn(
                "grid gap-12",
                inclusions.length > 0 && exclusions.length > 0
                  ? "md:grid-cols-2 md:gap-10"
                  : "max-w-reading",
              )}
            >
              {inclusions.length > 0 && (
                <DetailSection id="included" title="What's included">
                  <ul className="border-t border-border">
                    {inclusions.map((item) => (
                      <li key={item.id} className="flex gap-3 border-b border-border py-3 text-body text-foreground">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-tea-50 text-tea-700"
                        >
                          <Check className="size-4" />
                        </span>

                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {exclusions.length > 0 && (
                <DetailSection id="not-included" title="What's not included">
                  <ul className="border-t border-border">
                    {exclusions.map((item) => (
                      <li key={item.id} className="flex gap-3 border-b border-border py-3 text-body text-foreground-secondary">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sand-100 text-muted-foreground"
                        >
                          <X className="size-4" />
                        </span>

                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}
            </div>
          )}

          {faqs.length > 0 && (
            <DetailSection id="faqs" title="Frequently asked questions">
              {/* Native disclosure: keyboard and no-JavaScript friendly */}
              <div className="max-w-reading border-t border-border">
                {faqs.map((faq) => (
                  <details key={faq.id} className="group border-b border-border">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-heading-sm text-foreground transition-colors duration-fast hover:text-tea-800 [&::-webkit-details-marker]:hidden">
                      {faq.question}

                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-foreground-secondary transition-colors duration-fast group-open:bg-tea-50 group-open:text-tea-700"
                      >
                        <ChevronDown className="size-4 transition-transform duration-fast group-open:rotate-180 motion-reduce:transition-none" />
                      </span>
                    </summary>

                    <p className="whitespace-pre-line pb-6 pr-12 text-body text-foreground-secondary">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </DetailSection>
          )}
        </div>
      </div>

      {/* A different trip, if this one isn't quite right */}
      <CustomTripCta showBrowseLink={false} className="pt-0 sm:pt-0" />
    </>
  );
}
