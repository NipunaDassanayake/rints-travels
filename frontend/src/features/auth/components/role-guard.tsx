"use client";

import { useEffect } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { getDashboardPath } from "@/features/auth/auth.utils";

import type { UserRole } from "@/features/auth/auth.types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function RoleGuard({
  children,
  allowedRoles,
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    user,
    isAuthenticated,
    isLoading,
  } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      const queryString =
        searchParams.toString();

      const currentUrl =
        queryString
          ? `${pathname}?${queryString}`
          : pathname;

      router.replace(
        `/login?returnUrl=${encodeURIComponent(
          currentUrl
        )}`
      );

      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace(
        getDashboardPath(user.role)
      );
    }
  }, [
    user,
    isAuthenticated,
    isLoading,
    allowedRoles,
    router,
    pathname,
    searchParams,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading...
        </p>
      </div>
    );
  }

  if (
    !user ||
    !allowedRoles.includes(user.role)
  ) {
    return null;
  }

  return <>{children}</>;
}