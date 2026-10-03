import { PublicFooter } from "@/components/shared/public-footer";
import { PublicNavbar } from "@/components/shared/public-navbar";

import { SkipLink } from "@/components/layout/skip-link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-area="public" className="flex min-h-screen flex-col">
      <SkipLink />

      <PublicNavbar />

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}
