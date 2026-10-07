"use client";

import { LayoutDashboard, Star } from "lucide-react";

import { RoleGuard } from "@/features/auth/components/role-guard";

import {
  PortalShell,
  type PortalNavItem,
} from "@/components/layout/portal-shell";
import { usePortalSession } from "@/components/layout/use-portal-session";

const guideNavigation: PortalNavItem[] = [
  {
    label: "Dashboard",
    href: "/guide",
    icon: LayoutDashboard,
  },
  {
    label: "My reviews",
    href: "/guide/reviews",
    icon: Star,
  },
];

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggingOut, logout } = usePortalSession();

  return (
    <RoleGuard allowedRoles={["TOUR_GUIDE"]}>
      <PortalShell
        area="guide"
        title="Guide Portal"
        mobileTitle="Travora Guide"
        homeHref="/guide"
        navigationLabel="Guide navigation"
        toggleLabel="Toggle guide navigation"
        navigation={guideNavigation}
        footerLinks={[
          {
            label: "View public profiles",
            href: "/guides",
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
