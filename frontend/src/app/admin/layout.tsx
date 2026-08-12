"use client";

import { RoleGuard } from "@/features/auth/components/role-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={[
        "ADMIN",
        "SYSTEM_ADMIN",
      ]}
    >
      {children}
    </RoleGuard>
  );
}