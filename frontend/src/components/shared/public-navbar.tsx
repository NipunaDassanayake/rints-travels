"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {
  CalendarCheck2,
  ChevronDown,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Route,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

import { useAuth } from "@/providers/auth-provider";

import { getDashboardPath } from "@/features/auth/auth.utils";

/* =========================================================
   PUBLIC NAVIGATION
========================================================= */

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

/* =========================================================
   TOURIST ACCOUNT NAVIGATION
========================================================= */

const touristAccountItems = [
  {
    label: "My dashboard",
    href: "/tourist",
    icon: LayoutDashboard,
  },
  {
    label: "My requests",
    href: "/tourist/requests",
    icon: FileText,
  },
  {
    label: "Quotations",
    href: "/tourist/quotations",
    icon: ReceiptText,
  },
  {
    label: "Payments",
    href: "/tourist/payments",
    icon: WalletCards,
  },
  {
    label: "Bookings",
    href: "/tourist/bookings",
    icon: CalendarCheck2,
  },
];

export function PublicNavbar() {
  const pathname = usePathname();

  const router = useRouter();

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  const dashboardPath = user ? getDashboardPath(user.role) : "/login";

  const planTripHref =
    isAuthenticated && user?.role === "TOURIST"
      ? "/tourist/requests/new"
      : `/login?returnUrl=${encodeURIComponent("/tourist/requests/new")}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await logout();

      setAccountMenuOpen(false);

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
        {/* LEFT */}

        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="group flex items-center gap-2"
            onClick={() => {
              setAccountMenuOpen(false);
              setMobileMenuOpen(false);
            }}
          >
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
                  onClick={() => setAccountMenuOpen(false)}
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

        {/* DESKTOP RIGHT */}

        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <div className="h-10 w-36 animate-pulse rounded-full bg-slate-100" />
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
              {/* PLAN TRIP FIRST */}

              {user.role === "TOURIST" && (
                <Link
                  href="/tourist/requests/new"
                  onClick={() => setAccountMenuOpen(false)}
                  className={`${buttonVariants()} rounded-full px-5`}
                >
                  <Route className="size-4" />
                  Plan your trip
                </Link>
              )}

              {/* ACCOUNT DROPDOWN FAR RIGHT */}

              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-full border px-3 py-2 transition-colors hover:bg-slate-50"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                    <UserRound className="size-4" />
                  </div>

                  <div className="hidden max-w-40 text-left lg:block">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {user.firstName} {user.lastName}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.role === "TOURIST"
                        ? "Traveler"
                        : user.role === "TOUR_GUIDE"
                          ? "Tour Guide"
                          : "Administrator"}
                    </p>
                  </div>

                  <ChevronDown
                    className={`size-4 text-slate-500 transition-transform ${
                      accountMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {accountMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border bg-white shadow-xl"
                    role="menu"
                  >
                    <div className="border-b p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <UserRound className="size-5 text-slate-600" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {user.firstName} {user.lastName}
                          </p>

                          <p className="truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {user.role === "TOURIST" ? (
                      <div className="p-2">
                        {touristAccountItems.map(
                          ({ label, href, icon: Icon }) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setAccountMenuOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                              role="menuitem"
                            >
                              <Icon className="size-5 text-slate-500" />

                              {label}
                            </Link>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="p-2">
                        <Link
                          href={dashboardPath}
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                          role="menuitem"
                        >
                          <LayoutDashboard className="size-5 text-slate-500" />

                          {user.role === "TOUR_GUIDE"
                            ? "Guide portal"
                            : "Admin portal"}
                        </Link>
                      </div>
                    )}

                    <div className="border-t p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        role="menuitem"
                      >
                        <LogOut className="size-5" />

                        {isLoggingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* MOBILE BUTTON */}

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

      {/* MOBILE MENU */}

      {mobileMenuOpen && (
        <div className="border-t bg-white px-4 py-5 md:hidden">
          <div className="mx-auto max-w-7xl">
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

            <div className="mt-5 space-y-1 border-t pt-5">
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
              ) : user.role === "TOURIST" ? (
                <>
                  {touristAccountItems.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Icon className="size-5 text-slate-500" />

                      {label}
                    </Link>
                  ))}

                  <Link
                    href="/tourist/requests/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${buttonVariants()} mt-3 w-full justify-center`}
                  >
                    <Route className="size-4" />
                    Plan your trip
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="size-5" />

                    {isLoggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LayoutDashboard className="size-5" />

                    {user.role === "TOUR_GUIDE"
                      ? "Guide portal"
                      : "Admin portal"}
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="size-5" />

                    {isLoggingOut ? "Signing out..." : "Sign out"}
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