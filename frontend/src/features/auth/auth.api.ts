import { apiClient } from "@/lib/api/client";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "./auth.types";

export const login = async (
  data: LoginRequest
): Promise<LoginResponse> => {
  const response = await apiClient.post(
    "/auth/login",
    data
  );

  return response.data.data;
};

export const register = async (
  data: RegisterRequest
): Promise<AuthUser> => {
  const response = await apiClient.post(
    "/auth/register",
    data
  );

  return response.data.data;
};

export const logout = async () => {
  await apiClient.post("/auth/logout");
};

export const refreshAccessToken = async () => {
  const response = await apiClient.post(
    "/auth/refresh"
  );

  return response.data.data;
};