import { CustomTripCta } from "@/components/public/custom-trip-cta";

import { DestinationGrid } from "@/components/public/destination-grid";

import { FeaturedPackages } from "@/components/public/featured-packages";

import { HomeHero } from "@/components/public/home-hero";

import { HowItWorks } from "@/components/public/how-it-works";

import { LocalGuides } from "@/components/public/local-guides";

import { WhyTravora } from "@/components/public/why-travora";

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <DestinationGrid />

      <FeaturedPackages />

      <WhyTravora />

      <HowItWorks />

      <LocalGuides />

      <CustomTripCta />
    </>
  );
}