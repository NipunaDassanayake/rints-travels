"use client";

import { RoleGuard } from "@/features/auth/components/role-guard";

export default function TouristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["TOURIST"]}
    >
      {children}
    </RoleGuard>
  );
}