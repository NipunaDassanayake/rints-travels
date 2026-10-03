"use client";

import {
  CalendarCheck2,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  PlusCircle,
  ReceiptText,
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

export default function TouristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggingOut, logout } = usePortalSession();

  return (
    <RoleGuard allowedRoles={["TOURIST"]}>
      <PortalShell
        area="traveler"
        title="Traveler Portal"
        mobileTitle="Travora Traveler"
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
            icon: MessageSquareText,
            variant: "outline",
          },
          {
            label: "View public site",
            href: "/",
            variant: "ghost",
          },
        ]}
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={logout}
      >
        {children}
      </PortalShell>
    </RoleGuard>
  );
}
