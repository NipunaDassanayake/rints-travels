"use client";

import { useState } from "react";

import { LoaderCircle, Save } from "lucide-react";

import type { CreatePackagePayload } from "@/features/packages/admin-package.api";

export type PackageFormValues = {
  title: string;
  slug: string;
  destination: string;
  description: string;
  durationDays: string;
  price: string;
  status: "ACTIVE" | "INACTIVE";
};

interface AdminPackageFormProps {
  initialValues?: Partial<PackageFormValues>;

  submitLabel?: string;

  isSubmitting?: boolean;

  onSubmit: (data: CreatePackagePayload) => Promise<void> | void;
}

const defaultValues: PackageFormValues = {
  title: "",
  slug: "",
  destination: "",
  description: "",
  durationDays: "",
  price: "",
  status: "ACTIVE",
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function AdminPackageForm({
  initialValues,
  submitLabel = "Save Package",
  isSubmitting = false,
  onSubmit,
}: AdminPackageFormProps) {
  const [values, setValues] = useState<PackageFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof PackageFormValues>(
    field: K,
    value: PackageFormValues[K],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const title = event.target.value;

    setValues((current) => ({
      ...current,

      title,

      slug: slugManuallyEdited ? current.slug : createSlug(title),
    }));
  };

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);

    updateField("slug", createSlug(event.target.value));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    const durationDays = Number(values.durationDays);

    const price = Number(values.price);

    if (
      !values.title.trim() ||
      !values.slug.trim() ||
      !values.destination.trim() ||
      !values.description.trim()
    ) {
      setError("Please complete all required fields.");

      return;
    }

    if (!Number.isInteger(durationDays) || durationDays < 1) {
      setError("Duration must be at least 1 day.");

      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than 0.");

      return;
    }

    await onSubmit({
      title: values.title.trim(),

      slug: values.slug.trim(),

      destination: values.destination.trim(),

      description: values.description.trim(),

      durationDays,

      price,

      status: values.status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic information */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Basic information</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            The main information travellers will see when browsing this package.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Package title
            </label>

            <input
              id="title"
              value={values.title}
              onChange={handleTitleChange}
              placeholder="Sri Lanka Signature Journey"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              URL slug
            </label>

            <input
              id="slug"
              value={values.slug}
              onChange={handleSlugChange}
              placeholder="sri-lanka-signature-journey"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              required
            />

            <p className="text-xs text-muted-foreground">
              Public URL: /packages/
              {values.slug || "your-package"}
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="destination" className="text-sm font-medium">
              Destination / route
            </label>

            <input
              id="destination"
              value={values.destination}
              onChange={(event) =>
                updateField("destination", event.target.value)
              }
              placeholder="Sigiriya • Kandy • Ella • Galle"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              required
            />

            <p className="text-xs text-muted-foreground">
              You can use this field for a single destination or the main route
              of the journey.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>

            <textarea
              id="description"
              value={values.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="A carefully designed journey combining Sri Lanka's ancient heritage, misty hill country and beautiful southern coast."
              rows={6}
              className="flex w-full rounded-md border border-input bg-background px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              required
            />

            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">
                {values.description.length} characters
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Duration & pricing</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Configure the advertised duration and starting price for this
            package.
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="durationDays" className="text-sm font-medium">
              Duration
            </label>

            <div className="relative">
              <input
                id="durationDays"
                type="number"
                min="1"
                step="1"
                value={values.durationDays}
                onChange={(event) =>
                  updateField("durationDays", event.target.value)
                }
                placeholder="7"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-16 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                required
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                days
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Starting price
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                USD
              </span>

              <input
                id="price"
                type="number"
                min="0.01"
                step="0.01"
                value={values.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="1050.00"
                className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-14 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </div>
        </div>
      </section>

      {/* Visibility */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Package visibility</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Decide whether travellers can currently discover this package.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => updateField("status", "ACTIVE")}
            className={`rounded-xl border p-4 text-left transition ${
              values.status === "ACTIVE"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-green-500" />

              <span className="font-medium">Active</span>
            </div>

            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Travellers can discover and view this package.
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateField("status", "INACTIVE")}
            className={`rounded-xl border p-4 text-left transition ${
              values.status === "INACTIVE"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-slate-400" />

              <span className="font-medium">Inactive</span>
            </div>

            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Keep the package hidden while you prepare or update it.
            </p>
          </button>
        </div>
      </section>

      <div className="flex justify-end border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}

          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}