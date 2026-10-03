"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

/**
 * Current user + logout behavior shared by the portal layouts.
 * Identical to the behavior each layout implemented before
 * CR-028: log out, then replace the route with /login and
 * refresh.
 */
export function usePortalSession() {
  const router = useRouter();

  const { user, logout } = useAuth();

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

  return {
    user,
    isLoggingOut,
    logout: handleLogout,
  };
}
