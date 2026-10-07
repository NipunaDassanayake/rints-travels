import { CeylonConsidered } from "@/components/public/ceylon-considered";

import { CustomTripCta } from "@/components/public/custom-trip-cta";

import { DestinationGrid } from "@/components/public/destination-grid";

import { FeaturedPackages } from "@/components/public/featured-packages";

import { HomeHero } from "@/components/public/home-hero";

import { HowTravoraWorks } from "@/components/public/how-travora-works";

import { LocalGuides } from "@/components/public/local-guides";

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <DestinationGrid />

      <FeaturedPackages />

      <CeylonConsidered />

      <HowTravoraWorks />

      <LocalGuides />

      <CustomTripCta />
    </>
  );
}
