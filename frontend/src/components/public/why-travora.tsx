import { BadgeCheck, Compass, Handshake, RefreshCcw } from "lucide-react";

const features = [
  {
    icon: Compass,
    title: "Designed around you",
    description:
      "Start with a curated journey and personalize the dates, budget, accommodation, transport, and experiences.",
  },
  {
    icon: Handshake,
    title: "Trusted local guides",
    description:
      "Travel with experienced local guides who understand the destinations, culture, and experiences that make Sri Lanka special.",
  },
  {
    icon: RefreshCcw,
    title: "Flexible planning",
    description:
      "Discuss your requirements with our team, review your personalized quotation, and request changes before confirming.",
  },
  {
    icon: BadgeCheck,
    title: "Simple, secure booking",
    description:
      "Accept your final quotation, complete payment, and keep your confirmed itinerary, booking, and trip information in one place.",
  },
];

export function WhyTravora() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Why Travora
            </p>

            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              More than a package.
              <br />A journey built around you.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Travora combines curated Sri Lanka journeys with the flexibility
              of personalized travel planning, so you don&apos;t have to choose
              between convenience and a trip that feels uniquely yours.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-[22px] border bg-slate-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Icon className="size-5" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}