"use client";

import {
  CalendarCheck2,
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  Route,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { RoleGuard } from "@/features/auth/components/role-guard";

import {
  PortalShell,
  type PortalNavItem,
} from "@/components/layout/portal-shell";
import { usePortalSession } from "@/components/layout/use-portal-session";

const touristNavigation: PortalNavItem[] = [
  {
    label: "Dashboard",
    href: "/tourist",
    icon: LayoutDashboard,
  },
  {
    // CR-030: a tour request is the root of a traveler's journey.
    label: "My journeys",
    href: "/tourist/requests",
    icon: Route,
  },
  {
    label: "Quotations",
    href: "/tourist/quotations",
    icon: ReceiptText,
  },
  {
    label: "Bookings",
    href: "/tourist/bookings",
    icon: CalendarCheck2,
  },
  {
    label: "Payments",
    href: "/tourist/payments",
    icon: WalletCards,
  },
];

export default function TouristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggingOut, logout } = usePortalSession();

  // Travelers see a human role label; the account role is unchanged.
  const shellUser = user ? { ...user, role: "Traveler" } : null;

  return (
    <RoleGuard allowedRoles={["TOURIST"]}>
      <PortalShell
        area="traveler"
        title="My Travora"
        mobileTitle="My Travora"
        homeHref="/tourist"
        navigationLabel="Traveler navigation"
        toggleLabel="Toggle traveler navigation"
        navigation={touristNavigation}
        primaryAction={{
          label: "Plan a trip",
          href: "/tourist/requests/new",
          icon: PlusCircle,
        }}
        footerLinks={[
          {
            label: "Browse guides",
            href: "/guides",
            icon: UsersRound,
            variant: "outline",
          },
          {
            label: "View public site",
            href: "/",
            variant: "ghost",
          },
        ]}
        user={shellUser}
        isLoggingOut={isLoggingOut}
        onLogout={logout}
      >
        {children}
      </PortalShell>
    </RoleGuard>
  );
}
