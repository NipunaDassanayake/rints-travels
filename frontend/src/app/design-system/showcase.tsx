"use client";

import Image from "next/image";

import { useState } from "react";

import { toast } from "sonner";

import {
  ArrowRight,
  CalendarDays,
  CalendarCheck2,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  Search,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { DescriptionList } from "@/components/patterns/description-list";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { FilterBar } from "@/components/patterns/filter-bar";
import { LoadingState } from "@/components/patterns/loading-state";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionHeader } from "@/components/patterns/section-header";
import { StatCard } from "@/components/patterns/stat-card";
import { StatusBadge } from "@/components/patterns/status-badge";

import { Container } from "@/components/layout/container";
import { PortalShell } from "@/components/layout/portal-shell";
import { SkipLink } from "@/components/layout/skip-link";

import { useIsHydrated } from "@/hooks/use-is-hydrated";

import { STATUS_TONES, type StatusEntity } from "@/lib/status";

import {
  CONTRAST_PAIRS,
  contrastRatio,
  parseColor,
  toHex,
  type ContrastPair,
} from "./contrast";

const SECTIONS = [
  ["palette", "Palette"],
  ["typography", "Typography"],
  ["buttons", "Buttons"],
  ["forms", "Form controls"],
  ["status", "Status badges"],
  ["cards", "Cards"],
  ["alerts", "Alerts"],
  ["loading", "Loading"],
  ["empty-states", "Empty & error states"],
  ["dialogs", "Dialogs & feedback"],
  ["navigation", "Navigation / shell"],
  ["areas", "Four areas"],
  ["contrast", "Contrast"],
] as const;

const SCALES = {
  "Tea Green (primary)": "tea",
  "Rainforest Ink (deep tone, text)": "ink",
  "Cinnamon (accent)": "cinnamon",
  "Sand (neutrals)": "sand",
} as const;

const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

const SEMANTIC = ["success", "info", "warning", "danger"] as const;

const ENTITY_LABELS: Record<StatusEntity, string> = {
  tourRequest: "Tour request",
  quotation: "Quotation",
  payment: "Payment",
  booking: "Booking",
};

const DEMO_USER = {
  firstName: "Amaya",
  lastName: "Perera",
  email: "amaya@example.com",
  role: "TOURIST",
};

/* ---------------------------------------------------------------- */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 border-t border-border py-12 first:border-t-0"
    >
      <h2 id={`${id}-title`} className="text-heading-lg">
        {title}
      </h2>

      {description && (
        <p className="mt-1 max-w-reading text-body-sm text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-heading-sm">{children}</h3>;
}

/** Reads a token's live value from :root once hydrated (client only). */
function useTokenValues(names: string[]) {
  const hydrated = useIsHydrated();

  if (!hydrated) {
    return {} as Record<string, string>;
  }

  const style = getComputedStyle(document.documentElement);

  return Object.fromEntries(
    names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]),
  ) as Record<string, string>;
}

function Swatch({ token, label }: { token: string; label: string }) {
  const values = useTokenValues([token]);

  const raw = values[token] ?? "";

  const parsed = parseColor(raw);

  return (
    <li className="min-w-0" data-token={token}>
      <div
        className="h-14 rounded-md ring-1 ring-black/5"
        style={{ background: `var(--${token})` }}
      />

      <p className="mt-1.5 text-caption text-foreground">{label}</p>

      <p className="truncate font-mono text-[0.75rem] text-muted-foreground" title={raw}>
        {parsed ? toHex(parsed) : "…"}
      </p>
    </li>
  );
}

/* ---------------------------------------------------------------- */

