export type UserRole =
  | "TOURIST"
  | "ADMIN"
  | "TOUR_GUIDE"
  | "SYSTEM_ADMIN";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: string;
}