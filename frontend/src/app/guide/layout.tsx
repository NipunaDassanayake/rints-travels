"use client";

import { RoleGuard } from "@/features/auth/components/role-guard";

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["TOUR_GUIDE"]}
    >
      {children}
    </RoleGuard>
  );
}