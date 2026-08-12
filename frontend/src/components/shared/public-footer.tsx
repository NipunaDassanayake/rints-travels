export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Travora. Personalized journeys through Sri Lanka.
      </div>
    </footer>
  );
}