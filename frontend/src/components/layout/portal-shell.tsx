"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { useState } from "react";

import type { LucideIcon } from "lucide-react";
import { LogOut, Menu, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { SkipLink } from "@/components/layout/skip-link";

import { cn } from "@/lib/utils";

/**
 * =========================================================
 * PortalShell (CR-028)
 * =========================================================
 *
 * The shared chrome of the traveler, admin and guide portals:
 * a fixed sidebar from `lg`, and below `lg` a sticky header
 * whose toggle opens the same navigation in a modal drawer
 * (focus trap, Escape to close, focus returns to the toggle).
 *
 * Routes, labels, accessible names and logout behavior are
 * supplied by each portal's layout and are unchanged from the
 * pre-CR-028 layouts. Authorization stays in RoleGuard (the
 * layouts wrap the shell with it); the shell is presentational.
 */

export type PortalArea = "traveler" | "admin" | "guide";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface PortalLink {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: "outline" | "ghost";
}

export interface PortalUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface PortalShellProps {
  area: PortalArea;
  /** Sidebar heading, e.g. "Traveler Portal". */
  title: string;
  /** Mobile header text, e.g. "Travora Traveler". */
  mobileTitle: string;
  homeHref: string;
  /** Accessible name of the navigation landmark. */
  navigationLabel: string;
  /** Accessible name of the mobile menu toggle. */
  toggleLabel: string;
  navigation: PortalNavItem[];
  primaryAction?: PortalLink;
  footerLinks?: PortalLink[];
  user: PortalUser | null;
  isLoggingOut?: boolean;
  onLogout: () => void | Promise<void>;
  /** Showcase only: render inside a frame instead of the viewport. */
  contained?: boolean;
  children: React.ReactNode;
}

function isActiveRoute(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) {
    return pathname === homeHref;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalShell({
  area,
  title,
  mobileTitle,
  homeHref,
  navigationLabel,
  toggleLabel,
  navigation,
  primaryAction,
  footerLinks = [],
  user,
  isLoggingOut = false,
  onLogout,
  contained = false,
  children,
}: PortalShellProps) {
  const pathname = usePathname() ?? "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  const navigationList = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = isActiveRoute(pathname, href, homeHref);

        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-tea-600"
                  : "text-sidebar-foreground hover:bg-sand-100 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />

              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const primaryActionLink = (onNavigate?: () => void) => {
    if (!primaryAction) {
      return null;
    }

    const Icon = primaryAction.icon;

    return (
      <Link
        href={primaryAction.href}
        onClick={onNavigate}
        className={buttonVariants({
          className: "w-full justify-center",
        })}
      >
        {Icon && <Icon aria-hidden="true" className="size-4" />}
        {primaryAction.label}
      </Link>
    );
  };

  const userCard = (showRole: boolean) =>
    user && (
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tea-50 text-tea-700"
          >
            <UserRound className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.firstName} {user.lastName}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>

            {showRole && (
              <p className="mt-1 text-overline text-tea-700">
                {user.role.replaceAll("_", " ")}
              </p>
            )}
          </div>
        </div>
      </div>
    );

  const footer = (onNavigate?: () => void) => (
    <div className="space-y-2">
      {footerLinks.map(({ label, href, icon: Icon, variant = "ghost" }) => (
        <Link
          key={`${href}-${label}`}
          href={href}
          onClick={onNavigate}
          className={buttonVariants({
            variant,
            className: "w-full justify-center",
          })}
        >
          {Icon && <Icon aria-hidden="true" className="size-4" />}
          {label}
        </Link>
      ))}

      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "w-full justify-start text-destructive hover:bg-danger-soft hover:text-danger-ink",
        )}
      >
        <LogOut aria-hidden="true" className="size-4" />

        {isLoggingOut ? "Signing out..." : "Logout"}
      </button>
    </div>
  );

  return (
    <div
      data-area={area}
      data-slot="portal-shell"
      className={cn(
        "bg-background text-foreground",
        contained ? "relative min-h-[36rem] overflow-hidden" : "min-h-screen",
      )}
    >
      {!contained && <SkipLink />}

      {/* Desktop sidebar */}

      <aside
        className={cn(
          "inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar lg:block",
          contained ? "absolute" : "fixed",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b px-6 py-6">
            <Link href={homeHref} className="block rounded-sm">
              <p className="text-overline text-tea-700">Travora</p>

              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {title}
              </p>
            </Link>
          </div>

          {primaryAction && <div className="p-4 pb-0">{primaryActionLink()}</div>}

          <nav aria-label={navigationLabel} className="flex-1 overflow-y-auto p-4">
            {navigationList()}
          </nav>

          <div className="space-y-4 border-t p-4">
            {userCard(true)}
            {footer()}
          </div>
        </div>
      </aside>

      {/* Mobile header + drawer */}

      <div
        className={cn(
          "top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden",
          contained ? "relative" : "sticky",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href={homeHref} className="rounded-sm font-semibold text-foreground">
            {mobileTitle}
          </Link>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              aria-label={toggleLabel}
              aria-expanded={mobileMenuOpen}
              className="flex size-10 items-center justify-center rounded-md border border-sand-300 bg-card text-foreground transition-colors hover:bg-sand-100"
            >
              <Menu aria-hidden="true" className="size-5" />
            </SheetTrigger>

            <SheetContent
              side="left"
              data-area={area}
              className="w-[85vw] max-w-xs gap-0 overflow-y-auto bg-sidebar p-0"
            >
              <div className="border-b px-5 py-5 pr-14">
                <p className="text-overline text-tea-700">Travora</p>

                <SheetTitle className="mt-1 text-lg font-semibold text-foreground">
                  {title}
                </SheetTitle>
              </div>

              <div className="space-y-4 p-4">
                {userCard(false)}
                {primaryActionLink(closeMenu)}

                <nav aria-label={navigationLabel}>{navigationList(closeMenu)}</nav>

                <div className="border-t pt-4">{footer(closeMenu)}</div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div
        id={contained ? undefined : "main-content"}
        tabIndex={contained ? undefined : -1}
        className="outline-none lg:pl-64"
      >
        {children}
      </div>
    </div>
  );
}
