"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { CalendarCheck2, LayoutDashboard, Menu, Star, X } from "lucide-react";

import { useState } from "react";

import { RoleGuard } from "@/features/auth/components/role-guard";

import { buttonVariants } from "@/components/ui/button";

const guideNavigation = [
  {
    label: "Dashboard",
    href: "/guide",
    icon: LayoutDashboard,
  },
  {
    label: "Assigned tours",
    href: "/guide",
    icon: CalendarCheck2,
  },
  {
    label: "My reviews",
    href: "/guide/reviews",
    icon: Star,
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/guide") {
    return pathname === "/guide" || pathname.startsWith("/guide/bookings/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={["TOUR_GUIDE"]}>
      <div className="min-h-screen bg-background">
        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
          <div className="flex h-full flex-col">
            {/* Brand */}

            <div className="border-b px-6 py-6">
              <Link href="/guide" className="block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Travora
                </p>

                <p className="mt-1 text-xl font-bold">Guide Portal</p>
              </Link>
            </div>

            {/* Navigation */}

            <nav className="flex-1 space-y-1 p-4">
              {guideNavigation.map(({ label, href, icon: Icon }) => {
                const active = isActiveRoute(pathname, href);

                return (
                  <Link
                    key={label}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5" />

                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom */}

            <div className="border-t p-4">
              <Link
                href="/guides"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-center",
                })}
              >
                View public guide profiles
              </Link>

              <Link
                href="/"
                className={`${buttonVariants({
                  variant: "ghost",
                })} mt-2 w-full justify-center`}
              >
                View public site
              </Link>
            </div>
          </div>
        </aside>

        {/* =================================================
            MOBILE HEADER
        ================================================= */}

        <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Link href="/guide" className="font-bold">
              Travora Guide
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="flex size-10 items-center justify-center rounded-md border"
              aria-label="Toggle guide navigation"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="border-t bg-background p-4">
              <nav className="space-y-1">
                {guideNavigation.map(({ label, href, icon: Icon }) => {
                  const active = isActiveRoute(pathname, href);

                  return (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-5" />

                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 border-t pt-4">
                <Link
                  href="/guides"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full justify-center",
                  })}
                >
                  View public profiles
                </Link>

                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${buttonVariants({
                    variant: "ghost",
                  })} mt-2 w-full justify-center`}
                >
                  View public site
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <div className="lg:pl-64">{children}</div>
      </div>
    </RoleGuard>
  );
}