function PaletteSection() {
  return (
    <Section
      id="palette"
      title="Palette"
      description="Tea Green, Rainforest Ink, Cinnamon and Sand, with Ivory as the canvas. Hex values are computed live from the CSS tokens."
    >
      <div className="space-y-8">
        {Object.entries(SCALES).map(([name, scale]) => (
          <div key={scale}>
            <Subheading>{name}</Subheading>

            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
              {STEPS.map((step) => (
                <Swatch key={step} token={`color-${scale}-${step}`} label={step} />
              ))}
            </ul>
          </div>
        ))}

        <div>
          <Subheading>Base surfaces</Subheading>

          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Swatch token="color-ivory" label="Ivory (canvas)" />
            <Swatch token="card" label="White (surface)" />
            <Swatch token="border" label="Border" />
            <Swatch token="input" label="Input border" />
            <Swatch token="ring" label="Focus ring" />
            <Swatch token="foreground" label="Text" />
          </ul>
        </div>

        <div>
          <Subheading>Semantic tones</Subheading>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SEMANTIC.map((tone) => (
              <div key={tone}>
                <p className="mb-2 text-label capitalize">{tone}</p>

                <ul className="grid grid-cols-2 gap-3">
                  <Swatch token={`color-${tone}`} label="solid" />
                  <Swatch token={`color-${tone}-ink`} label="text / icon" />
                  <Swatch token={`color-${tone}-soft`} label="soft" />
                  <Swatch token={`color-${tone}-border`} label="border" />
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function TypographySection() {
  const display = [
    ["text-display-2xl", "Display 2XL · Fraunces 600"],
    ["text-display-xl", "Display XL · Fraunces 600"],
    ["text-display-lg", "Display LG · Fraunces 500"],
    ["text-display-md", "Display MD · Fraunces 500"],
  ];

  const sans = [
    ["text-heading-xl", "Heading XL · page title (h1)"],
    ["text-heading-lg", "Heading LG · section (h2)"],
    ["text-heading-md", "Heading MD · card title (h3)"],
    ["text-heading-sm", "Heading SM · subsection (h4)"],
    ["text-body-lg", "Body LG · public lead paragraphs"],
    ["text-body", "Body · default reading text"],
    ["text-body-sm", "Body SM · dense and secondary text"],
    ["text-label", "Label · form labels, buttons"],
    ["text-caption", "Caption · metadata"],
  ];

  return (
    <Section
      id="typography"
      title="Typography"
      description="Geist for the interface; Fraunces only for public and traveler editorial moments (opt-in via font-display)."
    >
      <div className="space-y-6">
        <div className="space-y-4 rounded-card border bg-card p-6">
          <p className="text-overline text-cinnamon-700">Fraunces · editorial only</p>

          {display.map(([cls, label]) => (
            <div key={cls}>
              <p className={`font-display ${cls}`}>Ella to the southern coast</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {label} · <code>{`font-display ${cls}`}</code>
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-card border bg-card p-6">
          <p className="text-overline text-tea-700">Geist · interface</p>

          {sans.map(([cls, label]) => (
            <div key={cls}>
              <p className={cls}>Your quotation for Kandy and Ella is ready</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {label} · <code>{cls}</code>
              </p>
            </div>
          ))}

          <div>
            <p className="text-overline text-tea-700">Overline · once per section</p>
            <p className="mt-1 text-caption text-muted-foreground">
              <code>text-overline</code>
            </p>
          </div>

          <div>
            <p className="text-stat">USD 2,150</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Stat · tabular figures · <code>text-stat</code>
            </p>
          </div>

          <div>
            <p className="font-mono text-sm">QTN-1791040597944-1655BC</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Geist Mono · references and IDs
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ButtonsSection() {
  const variants = [
    "default",
    "secondary",
    "outline",
    "ghost",
    "destructive",
    "destructive-solid",
    "accent",
    "link",
  ] as const;

  const sizes = ["xs", "sm", "default", "lg", "xl"] as const;

  return (
    <Section
      id="buttons"
      title="Buttons"
      description="Default height 40px (36px in admin). Press Tab to see the 2px focus ring with 2px offset."
    >
      <div className="space-y-8">
        <div>
          <Subheading>Variants</Subheading>

          <div className="flex flex-wrap items-center gap-3">
            {variants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Subheading>Sizes</Subheading>

          <div className="flex flex-wrap items-end gap-3">
            {sizes.map((size) => (
              <Button key={size} size={size}>
                <Plus />
                Size {size}
              </Button>
            ))}

            <Button size="icon" variant="outline" aria-label="Search">
              <Search />
            </Button>
          </div>
        </div>

        <div>
          <Subheading>States</Subheading>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled outline
            </Button>
            <Button disabled>
              <Spinner size="sm" className="text-current" />
              Saving…
            </Button>
          </div>
        </div>

        <div>
          <Subheading>Dark surface</Subheading>

          <div
            data-surface="dark"
            className="flex flex-wrap items-center gap-3 rounded-card bg-ink-950 p-6"
          >
            <Button variant="inverse">Inverse</Button>
            <Button variant="accent">Plan your journey</Button>
            <a href="#buttons" className="text-sm font-medium text-tea-300 underline-offset-4 hover:underline">
              Link on dark
            </a>
          </div>
        </div>

        <div data-area="admin" className="rounded-card border bg-background p-4">
          <Subheading>Admin density (36px default)</Subheading>

          <div className="flex flex-wrap items-center gap-3">
            <Button>Save changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FormsSection() {
  return (
    <Section
      id="forms"
      title="Form controls"
      description="Inputs, textarea and the native select share heights and states. Native selects keep platform pickers and test compatibility."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-card border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="ds-name">Full name</Label>
            <Input id="ds-name" placeholder="Amaya Perera" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ds-email">Email</Label>
            <Input
              id="ds-email"
              type="email"
              defaultValue="not-an-email"
              aria-invalid="true"
              aria-describedby="ds-email-error"
            />
            <p id="ds-email-error" className="text-sm text-danger-ink">
              Enter a valid email address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ds-ref">Reference (read-only)</Label>
            <Input id="ds-ref" readOnly defaultValue="BKG-1791040158150" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ds-disabled">Disabled</Label>
            <Input id="ds-disabled" disabled defaultValue="Not editable" />
          </div>
        </div>

        <div className="space-y-4 rounded-card border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="ds-contact">Preferred contact method</Label>
            <NativeSelect id="ds-contact" defaultValue="EMAIL">
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Phone</option>
              <option value="EMAIL">Email</option>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ds-select-disabled">Disabled select</Label>
            <NativeSelect id="ds-select-disabled" disabled defaultValue="">
              <option value="">No guides available</option>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ds-notes">Notes</Label>
            <Textarea id="ds-notes" placeholder="Anything we should know about your trip?" />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-label">Options</legend>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="size-[18px]" />
              Include airport transfer
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="ds-pace" defaultChecked className="size-[18px]" />
              Relaxed pace
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="ds-pace" className="size-[18px]" />
              Active pace
            </label>
          </fieldset>
        </div>

        <div className="lg:col-span-2">
          <Subheading>Filter bar</Subheading>

          <FilterBar actions={<Button variant="outline">Reset</Button>}>
            <div className="space-y-2">
              <Label htmlFor="ds-filter-status">Status</Label>
              <NativeSelect id="ds-filter-status" defaultValue="">
                <option value="">All statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ds-filter-search">Search</Label>
              <Input id="ds-filter-search" placeholder="Traveler or reference" />
            </div>
          </FilterBar>
        </div>
      </div>
    </Section>
  );
}

function StatusSection() {
  return (
    <Section
      id="status"
      title="Status badges"
      description="Every domain status: icon + exact existing label + tone. Meaning never depends on color alone."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {(Object.keys(STATUS_TONES) as StatusEntity[]).map((entity) => (
          <div key={entity} className="rounded-card border bg-card p-5">
            <h3 className="text-heading-sm">{ENTITY_LABELS[entity]}</h3>

            <ul className="mt-3 flex flex-wrap gap-2" data-entity={entity}>
              {Object.keys(STATUS_TONES[entity]).map((status) => (
                <li key={status}>
                  <StatusBadge entity={entity} status={status} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CardsSection() {
  return (
    <Section
      id="cards"
      title="Cards"
      description="Default, interactive and media cards; stat cards and description lists for structured data."
    >
      <SectionHeader
        as="h3"
        className="mb-6"
        title="Section header"
        description="Title, supporting text and a trailing action."
        action={
          <a href="#cards" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
            <ArrowRight className="size-4" />
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle as="h3">Default card</CardTitle>
            <CardDescription>White surface, sand border, resting shadow.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-foreground-secondary">
              Card radius follows the area: 16px by default, 12px in admin.
            </p>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              Action
            </Button>
          </CardFooter>
        </Card>

        <a
          href="#cards"
          className="group block rounded-card border bg-card p-5 shadow-xs transition-shadow duration-fast hover:shadow-md"
        >
          <p className="text-overline text-tea-700">Interactive</p>
          <h3 className="mt-2 text-heading-md">Hover to lift</h3>
          <p className="mt-1 text-body-sm text-muted-foreground">
            The whole card is one link with a visible focus ring.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-tea-700">
            Open <ArrowRight className="size-4" />
          </span>
        </a>

        <div data-area="public" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="relative aspect-[4/3]">
            <Image
              src="/images/home/destinations/ella.jpg"
              alt="Nine Arches Bridge in Ella"
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
            <div data-surface="dark" className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-overline text-cinnamon-300">Hill country</p>
              <h3 className="mt-1 font-display text-display-md text-ivory">Ella</h3>
            </div>
          </div>
          <div className="p-5">
            <p className="text-body-sm text-muted-foreground">Media card · 24px radius · public</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          <StatCard label="Active requests" value="12" hint="3 need your reply" icon={FileText} />
          <StatCard label="Quotations" value="8" icon={ReceiptText} />
          <StatCard label="Payments" value="USD 4,300" icon={Wallet} />
          <StatCard label="Bookings" value="5" hint="2 upcoming" icon={CalendarCheck2} />
        </div>

        <div className="rounded-card border bg-card p-6 lg:col-span-3">
          <DescriptionList
            columns={3}
            items={[
              { term: "Traveler", value: "Amaya Perera", icon: UserRound },
              { term: "Destination", value: "Kandy, Nuwara Eliya and Ella", icon: MapPin },
              { term: "Travel dates", value: "Dec 5, 2026 → Dec 11, 2026", icon: CalendarDays },
              { term: "Travelers", value: "2 adults · 0 children", icon: Users },
              { term: "Budget", value: "USD 2400", icon: Wallet },
              { term: "Preferred guide", value: "No preference", icon: Star },
            ]}
          />
        </div>
      </div>
    </Section>
  );
}

function AlertsSection() {
  return (
    <Section id="alerts" title="Alerts" description="Inline feedback; tone + icon + text.">
      <div className="grid gap-3 lg:grid-cols-2">
        <Alert tone="info" title="Your request is under discussion">
          Our team will contact you on WhatsApp within one business day.
        </Alert>
        <Alert tone="success" title="Payment received">
          Your booking is confirmed.
        </Alert>
        <Alert tone="warning" title="Quotation expires soon">
          Review and accept before Oct 10, 2026 to keep this price.
        </Alert>
        <Alert tone="danger" title="Payment failed">
          Your card was declined. No money was taken.
        </Alert>
        <Alert tone="neutral" title="Draft saved">
          You can come back and finish this later.
        </Alert>
      </div>
    </Section>
  );
}

function LoadingSection() {
  return (
    <Section id="loading" title="Loading" description="Spinners for short waits; skeletons to preview list structure.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-card border bg-card p-6">
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" label="Loading example" />
        </div>

        <div className="space-y-3 rounded-card border bg-card p-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-32" />
        </div>

        <LoadingState label="Loading your trips" className="rounded-card border bg-card" />

        <div className="lg:col-span-3">
          <LoadingState variant="skeleton" rows={2} label="Loading bookings" />
        </div>
      </div>
    </Section>
  );
}

function EmptyStatesSection() {
  return (
    <Section id="empty-states" title="Empty & error states">
      <div className="grid gap-6 lg:grid-cols-2">
        <EmptyState
          title="No trips planned yet"
          description="Tell us where you would like to go and our team will design a journey around you."
          action={
            <a href="#empty-states" className={buttonVariants()}>
              <Plus className="size-4" />
              Plan a trip
            </a>
          }
        />

        <ErrorState
          title="We couldn't load your bookings"
          description="Check your connection and try again."
          onRetry={() => {
            toast.info("Retrying…");
          }}
        />
      </div>
    </Section>
  );
}

function DialogsSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [destructiveOpen, setDestructiveOpen] = useState(false);

  return (
    <Section
      id="dialogs"
      title="Dialogs & feedback"
      description="Dialog, confirmation (replaces window.confirm), drawer and toasts. All trap focus and close with Escape."
    >
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit travel dates</DialogTitle>
              <DialogDescription>Changes are shared with your trip planner.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="ds-dialog-date">Start date</Label>
              <Input id="ds-dialog-date" type="date" />
            </div>
            <DialogFooter>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          Confirm action
        </Button>

        <Button variant="destructive" onClick={() => setDestructiveOpen(true)}>
          Delete item
        </Button>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open drawer</SheetTrigger>
          <SheetContent side="right">
            <div className="p-4">
              <SheetTitle>Trip details</SheetTitle>
              <SheetDescription>Drawers are used for mobile navigation and side panels.</SheetDescription>
            </div>
          </SheetContent>
        </Sheet>

        <Button variant="secondary" onClick={() => toast.success("Quotation accepted")}>
          Success toast
        </Button>
        <Button variant="secondary" onClick={() => toast.error("Payment failed")}>
          Error toast
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send this quotation?"
        description="The traveler will be notified and can accept or reject it."
        confirmLabel="Send quotation"
        onConfirm={() => new Promise<void>((resolve) => setTimeout(resolve, 600))}
      />

      <ConfirmDialog
        open={destructiveOpen}
        onOpenChange={setDestructiveOpen}
        tone="destructive"
        title="Delete this FAQ?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          toast.success("Deleted");
        }}
      />
    </Section>
  );
}

function NavigationSection() {
  const previews = [
    {
      area: "traveler" as const,
      title: "Traveler Portal",
      mobileTitle: "Travora Traveler",
      homeHref: "/tourist",
      navigation: [
        { label: "Dashboard", href: "/tourist", icon: LayoutDashboard },
        { label: "My requests", href: "/tourist/requests", icon: FileText },
        { label: "Quotations", href: "/tourist/quotations", icon: ReceiptText },
      ],
      primaryAction: { label: "Plan a trip", href: "/tourist/requests/new", icon: Plus },
    },
    {
      area: "admin" as const,
      title: "Admin Portal",
      mobileTitle: "Travora Admin",
      homeHref: "/admin",
      navigation: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Tour requests", href: "/admin/tour-requests", icon: FileText },
        { label: "Packages", href: "/admin/packages", icon: Package },
      ],
    },
    {
      area: "guide" as const,
      title: "Guide Portal",
      mobileTitle: "Travora Guide",
      homeHref: "/guide",
      navigation: [
        { label: "Dashboard", href: "/guide", icon: LayoutDashboard },
        { label: "My reviews", href: "/guide/reviews", icon: Star },
      ],
    },
  ];

  return (
    <Section
      id="navigation"
      title="Navigation / shell"
      description="PortalShell previews (demo data). Sidebar from 1024px; below that a header toggle opens a modal drawer."
    >
      <div className="space-y-6">
        {previews.map((preview) => (
          <div key={preview.area} className="overflow-hidden rounded-card border shadow-sm">
            <PortalShell
              contained
              area={preview.area}
              title={preview.title}
              mobileTitle={preview.mobileTitle}
              homeHref={preview.homeHref}
              navigationLabel={`${preview.title} preview navigation`}
              toggleLabel={`Toggle ${preview.area} preview navigation`}
              navigation={preview.navigation}
              primaryAction={preview.primaryAction}
              footerLinks={[{ label: "View public site", href: "/", variant: "outline" }]}
              user={{ ...DEMO_USER, role: preview.area === "admin" ? "ADMIN" : preview.area === "guide" ? "TOUR_GUIDE" : "TOURIST" }}
              onLogout={() => {
                toast.info("Logout is disabled in the preview");
              }}
            >
              <div className="p-6">
                <PageHeader
                  overline={preview.area}
                  title={`${preview.title} content`}
                  description="Pages render here."
                  editorial={preview.area === "traveler"}
                />
              </div>
            </PortalShell>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AreasSection() {
  return (
    <Section
      id="areas"
      title="One system, four areas"
      description="The same tokens produce different treatments. These are previews only; pages adopt them in CR-029 to CR-031."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Public */}
        <div data-area="public" className="min-w-0 rounded-card border bg-background p-5">
          <p className="mb-3 text-overline text-tea-700">Public · immersive, editorial</p>

          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative aspect-[16/9]">
              <Image
                src="/images/home/destinations/galle.jpg"
                alt="Galle Fort lighthouse"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="space-y-2 p-5">
              <h3 className="font-display text-display-md">Southern Coast Escape</h3>
              <p className="text-body-sm text-muted-foreground">7 days · Galle, Mirissa and Yala</p>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm">
                  from <span className="text-heading-sm text-cinnamon-700">USD 1,450</span>
                </p>
                <Button>View journey</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Traveler */}
        <div data-area="traveler" className="min-w-0 rounded-card border bg-background p-5">
          <p className="mb-3 text-overline text-tea-700">Traveler · warm, journey-first</p>

          <div className="rounded-card border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-overline text-cinnamon-700">Upcoming trip</p>
                <h3 className="mt-1 font-display text-display-md">Kandy &amp; the hill country</h3>
              </div>
              <StatusBadge entity="booking" status="CONFIRMED" />
            </div>
            <p className="mt-2 text-body-sm text-muted-foreground">Dec 5 → Dec 11, 2026 · 2 travelers</p>
            <div className="mt-4 h-2 rounded-full bg-sand-200">
              <div className="h-2 w-2/3 rounded-full bg-tea-600" />
            </div>
            <p className="mt-2 text-caption text-muted-foreground">Payment complete · guide assigned</p>
            <Button className="mt-4">View itinerary</Button>
          </div>
        </div>

        {/* Admin */}
        <div data-area="admin" className="min-w-0 rounded-card border bg-background p-5">
          <p className="mb-3 text-overline text-tea-700">Admin · compact, data-first</p>

          <div className="overflow-x-auto rounded-card border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Recent bookings</caption>
              <thead className="border-b bg-sand-50 text-left text-caption text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Reference</th>
                  <th scope="col" className="px-3 py-2 font-medium">Traveler</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["BKG-1048", "Amaya Perera", "CONFIRMED", "USD 1175"],
                  ["BKG-1047", "Daniel Ross", "IN_PROGRESS", "USD 2400"],
                  ["BKG-1046", "Mei Tanaka", "CANCELLED", "USD 980"],
                ].map(([ref, name, status, amount]) => (
                  <tr key={ref} className="h-11 border-b last:border-0 hover:bg-sand-50">
                    <td className="px-3 font-mono text-xs">{ref}</td>
                    <td className="px-3">{name}</td>
                    <td className="px-3">
                      <StatusBadge entity="booking" status={status} />
                    </td>
                    <td className="px-3 text-right tabular-nums">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guide */}
        <div data-area="guide" className="min-w-0 rounded-card border bg-background p-5">
          <p className="mb-3 text-overline text-tea-700">Guide · mobile-first, task-first</p>

          <div className="rounded-card border bg-card p-5 shadow-sm">
            <p className="text-caption text-muted-foreground">Today · Day 2 of 6</p>
            <h3 className="mt-1 text-heading-md">Amaya&apos;s hill-country tour</h3>
            <p className="mt-1 text-body-sm text-muted-foreground">Kandy → Nuwara Eliya · 2 travelers</p>
            <Button size="xl" className="mt-5 w-full">
              Start tour
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

type ContrastSampleKind = NonNullable<ContrastPair["sample"]>;

const SAMPLE_SURFACE_SHADOW = "inset 0 0 0 1px rgb(0 0 0 / 0.06)";

/*
 * Text pairs are shown as text in the foreground color. Non-text
 * pairs (3:1) are shown as the element they measure -- a bordered
 * box, a focus ring or a filled graphic -- on the background color,
 * with the hex values beside them in regular muted text: their
 * foreground color is only rated for non-text UI, not for text.
 */
function ContrastSample({ kind, fg, bg }: { kind: ContrastSampleKind; fg: string; bg: string }) {
  if (kind === "text") {
    return (
      <span
        className="inline-flex rounded-sm px-2 py-0.5 font-mono text-xs"
        style={{ color: fg, background: bg, boxShadow: SAMPLE_SURFACE_SHADOW }}
      >
        {fg} / {bg}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        data-contrast-sample={kind}
        className="inline-flex h-7 w-14 shrink-0 items-center justify-center rounded-sm"
        style={{ background: bg, boxShadow: SAMPLE_SURFACE_SHADOW }}
      >
        {kind === "border" && <span className="block h-4 w-9 rounded-sm" style={{ border: `1px solid ${fg}` }} />}

        {kind === "ring" && (
          <span className="block h-3 w-8 rounded-sm" style={{ outline: `2px solid ${fg}`, outlineOffset: 2 }} />
        )}

        {kind === "graphic" && <span className="block size-3.5 rounded-full" style={{ background: fg }} />}
      </span>

      <span className="font-mono text-xs text-muted-foreground">
        {fg} / {bg}
      </span>
    </span>
  );
}

function ContrastSection() {
  const hydrated = useIsHydrated();

  const rows: Array<{
    label: string;
    ratio: number | null;
    required: number;
    sample: ContrastSampleKind;
    fg: string;
    bg: string;
  }> = [];

  if (hydrated) {
    const root = getComputedStyle(document.documentElement);

    const adminScope = document.querySelector('[data-area="admin"]');

    const admin = adminScope ? getComputedStyle(adminScope) : root;

    rows.push(
      ...CONTRAST_PAIRS.map((pair) => {
        const style = pair.area === "admin" ? admin : root;

        const fg = style.getPropertyValue(`--${pair.foreground}`).trim();

        const bg = style.getPropertyValue(`--${pair.background}`).trim();

        const a = parseColor(fg);

        const b = parseColor(bg);

        return {
          label: pair.label,
          required: pair.required,
          sample: pair.sample ?? "text",
          fg: a ? toHex(a) : fg,
          bg: b ? toHex(b) : bg,
          ratio: a && b ? contrastRatio(a, b) : null,
        };
      }),
    );
  }

  const failing = rows.filter((row) => row.ratio === null || row.ratio < row.required).length;

  return (
    <Section
      id="contrast"
      title="Contrast"
      description="WCAG 2.x ratios computed live from the shipped tokens. 4.5:1 for text, 3:1 for large text and non-text UI."
    >
      <p className="mb-4 text-body-sm" data-testid="contrast-summary" data-failing={failing} data-total={rows.length}>
        {rows.length === 0
          ? "Computing…"
          : failing === 0
            ? `All ${rows.length} pairs pass.`
            : `${failing} of ${rows.length} pairs fail.`}
      </p>

      <div className="overflow-x-auto rounded-card border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Token contrast pairs</caption>
          <thead className="border-b bg-sand-50 text-left text-caption text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Pair</th>
              <th scope="col" className="px-3 py-2 font-medium">Sample</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Ratio</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Required</th>
              <th scope="col" className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pass = row.ratio !== null && row.ratio >= row.required;

              return (
                <tr
                  key={row.label}
                  data-contrast-row={row.label}
                  data-ratio={row.ratio?.toFixed(2) ?? ""}
                  data-required={row.required}
                  data-sample={row.sample}
                  data-pass={pass}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">
                    <ContrastSample kind={row.sample} fg={row.fg} bg={row.bg} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.ratio?.toFixed(2) ?? "—"}:1</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.required}:1</td>
                  <td className="px-3 py-2">
                    <Badge variant={pass ? "success" : "danger"}>{pass ? "Pass" : "Fail"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- */

export function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-background">
      <SkipLink />

      <div className="border-b bg-card">
        <Container width="page" className="py-8">
          <PageHeader
            overline="CR-028 · development only"
            title="Travora Design System"
            description="Tokens, components and patterns for review and approval before page redesigns adopt them."
          />

          <nav aria-label="Design system sections" className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-flex h-9 items-center rounded-full border border-sand-300 bg-card px-3 text-sm text-foreground-secondary transition-colors hover:bg-sand-100 hover:text-foreground"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>

      <main id="main-content" tabIndex={-1} className="outline-none">
        <Container width="page">
          <PaletteSection />
          <TypographySection />
          <ButtonsSection />
          <FormsSection />
          <StatusSection />
          <CardsSection />
          <AlertsSection />
          <LoadingSection />
          <EmptyStatesSection />
          <DialogsSection />
          <NavigationSection />
          <AreasSection />
          <ContrastSection />
        </Container>
      </main>
    </div>
  );
}
