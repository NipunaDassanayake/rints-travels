"use client";

import {
  BookOpenText,
  CalendarCheck2,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";

import { RoleGuard } from "@/features/auth/components/role-guard";

import {
  PortalShell,
  type PortalNavItem,
} from "@/components/layout/portal-shell";
import { usePortalSession } from "@/components/layout/use-portal-session";

const adminNavigation: PortalNavItem[] = [
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggingOut, logout } = usePortalSession();

  return (
    <RoleGuard allowedRoles={["ADMIN", "SYSTEM_ADMIN"]}>
      <PortalShell
        area="admin"
        title="Admin Portal"
        mobileTitle="Travora Admin"
        homeHref="/admin"
        navigationLabel="Admin navigation"
        toggleLabel="Toggle admin navigation"
        navigation={adminNavigation}
        footerLinks={[
          {
            label: "View public site",
            href: "/",
            variant: "outline",
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
