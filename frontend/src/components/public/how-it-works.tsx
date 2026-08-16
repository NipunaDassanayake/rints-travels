import {
  CheckCircle2,
  CreditCard,
  FileText,
  Map,
  MessageSquareText,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Map,
    title: "Choose your journey",
    description:
      "Explore our curated travel packages or start from scratch with a completely custom trip.",
  },
  {
    number: "02",
    icon: MessageSquareText,
    title: "Tell us what you need",
    description:
      "Share your preferred dates, travelers, budget, guide preference, accommodation, transport, and special requirements.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Receive your quotation",
    description:
      "Our team reviews your request and prepares a personalized quotation with your itinerary, inclusions, pricing, and trip details.",
  },
  {
    number: "04",
    icon: CreditCard,
    title: "Accept & pay",
    description:
      "Review the final quotation, accept it when you're happy with the plan, and complete your payment securely.",
  },
  {
    number: "05",
    icon: CheckCircle2,
    title: "Your trip is confirmed",
    description:
      "Your booking is confirmed and your travel details stay available in your Travora account.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
            How Travora works
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            From an idea to your
            <br className="hidden sm:block" /> confirmed journey.
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
            Planning a personalized trip shouldn&apos;t be complicated. Travora
            keeps everything from your first request to your confirmed booking
            in one simple journey.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] bg-white/10 lg:block" />

          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.number} className="relative">
                  <div className="relative z-10 flex size-12 items-center justify-center rounded-full border border-white/15 bg-slate-950">
                    <Icon className="size-5 text-white" />
                  </div>

                  <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-white/40">
                    STEP {step.number}
                  </p>

                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {step.description}
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