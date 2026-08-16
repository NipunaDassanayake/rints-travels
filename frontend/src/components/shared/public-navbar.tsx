"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Compass, Menu, Route } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

const navigationItems = [
  {
    label: "Explore",
    href: "/",
  },
  {
    label: "Packages",
    href: "/packages",
  },
  {
    label: "Destinations",
    href: "/#destinations",
  },
  {
    label: "Tour Guides",
    href: "/guides",
  },
];

export function PublicNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white transition-transform group-hover:-rotate-3">
              <Compass className="size-5" />
            </div>

            <span className="text-2xl font-bold tracking-tight text-slate-950">
              Travora
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navigationItems.map((item) => {
              const baseHref = item.href.split("#")[0];

              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : baseHref !== "/" && pathname.startsWith(baseHref);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
            })}
          >
            Sign in
          </Link>

          <Link
            href="/tourist/requests/new"
            className={`${buttonVariants()} rounded-full px-5`}
          >
            <Route className="size-4" />
            Plan your trip
          </Link>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full border lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
      </div>
    </header>
  );
}