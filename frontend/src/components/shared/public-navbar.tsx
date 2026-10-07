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
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import { useAuth } from "@/providers/auth-provider";

import { getDashboardPath } from "@/features/auth/auth.utils";

import type { AuthUser } from "@/features/auth/auth.types";

/* =========================================================
   PUBLIC NAVIGATION (CR-029)

   Desktop links from `lg`; below `lg` (phones and tablets) the
   same links live in a modal Sheet drawer, so every width has a
   way to navigate.

   The accessible names "Packages", "Tour Guides", "Toggle
   navigation", "Admin portal" and the account button ending in
   the role label are relied on by the E2E suite.
========================================================= */

const navigationItems = [
  {
    label: "Destinations",
    href: "/#destinations",
  },
  {
    label: "Packages",
    href: "/packages",
  },
  {
    label: "Tour Guides",
    href: "/guides",
  },
];

const touristAccountItems: { label: string; href: string; icon: LucideIcon }[] = [
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

function isActive(pathname: string, href: string) {
  if (href.includes("#")) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRoleLabel(user: AuthUser) {
  if (user.role === "TOURIST") {
    return "Traveler";
  }

  return user.role === "TOUR_GUIDE" ? "Tour Guide" : "Administrator";
}

function getInitials(user: AuthUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

/**
 * Account links for the signed-in user: the traveler's own
 * pages, or a single link to the guide/admin portal.
 */
function getAccountItems(user: AuthUser) {
  if (user.role === "TOURIST") {
    return touristAccountItems;
  }

  return [
    {
      label: user.role === "TOUR_GUIDE" ? "Guide portal" : "Admin portal",
      href: getDashboardPath(user.role),
      icon: LayoutDashboard,
    },
  ];
}

function Monogram({ user, className }: { user: AuthUser; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-tea-800 text-label text-ivory",
        className,
      )}
    >
      {getInitials(user)}
    </span>
  );
}

export function PublicNavbar() {
  const pathname = usePathname() ?? "";

  const router = useRouter();

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const signedInUser = isAuthenticated && user ? user : null;

  const showPlanTrip = !signedInUser || signedInUser.role === "TOURIST";

  const planTripHref =
    signedInUser?.role === "TOURIST"
      ? "/tourist/requests/new"
      : `/login?returnUrl=${encodeURIComponent("/tourist/requests/new")}`;

  const closeMobileMenu = () => setMobileMenuOpen(false);

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

  const planTripLink = (className?: string, onNavigate?: () => void) => (
    <Link
      href={planTripHref}
      onClick={onNavigate}
      className={cn(buttonVariants(), className)}
    >
      <Route aria-hidden="true" />
      Plan your trip
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-18 max-w-wide items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Brand + desktop navigation */}

        <div className="flex items-center gap-8 xl:gap-10">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="group flex items-center gap-2.5 rounded-md"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-base ease-standard group-hover:-rotate-6 motion-reduce:transition-none"
            >
              <Compass className="size-5" />
            </span>

            <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Travora
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navigationItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-md px-3 py-2 text-label transition-colors duration-fast",
                        active
                          ? "text-foreground after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
                          : "text-foreground-secondary hover:bg-sand-100 hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Desktop account area */}

        <div className="hidden items-center gap-2 lg:flex">
          {isLoading ? (
            <Skeleton className="h-10 w-48 rounded-full" />
          ) : !signedInUser ? (
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
                href="/register"
                className={buttonVariants({
                  variant: "outline",
                })}
              >
                Sign up
              </Link>

              {planTripLink("ml-1")}
            </>
          ) : (
            <>
              {showPlanTrip && planTripLink()}

              <AccountDisclosure
                user={signedInUser}
                isLoggingOut={isLoggingOut}
                onLogout={handleLogout}
              />
            </>
          )}
        </div>

        {/* Phone + tablet: primary CTA and the navigation drawer */}

        <div className="flex items-center gap-2 lg:hidden">
          {!isLoading && showPlanTrip && planTripLink("hidden sm:inline-flex")}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              className={buttonVariants({
                variant: "outline",
                size: "icon",
              })}
            >
              <Menu aria-hidden="true" className="size-5" />
            </SheetTrigger>

            <SheetContent
              side="right"
              data-area="public"
              className="w-[88vw] max-w-sm gap-0 overflow-y-auto bg-background p-0"
            >
              <div className="border-b border-border px-6 py-5 pr-14">
                <p className="text-overline text-tea-700">Travora</p>

                <SheetTitle className="mt-1 font-display text-heading-lg text-foreground">
                  Menu
                </SheetTitle>
              </div>

              <nav aria-label="Primary" className="px-3 py-4">
                <ul className="space-y-1">
                  {navigationItems.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMobileMenu}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center rounded-md px-3 text-heading-sm transition-colors duration-fast",
                            active
                              ? "bg-secondary text-secondary-foreground"
                              : "text-foreground hover:bg-sand-100",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="border-t border-border px-6 py-5">
                {isLoading ? (
                  <div aria-busy="true" className="space-y-3">
                    <span className="sr-only">Loading your account</span>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : !signedInUser ? (
                  <div className="space-y-3">
                    {planTripLink("w-full", closeMobileMenu)}

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/login"
                        onClick={closeMobileMenu}
                        className={buttonVariants({
                          variant: "outline",
                        })}
                      >
                        Sign in
                      </Link>

                      <Link
                        href="/register"
                        onClick={closeMobileMenu}
                        className={buttonVariants({
                          variant: "outline",
                        })}
                      >
                        Sign up
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-card bg-sand-100 p-3">
                      <Monogram user={signedInUser} className="size-11" />

                      <div className="min-w-0">
                        <p className="truncate text-label text-foreground">
                          {signedInUser.firstName} {signedInUser.lastName}
                        </p>

                        <p className="truncate text-caption text-muted-foreground">
                          {signedInUser.email}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1">
                      {getAccountItems(signedInUser).map(({ label, href, icon: Icon }) => (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={closeMobileMenu}
                            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-body-sm text-foreground transition-colors duration-fast hover:bg-sand-100"
                          >
                            <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    {showPlanTrip && planTripLink("w-full", closeMobileMenu)}

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={cn(
                        buttonVariants({
                          variant: "ghost",
                        }),
                        "w-full justify-start text-danger-ink hover:bg-danger-soft hover:text-danger-ink",
                      )}
                    >
                      <LogOut aria-hidden="true" />
                      {isLoggingOut ? "Signing out..." : "Sign out"}
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   ACCOUNT DISCLOSURE (desktop)

   A disclosure (button + panel of links), not an ARIA menu:
   Tab moves through the links, Escape closes and returns focus
   to the button, and clicking or tabbing outside closes it.
========================================================= */

function AccountDisclosure({
  user,
  isLoggingOut,
  onLogout,
}: {
  user: AuthUser;
  isLoggingOut: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const panelId = "public-account-panel";

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);

        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left transition-colors duration-fast hover:bg-sand-100"
      >
        <Monogram user={user} />

        <span className="max-w-40">
          <span className="block truncate text-label text-foreground">
            {user.firstName} {user.lastName}
          </span>

          <span className="block truncate text-caption text-muted-foreground">
            {getRoleLabel(user)}
          </span>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-fast",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-[calc(100%+0.625rem)] w-72 overflow-hidden rounded-card border border-border bg-card shadow-lg"
      >
        <div className="border-b border-border p-4">
          <p className="truncate text-label text-foreground">
            {user.firstName} {user.lastName}
          </p>

          <p className="truncate text-caption text-muted-foreground">{user.email}</p>
        </div>

        <ul className="p-2">
          {getAccountItems(user).map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={close}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-foreground transition-colors duration-fast hover:bg-sand-100"
              >
                <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-body-sm text-danger-ink transition-colors duration-fast hover:bg-danger-soft disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="size-5" />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
