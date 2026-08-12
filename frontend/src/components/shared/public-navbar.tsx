import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function PublicNavbar() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold"
        >
          Travora
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/"
            className="text-sm font-medium"
          >
            Home
          </Link>

          <Link
            href="/packages"
            className="text-sm font-medium"
          >
            Packages
          </Link>

          <Link
            href="/guides"
            className="text-sm font-medium"
          >
            Tour Guides
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
            })}
          >
            Sign in
          </Link>

          <Link
            href="/packages"
            className={buttonVariants()}
          >
            Plan your trip
          </Link>
        </div>
      </div>
    </header>
  );
}