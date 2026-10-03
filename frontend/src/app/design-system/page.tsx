import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { DesignSystemShowcase } from "./showcase";

export const metadata: Metadata = {
  title: "Design System",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Travora design-system showcase (CR-028).
 *
 * Development only: production builds render a 404. Used to
 * review and approve tokens and components before page
 * redesigns adopt them, and by design-system.spec.ts.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignSystemShowcase />;
}
