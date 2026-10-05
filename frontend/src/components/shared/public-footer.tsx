import Link from "next/link";

import { Compass } from "lucide-react";

/* =========================================================
   PUBLIC FOOTER (CR-029)

   Only real destinations: no placeholder social, legal or
   contact links. Link labels intentionally differ from the
   header's ("Packages", "Tour Guides", "Sign in") so each
   accessible name on the page stays unambiguous.
========================================================= */

const footerColumns = [
  {
    title: "Explore",
    links: [
      {
        label: "Explore destinations",
        href: "/#destinations",
      },
      {
        label: "Browse travel packages",
        href: "/packages",
      },
      {
        label: "Find a local guide",
        href: "/guides",
      },
    ],
  },
  {
    title: "Plan",
    links: [
      {
        label: "Plan a custom trip",
        href: "/tourist/requests/new",
      },
      {
        label: "Create an account",
        href: "/register",
      },
      {
        label: "Sign in to your account",
        href: "/login",
      },
    ],
  },
];

const promises = [
  "A personalized quotation before you pay",
  "Secure card payment through Stripe",
  "Experienced local tour guides",
];

export function PublicFooter() {
  return (
    <footer data-surface="dark" className="bg-ink-950 text-ink-200">
      <div className="mx-auto max-w-wide px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}

          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-md">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-lg bg-tea-300 text-ink-950"
              >
                <Compass className="size-5" />
              </span>

              <span className="font-display text-2xl font-semibold tracking-tight text-ivory">
                Travora
              </span>
            </Link>

            <p className="mt-5 text-body-sm leading-relaxed">
              Personalized journeys through Sri Lanka, shaped with you and
              guided by people who know the island.
            </p>
          </div>

          {/* Link columns */}

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={`${column.title} links`}>
              <h2 className="text-overline text-tea-300">{column.title}</h2>

              <ul className="mt-4 space-y-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-10 items-center rounded-sm text-body-sm text-ivory transition-colors duration-fast hover:text-tea-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Promise */}

          <div>
            <h2 className="text-overline text-tea-300">Travel with confidence</h2>

            <ul className="mt-4 space-y-3">
              {promises.map((promise) => (
                <li key={promise} className="flex gap-3 text-body-sm">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-cinnamon-300"
                  />
                  {promise}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-caption text-ink-200">
          © {new Date().getFullYear()} Travora. Personalized journeys through Sri Lanka.
        </div>
      </div>
    </footer>
  );
}
