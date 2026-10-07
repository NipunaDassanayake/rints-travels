"use client";

import { useState } from "react";

import { LoaderCircle, Save } from "lucide-react";

import type {
  CreateTourGuidePayload,
  UpdateTourGuidePayload,
} from "@/features/tour-guides/admin-tour-guide.api";

export type TourGuideFormMode = "create" | "edit";

export type TourGuideFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  bio: string;
  experienceYears: string;
  languages: string;
  specializations: string;
  location: string;
  dailyRate: string;
  isAvailable: boolean;
};

interface AdminTourGuideFormProps {
  mode: TourGuideFormMode;

  initialValues?: Partial<TourGuideFormValues>;

  submitLabel?: string;

  isSubmitting?: boolean;

  onSubmit: (
    data: CreateTourGuidePayload | UpdateTourGuidePayload,
  ) => Promise<void> | void;
}

const defaultValues: TourGuideFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  bio: "",
  experienceYears: "0",
  languages: "",
  specializations: "",
  location: "",
  dailyRate: "",
  isAvailable: true,
};

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const textareaClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminTourGuideForm({
  mode,
  initialValues,
  submitLabel = "Save guide",
  isSubmitting = false,
  onSubmit,
}: AdminTourGuideFormProps) {
  const [values, setValues] = useState<TourGuideFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof TourGuideFormValues>(
    field: K,
    value: TourGuideFormValues[K],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError("First and last name are required.");

      return;
    }

    if (mode === "create" && !values.email.trim()) {
      setError("Email is required.");

      return;
    }

    if (mode === "create" && !PASSWORD_PATTERN.test(values.password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
      );

      return;
    }

    const languages = parseList(values.languages);

    if (languages.length === 0) {
      setError("At least one language is required.");

      return;
    }

    const experienceYears = Number(values.experienceYears);

    if (!Number.isInteger(experienceYears) || experienceYears < 0) {
      setError("Experience must be a whole number of years (0 or more).");

      return;
    }

    const dailyRateInput = values.dailyRate.trim();

    const dailyRate = dailyRateInput ? Number(dailyRateInput) : null;

    if (dailyRate !== null && (!Number.isFinite(dailyRate) || dailyRate <= 0)) {
      setError("Daily rate must be a positive number.");

      return;
    }

    const specializations = parseList(values.specializations);

    if (mode === "create") {
      const payload: CreateTourGuidePayload = {
        firstName: values.firstName.trim(),

        lastName: values.lastName.trim(),

        email: values.email.trim(),

        phone: values.phone.trim() || null,

        password: values.password,

        bio: values.bio.trim() || null,

        experienceYears,

        languages,

        specializations,

        location: values.location.trim() || null,

        dailyRate,

        isAvailable: values.isAvailable,
      };

      await onSubmit(payload);

      return;
    }

    const payload: UpdateTourGuidePayload = {
      firstName: values.firstName.trim(),

      lastName: values.lastName.trim(),

      phone: values.phone.trim() || null,

      bio: values.bio.trim() || null,

      experienceYears,

      languages,

      specializations,

      location: values.location.trim() || null,

      dailyRate,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Identity */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Guide identity</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Basic account information for this tour guide.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              First name
            </label>

            <input
              id="firstName"
              value={values.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder="Nimal"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium">
              Last name
            </label>

            <input
              id="lastName"
              value={values.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder="Perera"
              className={inputClass}
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="guide@travora.com"
                className={inputClass}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone
            </label>

            <input
              id="phone"
              value={values.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+94 71 234 5678"
              className={inputClass}
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="password" className="text-sm font-medium">
                Temporary password
              </label>

              <input
                id="password"
                type="password"
                value={values.password}
                onChange={(event) => updateField("password", event.target.value)}
                className={inputClass}
                required
              />

              <p className="text-xs text-muted-foreground">
                At least 8 characters, including an uppercase letter, a
                lowercase letter, and a number.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Profile */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Guide profile</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Information shown to travellers and used for guide selection.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>

            <textarea
              id="bio"
              value={values.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              placeholder="A brief introduction highlighting this guide's experience and specialties."
              rows={4}
              className={textareaClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="experienceYears" className="text-sm font-medium">
              Experience
            </label>

            <div className="relative">
              <input
                id="experienceYears"
                type="number"
                min="0"
                step="1"
                value={values.experienceYears}
                onChange={(event) =>
                  updateField("experienceYears", event.target.value)
                }
                className={`${inputClass} pr-14`}
                required
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                years
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="dailyRate" className="text-sm font-medium">
              Daily rate
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                USD
              </span>

              <input
                id="dailyRate"
                type="number"
                min="0.01"
                step="0.01"
                value={values.dailyRate}
                onChange={(event) => updateField("dailyRate", event.target.value)}
                placeholder="Optional"
                className={`${inputClass} pl-14`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>

            <input
              id="location"
              value={values.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Kandy, Sri Lanka"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="languages" className="text-sm font-medium">
              Languages
            </label>

            <input
              id="languages"
              value={values.languages}
              onChange={(event) => updateField("languages", event.target.value)}
              placeholder="English, Sinhala, German"
              className={inputClass}
              required
            />

            <p className="text-xs text-muted-foreground">
              Comma-separated. At least one language is required.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="specializations" className="text-sm font-medium">
              Specializations
            </label>

            <input
              id="specializations"
              value={values.specializations}
              onChange={(event) =>
                updateField("specializations", event.target.value)
              }
              placeholder="Wildlife safaris, Cultural heritage, Hiking"
              className={inputClass}
            />

            <p className="text-xs text-muted-foreground">
              Comma-separated. Optional.
            </p>
          </div>
        </div>
      </section>

      {/* Initial availability (create only) */}
      {mode === "create" && (
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Initial availability</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Availability can be changed later from the guide list. It does
              not affect account access.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateField("isAvailable", true)}
              className={`rounded-xl border p-4 text-left transition ${
                values.isAvailable
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full bg-green-500" />

                <span className="font-medium">Available</span>
              </div>

              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Eligible for new bookings right away.
              </p>
            </button>

            <button
              type="button"
              onClick={() => updateField("isAvailable", false)}
              className={`rounded-xl border p-4 text-left transition ${
                !values.isAvailable
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full bg-slate-400" />

                <span className="font-medium">Unavailable</span>
              </div>

              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Not offered for new bookings until marked available.
              </p>
            </button>
          </div>
        </section>
      )}

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
