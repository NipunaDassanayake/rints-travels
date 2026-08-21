"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {
  BookOpenText,
  CalendarCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useState } from "react";

import { RoleGuard } from "@/features/auth/components/role-guard";

import { buttonVariants } from "@/components/ui/button";

import { useAuth } from "@/providers/auth-provider";

const adminNavigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Tour requests",
    href: "/admin/tour-requests",
    icon: BookOpenText,
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: CalendarCheck2,
  },
  {
    label: "Packages",
    href: "/admin/packages",
    icon: Package,
  },
  {
    label: "Guides",
    href: "/admin/guides",
    icon: Users,
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({
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
    <RoleGuard allowedRoles={["ADMIN", "SYSTEM_ADMIN"]}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b px-6 py-6">
              <Link href="/admin" className="block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Travora
                </p>

                <p className="mt-1 text-xl font-bold">Admin Portal</p>
              </Link>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {adminNavigation.map(({ label, href, icon: Icon }) => {
                const active = isActiveRoute(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
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

            <div className="border-t p-4">
              {user && (
                <div className="mb-4 rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-5" />
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
                href="/"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-center",
                })}
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

        <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Link href="/admin" className="font-bold">
              Travora Admin
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="flex size-10 items-center justify-center rounded-md border"
              aria-label="Toggle admin navigation"
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
                    <UserRound className="size-5" />

                    <div>
                      <p className="text-sm font-semibold">
                        {user.firstName} {user.lastName}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="space-y-1">
                {adminNavigation.map(({ label, href, icon: Icon }) => {
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
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full justify-center",
                  })}
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