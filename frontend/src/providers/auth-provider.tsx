"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/lib/api/client";
import { tokenStore } from "@/lib/auth/tokenStore";

import type { AuthUser, LoginRequest } from "@/features/auth/auth.types";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (data: LoginRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const refreshResponse = await apiClient.post("/auth/refresh");

      const accessToken = refreshResponse.data.data.accessToken;

      tokenStore.setAccessToken(accessToken);

      const meResponse = await apiClient.get("/auth/me");

      setUser(meResponse.data.data);
    } catch {
      tokenStore.clearAccessToken();
      setUser(null);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await refreshSession();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await apiClient.post("/auth/login", data);

    const { accessToken, user: authenticatedUser } = response.data.data;

    tokenStore.setAccessToken(accessToken);

    setUser(authenticatedUser);

    return authenticatedUser;
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      tokenStore.clearAccessToken();
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      await apiClient.post("/auth/logout-all");
    } finally {
      tokenStore.clearAccessToken();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      logoutAll,
      refreshSession,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
