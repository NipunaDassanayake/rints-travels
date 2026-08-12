import { PublicFooter } from "@/components/shared/public-footer";
import { PublicNavbar } from "@/components/shared/public-navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}