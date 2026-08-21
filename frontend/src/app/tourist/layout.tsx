"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {
  CalendarCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PlusCircle,
  ReceiptText,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { useState } from "react";

import { RoleGuard } from "@/features/auth/components/role-guard";

import { buttonVariants } from "@/components/ui/button";

import { useAuth } from "@/providers/auth-provider";

const touristNavigation = [
  {
    label: "Dashboard",
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

function isActiveRoute(pathname: string, href: string) {
  if (href === "/tourist") {
    return pathname === "/tourist";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TouristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await logout();

      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["TOURIST"]}>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}

        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b px-6 py-6">
              <Link href="/tourist" className="block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Travora
                </p>

                <p className="mt-1 text-xl font-bold">Traveler Portal</p>
              </Link>
            </div>

            <div className="p-4">
              <Link
                href="/tourist/requests/new"
                className={buttonVariants({
                  className: "w-full justify-center",
                })}
              >
                <PlusCircle className="size-4" />
                Plan a trip
              </Link>
            </div>

            <nav className="flex-1 space-y-1 px-4">
              {touristNavigation.map(({ label, href, icon: Icon }) => {
                const active = isActiveRoute(pathname, href);

                return (
                  <Link
                    key={href}
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

            <div className="border-t p-4">
              {user && (
                <div className="mb-4 rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-5 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {user.firstName} {user.lastName}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>

                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary">
                        {user.role.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Link
                href="/guides"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-center",
                })}
              >
                <MessageSquareText className="size-4" />
                Browse guides
              </Link>

              <Link
                href="/"
                className={`${buttonVariants({
                  variant: "ghost",
                })} mt-2 w-full justify-center`}
              >
                View public site
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${buttonVariants({
                  variant: "ghost",
                })} mt-2 w-full justify-start text-destructive hover:text-destructive`}
              >
                <LogOut className="size-4" />

                {isLoggingOut ? "Signing out..." : "Logout"}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile header */}

        <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Link href="/tourist" className="font-bold">
              Travora Traveler
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="flex size-10 items-center justify-center rounded-md border"
              aria-label="Toggle traveler navigation"
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
              {user && (
                <div className="mb-4 rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {user.firstName} {user.lastName}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Link
                href="/tourist/requests/new"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({
                  className: "mb-4 w-full justify-center",
                })}
              >
                <PlusCircle className="size-4" />
                Plan a trip
              </Link>

              <nav className="space-y-1">
                {touristNavigation.map(({ label, href, icon: Icon }) => {
                  const active = isActiveRoute(pathname, href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
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
                  Browse guides
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

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`${buttonVariants({
                    variant: "ghost",
                  })} mt-2 w-full justify-start text-destructive hover:text-destructive`}
                >
                  <LogOut className="size-4" />

                  {isLoggingOut ? "Signing out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:pl-64">{children}</div>
      </div>
    </RoleGuard>
  );
}