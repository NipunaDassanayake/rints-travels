"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  UserRound,
  X,
} from "lucide-react";

import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";

import { useAuth } from "@/providers/auth-provider";

import { getDashboardPath } from "@/features/auth/auth.utils";

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
  const router = useRouter();

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dashboardPath = user ? getDashboardPath(user.role) : "/login";

  const planTripHref =
    isAuthenticated && user?.role === "TOURIST"
      ? "/tourist/requests/new"
      : `/login?returnUrl=${encodeURIComponent("/tourist/requests/new")}`;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await logout();

      setMobileMenuOpen(false);

      router.replace("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* =================================================
            LEFT SIDE
        ================================================= */}

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

        {/* =================================================
            DESKTOP AUTH ACTIONS
        ================================================= */}

        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
          ) : !isAuthenticated || !user ? (
            <>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "ghost",
                })}
              >
                Sign in
              </Link>

              <Link
                href={planTripHref}
                className={`${buttonVariants()} rounded-full px-5`}
              >
                <Route className="size-4" />
                Plan your trip
              </Link>
            </>
          ) : (
            <>
              {/* Logged-in user */}

              <div className="hidden items-center gap-2 xl:flex">
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="size-4 text-slate-600" />
                </div>

                <div className="max-w-40">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {user.firstName} {user.lastName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {user.role.replaceAll("_", " ")}
                  </p>
                </div>
              </div>

              <Link
                href={dashboardPath}
                className={buttonVariants({
                  variant: "outline",
                })}
              >
                <LayoutDashboard className="size-4" />

                {user.role === "TOURIST"
                  ? "My Dashboard"
                  : user.role === "TOUR_GUIDE"
                    ? "Guide Portal"
                    : "Admin Portal"}
              </Link>

              {user.role === "TOURIST" && (
                <Link
                  href="/tourist/requests/new"
                  className={`${buttonVariants()} rounded-full px-5`}
                >
                  <Route className="size-4" />
                  Plan your trip
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={buttonVariants({
                  variant: "ghost",
                })}
              >
                <LogOut className="size-4" />

                {isLoggingOut ? "Signing out..." : "Logout"}
              </button>
            </>
          )}
        </div>

        {/* =================================================
            MOBILE MENU BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="flex size-10 items-center justify-center rounded-full border md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </button>
      </div>

      {/* ===================================================
          MOBILE MENU
      =================================================== */}

      {mobileMenuOpen && (
        <div className="border-t bg-white px-4 py-5 md:hidden">
          <div className="mx-auto max-w-7xl">
            {/* User */}

            {isAuthenticated && user && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
                  <UserRound className="size-5 text-slate-600" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.firstName} {user.lastName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}

            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-5 space-y-2 border-t pt-5">
              {!isAuthenticated || !user ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "w-full justify-center",
                    })}
                  >
                    Sign in
                  </Link>

                  <Link
                    href={planTripHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={buttonVariants({
                      className: "w-full justify-center",
                    })}
                  >
                    <Route className="size-4" />
                    Plan your trip
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "w-full justify-center",
                    })}
                  >
                    <LayoutDashboard className="size-4" />

                    {user.role === "TOURIST"
                      ? "My Dashboard"
                      : user.role === "TOUR_GUIDE"
                        ? "Guide Portal"
                        : "Admin Portal"}
                  </Link>

                  {user.role === "TOURIST" && (
                    <Link
                      href="/tourist/requests/new"
                      onClick={() => setMobileMenuOpen(false)}
                      className={buttonVariants({
                        className: "w-full justify-center",
                      })}
                    >
                      <Route className="size-4" />
                      Plan your trip
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`${buttonVariants({
                      variant: "ghost",
                    })} w-full justify-center text-destructive hover:text-destructive`}
                  >
                    <LogOut className="size-4" />

                    {isLoggingOut ? "Signing out..." : "Logout"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}