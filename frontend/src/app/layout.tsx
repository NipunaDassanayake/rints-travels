import type { Metadata } from "next";
import {
  Fraunces,
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";

import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
 * Display/editorial face (opt-in via the `font-display` utility).
 * Not preloaded: it is only fetched on pages that actually use it.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Travora",
    template: "%s | Travora",
  },
  description:
    "Plan personalized Sri Lanka journeys with Travora.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>

        <Toaster />
      </body>
    </html>
  );
}
