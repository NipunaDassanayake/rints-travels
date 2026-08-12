import type { UserRole } from "./auth.types";

export function getDashboardPath(
  role: UserRole
): string {
  switch (role) {
    case "ADMIN":
    case "SYSTEM_ADMIN":
      return "/admin";

    case "TOUR_GUIDE":
      return "/guide";

    case "TOURIST":
    default:
      return "/tourist";
  }
}