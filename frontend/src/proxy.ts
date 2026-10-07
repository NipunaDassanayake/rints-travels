import { NextResponse, type NextRequest } from "next/server";

import { canonicalPackagesRedirect } from "@/features/packages/package-query";

/*
 * Proxy (CR-029 Stage 3A follow-up). Its only job: send
 * non-canonical /packages query strings (empty fields from the
 * GET search form, the default or an invalid sort, untrimmed or
 * repeated values, unknown parameters) to the canonical URL with
 * a real redirect, before the page renders. The rules live in
 * package-query.ts; the page keeps the same check as a fallback.
 *
 * Every other route passes through untouched.
 */
export function proxy(request: NextRequest) {
  // Matchers are prefix-anchored, so also exclude /packages/[slug].
  if (request.nextUrl.pathname !== "/packages") {
    return NextResponse.next();
  }

  const canonical = canonicalPackagesRedirect(request.nextUrl.searchParams);

  if (!canonical) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(canonical, request.url));
}

export const config = {
  matcher: "/packages",
};
