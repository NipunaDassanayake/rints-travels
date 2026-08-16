import Image from "next/image";
import Link from "next/link";

import { ArrowUpRight, MapPin } from "lucide-react";

const destinations = [
  {
    name: "Ella",
    subtitle: "Hill Country",
    description:
      "Misty mountains, tea estates, scenic rail journeys and unforgettable viewpoints.",
    image: "/images/home/destinations/ella.jpg",
    href: "/packages?destination=Ella",
  },
  {
    name: "Kandy",
    subtitle: "Culture & Heritage",
    description:
      "Sacred temples, lush hills and one of Sri Lanka’s most important cultural cities.",
    image: "/images/home/destinations/kandy.jpg",
    href: "/packages?destination=Kandy",
  },
  {
    name: "Sigiriya",
    subtitle: "Ancient Lanka",
    description:
      "Explore the iconic rock fortress and discover Sri Lanka’s ancient kingdoms.",
    image: "/images/home/destinations/sigiriya.jpg",
    href: "/packages?destination=Sigiriya",
  },
  {
    name: "Galle",
    subtitle: "Southern Coast",
    description:
      "Colonial charm, tropical beaches and the historic streets of Galle Fort.",
    image: "/images/home/destinations/galle.jpg",
    href: "/packages?destination=Galle",
  },
  {
    name: "Nuwara Eliya",
    subtitle: "Tea Country",
    description:
      "Cool mountain air, endless tea plantations and beautiful highland landscapes.",
    image: "/images/home/destinations/nuwara-eliya.jpg",
    href: "/packages?destination=Nuwara%20Eliya",
  },
];

export function DestinationGrid() {
  return (
    <section id="destinations" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Explore Sri Lanka
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Places worth discovering
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              From misty mountain towns to ancient kingdoms and golden
              coastlines, discover destinations that make every journey feel
              different.
            </p>
          </div>

          <Link
            href="/packages"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
          >
            Explore all packages
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {destinations.slice(0, 2).map((destination) => (
            <DestinationCard
              key={destination.name}
              destination={destination}
              large
            />
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.slice(2).map((destination) => (
            <DestinationCard key={destination.name} destination={destination} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface DestinationCardProps {
  destination: (typeof destinations)[number];

  large?: boolean;
}

function DestinationCard({ destination, large = false }: DestinationCardProps) {
  return (
    <Link
      href={destination.href}
      className={`group relative overflow-hidden rounded-[24px] bg-slate-900 ${
        large ? "min-h-[360px] sm:min-h-[420px]" : "min-h-[320px]"
      }`}
    >
      <Image
        src={destination.image}
        alt={`${destination.name}, Sri Lanka`}
        fill
        sizes={
          large
            ? "(max-width: 768px) 100vw, 50vw"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        }
        className="object-cover transition duration-700 ease-out group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />

      <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-white/75">
              <MapPin className="size-4" />

              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                {destination.subtitle}
              </p>
            </div>

            <h3
              className={`mt-2 font-bold tracking-tight text-white ${
                large ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
              }`}
            >
              {destination.name}
            </h3>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/80">
              {destination.description}
            </p>
          </div>

          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
            <ArrowUpRight className="size-5" />
          </div>
        </div>
      </div>
    </Link>
  );
}