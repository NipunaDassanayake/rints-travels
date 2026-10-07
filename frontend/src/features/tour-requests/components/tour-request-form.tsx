"use client";

import Link from "next/link";

import { useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { useForm, useWatch, type FieldPath } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { AxiosError } from "axios";

import { CircleAlert, Info, LoaderCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { NativeSelect } from "@/components/ui/native-select";

import { Textarea } from "@/components/ui/textarea";

import type { TravelPackage } from "@/features/packages/package.types";

import type { TourGuide } from "@/features/tour-guides/tour-guide.types";

import { formatMoney } from "@/lib/format";

import { cn } from "@/lib/utils";

import {
  createCustomTourRequest,
  createPackageBasedTourRequest,
} from "../tour-request.api";

import { FormField } from "./form-field";

import { PackageContextCard } from "./package-context-card";

import { RequestTypeField } from "./request-type-field";

/**
 * =========================================================
 * Validation (rules unchanged; limits match the API)
 * =========================================================
 */

const optionalNumber = z.string().optional();

const tourRequestSchema = z
  .object({
    requestType: z.enum(["PACKAGE_BASED", "CUSTOM"]),
    packageId: z.string().optional(),
    title: z.string().trim().max(200, "Trip title must be 200 characters or fewer").optional(),
    destinationPreferences: z.string().trim().optional(),
    preferredStartDate: z.string().min(1, "Preferred start date is required"),
    preferredEndDate: z.string().optional(),
    adultCount: z.string().min(1, "Adult count is required"),
    childCount: z.string().min(1, "Child count is required"),
    budget: optionalNumber,
    currency: z
      .string()
      .trim()
      .min(1, "Currency is required")
      .max(10, "Currency must be 10 characters or less"),
    preferredGuideId: z.string().optional(),
    hotelPreference: z.string().trim().max(100, "Hotel preference must be 100 characters or fewer").optional(),
    transportPreference: z
      .string()
      .trim()
      .max(100, "Transport preference must be 100 characters or fewer")
      .optional(),
    specialRequirements: z.string().trim().optional(),
    contactMethod: z.enum(["WHATSAPP", "PHONE", "EMAIL"]).or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const adults = Number(data.adultCount);

    const children = Number(data.childCount);

    if (!Number.isInteger(adults) || adults < 1) {
      ctx.addIssue({ code: "custom", path: ["adultCount"], message: "At least one adult is required" });
    }

    if (!Number.isInteger(children) || children < 0) {
      ctx.addIssue({ code: "custom", path: ["childCount"], message: "Child count cannot be negative" });
    }

    if (data.budget && Number(data.budget) <= 0) {
      ctx.addIssue({ code: "custom", path: ["budget"], message: "Budget must be greater than zero" });
    }

    if (data.preferredEndDate && new Date(data.preferredEndDate) < new Date(data.preferredStartDate)) {
      ctx.addIssue({ code: "custom", path: ["preferredEndDate"], message: "End date cannot be before start date" });
    }

    if (data.requestType === "PACKAGE_BASED" && !data.packageId) {
      ctx.addIssue({ code: "custom", path: ["packageId"], message: "Please select a travel package" });
    }

    if (data.requestType === "CUSTOM" && (!data.title || data.title.length < 3)) {
      ctx.addIssue({ code: "custom", path: ["title"], message: "Trip title must contain at least 3 characters" });
    }

    if (
      data.requestType === "CUSTOM" &&
      (!data.destinationPreferences || data.destinationPreferences.length < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationPreferences"],
        message: "Please enter your destination preferences",
      });
    }
  });

type TourRequestFormValues = z.infer<typeof tourRequestSchema>;

type FieldName = FieldPath<TourRequestFormValues>;

/** Fields in page order, with the element each error links to. */
const FIELD_ORDER: { name: FieldName; id: string }[] = [
  { name: "requestType", id: "requestType-PACKAGE_BASED" },
  { name: "packageId", id: "packageId" },
  { name: "title", id: "title" },
  { name: "destinationPreferences", id: "destinationPreferences" },
  { name: "preferredStartDate", id: "preferredStartDate" },
  { name: "preferredEndDate", id: "preferredEndDate" },
  { name: "adultCount", id: "adultCount" },
  { name: "childCount", id: "childCount" },
  { name: "budget", id: "budget" },
  { name: "currency", id: "currency" },
  { name: "preferredGuideId", id: "preferredGuideId" },
  { name: "hotelPreference", id: "hotelPreference" },
  { name: "transportPreference", id: "transportPreference" },
  { name: "contactMethod", id: "contactMethod" },
  { name: "specialRequirements", id: "specialRequirements" },
];

/**
 * =========================================================
 * Server errors -> traveler-facing messages
 * =========================================================
 *
 * The API answers 400 "Validation failed" with Joi messages such as
 * `"preferredEndDate" must be greater than or equal to ...`. Known
 * fields are mapped to plain messages (and marked on the field);
 * anything else falls back to a general message. Joi wording is
 * never shown.
 */
const SERVER_FIELD_MESSAGES: Partial<Record<FieldName, string>> = {
  packageId: "Please choose a travel package from the list.",
  title: "Trip title must be between 3 and 200 characters.",
  destinationPreferences: "Please tell us which places you would like to visit.",
  preferredStartDate: "Please enter a valid start date.",
  preferredEndDate: "The end date cannot be before the start date.",
  adultCount: "At least one adult is required.",
  childCount: "The number of children cannot be negative.",
  budget: "Budget must be greater than zero.",
  currency: "Currency must be 10 characters or fewer.",
  preferredGuideId: "Please choose a guide from the list.",
  hotelPreference: "Hotel preference must be 100 characters or fewer.",
  transportPreference: "Transport preference must be 100 characters or fewer.",
  contactMethod: "Please choose a contact method from the list.",
};

const PACKAGE_UNAVAILABLE =
  "That package is no longer available. Please choose another package or create a journey from scratch.";

const GUIDE_UNAVAILABLE =
  "That guide is not available right now. Please choose another guide or continue without one.";

const GENERAL_FAILURE = "We couldn't submit your request right now. Please try again in a moment.";

interface ServerProblem {
  messages: string[];
  fields: { name: FieldName; message: string }[];
}

function describeServerError(error: unknown): ServerProblem {
  if (!(error instanceof AxiosError) || !error.response) {
    return { messages: [GENERAL_FAILURE], fields: [] };
  }

  const { status, data } = error.response as {
    status: number;
    data?: { message?: string; errors?: unknown };
  };

  if (status === 404 && data?.message === "Travel package not found") {
    return { messages: [PACKAGE_UNAVAILABLE], fields: [{ name: "packageId", message: PACKAGE_UNAVAILABLE }] };
  }

  if (status === 404 && data?.message === "Available preferred tour guide not found") {
    return {
      messages: [GUIDE_UNAVAILABLE],
      fields: [{ name: "preferredGuideId", message: GUIDE_UNAVAILABLE }],
    };
  }

  if (status === 400 && Array.isArray(data?.errors)) {
    const fields: ServerProblem["fields"] = [];

    let unknown = false;

    for (const detail of data.errors) {
      const field = typeof detail === "string" ? detail.match(/^"([A-Za-z]+)"/)?.[1] : undefined;

      const message = field ? SERVER_FIELD_MESSAGES[field as FieldName] : undefined;

      if (field && message) {
        if (!fields.some((existing) => existing.name === field)) {
          fields.push({ name: field as FieldName, message });
        }
      } else {
        unknown = true;
      }
    }

    const messages = fields.map((field) => field.message);

    if (unknown || messages.length === 0) {
      messages.push("Some details could not be accepted. Please review the form and try again.");
    }

    return { messages, fields };
  }

  return { messages: [GENERAL_FAILURE], fields: [] };
}

/**
 * =========================================================
 * Component
 * =========================================================
 */

type TourRequestFormProps = {
  packages: TravelPackage[];
  guides: TourGuide[];
  initialPackageId?: string;
  initialGuideId?: string;
};

const SECTION = "rounded-card border bg-card p-5 sm:p-6";

function WhatHappensNext({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card border bg-sand-50 p-5", className)}>
      <h2 className="text-heading-sm text-foreground">What happens next</h2>

      <ol className="mt-3 space-y-3 text-body-sm text-foreground-secondary">
        <li>
          <span className="font-medium text-foreground">1. Travora reviews your request.</span> Our team works through
          your details with you.
        </li>
        <li>
          <span className="font-medium text-foreground">2. You receive a quotation.</span> A personalized itinerary
          and price appear in My Travora.
        </li>
        <li>
          <span className="font-medium text-foreground">3. Accept and pay to book.</span> If it suits you, accept the
          quotation and pay securely to confirm your booking.
        </li>
      </ol>

    </div>
  );
}

export function TourRequestForm({ packages, guides, initialPackageId, initialGuideId }: TourRequestFormProps) {
  const router = useRouter();

  const queryClient = useQueryClient();

  const availableGuides = useMemo(() => guides.filter((guide) => guide.isAvailable), [guides]);

  /**
   * Context from the URL is only used when it resolves to an option
   * the traveler can actually pick; otherwise it is cleared (never
   * submitted) and a notice explains why.
   */
  const initialPackage = initialPackageId
    ? (packages.find((travelPackage) => String(travelPackage.id) === initialPackageId) ?? null)
    : null;

  const packageNotice = Boolean(initialPackageId) && !initialPackage;

  const initialGuide = initialGuideId
    ? (availableGuides.find((guide) => guide.id === initialGuideId) ?? null)
    : null;

  const guideNotice = Boolean(initialGuideId) && !initialGuide;

  const [serverProblem, setServerProblem] = useState<string[] | null>(null);

  // One create request per submission: the ref blocks re-entry
  // synchronously; `submitted` keeps the form locked after success
  // until navigation completes.
  const submissionLock = useRef(false);

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<TourRequestFormValues>({
    resolver: zodResolver(tourRequestSchema),
    shouldFocusError: true,
    defaultValues: {
      requestType: initialPackageId ? "PACKAGE_BASED" : "CUSTOM",
      packageId: initialPackage ? String(initialPackage.id) : "",
      preferredGuideId: initialGuide?.id ?? "",
      title: "",
      destinationPreferences: "",
      preferredStartDate: "",
      preferredEndDate: "",
      adultCount: "1",
      childCount: "0",
      budget: "",
      currency: "USD",
      hotelPreference: "",
      transportPreference: "",
      specialRequirements: "",
      contactMethod: "",
    },
  });

  const requestType = useWatch({ control, name: "requestType" });

  const selectedPackageId = useWatch({ control, name: "packageId" });

  const selectedGuideId = useWatch({ control, name: "preferredGuideId" });

  const selectedPackage =
    packages.find((travelPackage) => String(travelPackage.id) === selectedPackageId) ?? null;

  const selectedGuide = availableGuides.find((guide) => guide.id === selectedGuideId) ?? null;

  const cancelHref = initialPackage ? `/packages/${initialPackage.slug}` : "/tourist/requests";

  const onSubmit = async (values: TourRequestFormValues) => {
    if (submissionLock.current) {
      return;
    }

    // Only selectable options are ever submitted.
    if (values.requestType === "PACKAGE_BASED" && !selectedPackage) {
      setError("packageId", { type: "manual", message: "Please select a travel package" });

      setFocus("packageId");

      return;
    }

    if (values.preferredGuideId && !selectedGuide) {
      setError("preferredGuideId", { type: "manual", message: "Please choose a guide from the list" });

      setFocus("preferredGuideId");

      return;
    }

    submissionLock.current = true;

    try {
      setServerProblem(null);

      const commonData = {
        preferredStartDate: values.preferredStartDate,
        preferredEndDate: values.preferredEndDate || null,
        adultCount: Number(values.adultCount),
        childCount: Number(values.childCount),
        budget: values.budget ? Number(values.budget) : null,
        currency: values.currency.trim().toUpperCase(),
        preferredGuideId: values.preferredGuideId || null,
        hotelPreference: values.hotelPreference || null,
        transportPreference: values.transportPreference || null,
        specialRequirements: values.specialRequirements || null,
        contactMethod: values.contactMethod || null,
      };

      const createdRequest =
        values.requestType === "PACKAGE_BASED"
          ? await createPackageBasedTourRequest({
              packageId: Number(values.packageId),
              ...commonData,
            })
          : await createCustomTourRequest({
              title: values.title!.trim(),
              destinationPreferences: values.destinationPreferences!.trim(),
              ...commonData,
            });

      setSubmitted(true);

      // The new request is the root of a new journey: refresh the
      // traveler's request list used by My journeys and the dashboard.
      await queryClient.invalidateQueries({ queryKey: ["tour-requests", "me"] });

      router.push(`/tourist/requests/${createdRequest.id}`);
    } catch (error) {
      submissionLock.current = false;

      const problem = describeServerError(error);

      for (const field of problem.fields) {
        setError(field.name, { type: "server", message: field.message });
      }

      setServerProblem(problem.messages);
    }
  };

  const fieldError = (name: FieldName) => errors[name]?.message as string | undefined;

  const summary =
    submitCount > 0 && !serverProblem
      ? FIELD_ORDER.filter(({ name }) => errors[name]?.message).map(({ name, id }) => ({
          id,
          message: errors[name]!.message as string,
        }))
      : [];

  const locked = isSubmitting || submitted;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        // A new attempt replaces any previous server message.
        setServerProblem(null);

        return handleSubmit(onSubmit)(event);
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
        {/* Context: compact first on phones, a sticky side panel on desktop. */}
        <aside aria-label="Journey context" className="lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-6">
            {requestType === "PACKAGE_BASED" && selectedPackage ? (
              <PackageContextCard travelPackage={selectedPackage} />
            ) : (
              requestType === "CUSTOM" && (
                <div className="hidden rounded-card border bg-card p-5 lg:block">
                  <p className="text-overline text-tea-700">Your custom journey</p>

                  <p className="mt-2 text-body-sm text-foreground-secondary">
                    Tell us where you would like to go and what matters to you. Travora designs the itinerary around
                    your dates, travelers and budget.
                  </p>
                </div>
              )
            )}

            <WhatHappensNext className="hidden lg:block" />
          </div>
        </aside>

        <div className="space-y-4 sm:space-y-6 lg:order-1">
          {summary.length > 0 && (
            <div
              role="alert"
              data-testid="error-summary"
              className="rounded-card border border-danger-border bg-danger-soft p-4"
            >
              <p className="flex items-center gap-2 font-medium text-foreground">
                <CircleAlert aria-hidden="true" className="size-5 text-danger-ink" />
                Please check {summary.length === 1 ? "this field" : `these ${summary.length} fields`}
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-9 text-body-sm">
                {summary.map(({ id, message }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="text-danger-ink underline underline-offset-4">
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 1. How would you like to start? */}
          <section className={SECTION}>
            <RequestTypeField value={requestType} registration={register("requestType")} />
          </section>

          {/* 2. Your journey */}
          <section aria-labelledby="section-journey" className={SECTION}>
            <h2 id="section-journey" className="text-heading-md text-foreground">
              Your journey
            </h2>

            {requestType === "PACKAGE_BASED" ? (
              <div className="mt-4 space-y-4">
                {packageNotice && (
                  <p
                    role="status"
                    data-testid="package-notice"
                    className="flex gap-2 rounded-md border border-info-border bg-info-soft p-3 text-body-sm text-info-ink"
                  >
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    We couldn&apos;t find that package among the journeys currently available. Choose another package
                    below or create a journey from scratch.
                  </p>
                )}

                <FormField
                  id="packageId"
                  label="Travel package"
                  hint="Your preferences below are sent to our team, who personalize this journey for you."
                  error={fieldError("packageId")}
                >
                  {(aria) => (
                    <NativeSelect {...aria} {...register("packageId")}>
                      <option value="">{packages.length ? "Select a package" : "No packages available"}</option>
                      {packages.map((travelPackage) => (
                        <option key={travelPackage.id} value={travelPackage.id}>
                          {travelPackage.title}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <FormField id="title" label="Trip title" error={fieldError("title")}>
                  {(aria) => <Input {...aria} maxLength={200} placeholder="My Sri Lanka adventure" {...register("title")} />}
                </FormField>

                <FormField
                  id="destinationPreferences"
                  label="Destination preferences"
                  hint="Places, regions or experiences you have in mind."
                  error={fieldError("destinationPreferences")}
                >
                  {(aria) => (
                    <Textarea
                      {...aria}
                      rows={3}
                      placeholder="Example: Kandy, Ella, Mirissa, Yala, Sigiriya..."
                      {...register("destinationPreferences")}
                    />
                  )}
                </FormField>
              </div>
            )}
          </section>

          {/* 3. When are you travelling? */}
          <section aria-labelledby="section-dates" className={SECTION}>
            <h2 id="section-dates" className="text-heading-md text-foreground">
              When are you travelling?
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField id="preferredStartDate" label="Preferred start date" error={fieldError("preferredStartDate")}>
                {(aria) => <Input {...aria} type="date" {...register("preferredStartDate")} />}
              </FormField>

              <FormField
                id="preferredEndDate"
                label="Preferred end date"
                optional
                hint="Leave empty if your dates are flexible."
                error={fieldError("preferredEndDate")}
              >
                {(aria) => <Input {...aria} type="date" {...register("preferredEndDate")} />}
              </FormField>
            </div>
          </section>

          {/* 4. Who is travelling? */}
          <section aria-labelledby="section-travelers" className={SECTION}>
            <h2 id="section-travelers" className="text-heading-md text-foreground">
              Who is travelling?
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <FormField id="adultCount" label="Adults" error={fieldError("adultCount")}>
                {(aria) => <Input {...aria} type="number" min="1" inputMode="numeric" {...register("adultCount")} />}
              </FormField>

              <FormField id="childCount" label="Children" error={fieldError("childCount")}>
                {(aria) => <Input {...aria} type="number" min="0" inputMode="numeric" {...register("childCount")} />}
              </FormField>
            </div>
          </section>

          {/* 5. Budget */}
          <section aria-labelledby="section-budget" className={SECTION}>
            <h2 id="section-budget" className="text-heading-md text-foreground">
              Budget
            </h2>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_7rem] gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <FormField
                id="budget"
                label="Approximate budget"
                optional
                hint={
                  requestType === "PACKAGE_BASED" && selectedPackage
                    ? `This package starts from ${formatMoney(selectedPackage.price, "USD")}.`
                    : "An approximate budget helps our team prepare a realistic quotation."
                }
                error={fieldError("budget")}
              >
                {(aria) => <Input {...aria} type="number" min="1" inputMode="decimal" {...register("budget")} />}
              </FormField>

              <FormField id="currency" label="Currency" hint="For example USD." error={fieldError("currency")}>
                {(aria) => <Input {...aria} maxLength={10} autoCapitalize="characters" {...register("currency")} />}
              </FormField>
            </div>
          </section>

          {/* 6. Preferences */}
          <section aria-labelledby="section-preferences" className={SECTION}>
            <h2 id="section-preferences" className="text-heading-md text-foreground">
              Preferences
            </h2>

            <div className="mt-4 space-y-4">
              {guideNotice && (
                <p
                  role="status"
                  data-testid="guide-notice"
                  className="flex gap-2 rounded-md border border-info-border bg-info-soft p-3 text-body-sm text-info-ink"
                >
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  The guide you selected isn&apos;t available right now. Choose another guide or continue without one.
                </p>
              )}

              <FormField
                id="preferredGuideId"
                label="Preferred tour guide"
                optional
                error={fieldError("preferredGuideId")}
              >
                {(aria) => (
                  <NativeSelect {...aria} {...register("preferredGuideId")}>
                    <option value="">No preference</option>
                    {availableGuides.map((guide) => (
                      <option key={guide.id} value={guide.id}>
                        {guide.user.firstName} {guide.user.lastName}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>

              {selectedGuide && (
                <p className="rounded-md bg-sand-50 px-4 py-3 text-body-sm text-foreground-secondary">
                  <span className="font-medium text-foreground">
                    {selectedGuide.user.firstName} {selectedGuide.user.lastName}
                  </span>
                  {" · "}
                  {selectedGuide.experienceYears} {selectedGuide.experienceYears === 1 ? "year" : "years"} experience
                  {selectedGuide.languages.length > 0 ? ` · ${selectedGuide.languages.join(", ")}` : ""}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="hotelPreference"
                  label="Hotel preference"
                  optional
                  error={fieldError("hotelPreference")}
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      maxLength={100}
                      placeholder="3-star, boutique, luxury..."
                      {...register("hotelPreference")}
                    />
                  )}
                </FormField>

                <FormField
                  id="transportPreference"
                  label="Transport preference"
                  optional
                  error={fieldError("transportPreference")}
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      maxLength={100}
                      placeholder="Private car, van, train..."
                      {...register("transportPreference")}
                    />
                  )}
                </FormField>
              </div>

              <FormField
                id="contactMethod"
                label="Preferred contact method"
                optional
                error={fieldError("contactMethod")}
              >
                {(aria) => (
                  <NativeSelect {...aria} {...register("contactMethod")}>
                    <option value="">No preference</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="PHONE">Phone</option>
                    <option value="EMAIL">Email</option>
                  </NativeSelect>
                )}
              </FormField>
            </div>
          </section>

          {/* 7. Anything else? */}
          <section aria-labelledby="section-else" className={SECTION}>
            <h2 id="section-else" className="text-heading-md text-foreground">
              Anything else?
            </h2>

            <FormField
              id="specialRequirements"
              label="Special requirements"
              optional
              className="mt-4"
              error={fieldError("specialRequirements")}
            >
              {(aria) => (
                <Textarea
                  {...aria}
                  rows={4}
                  placeholder="Vegetarian meals, accessibility requirements, honeymoon arrangements, activities you want to include..."
                  {...register("specialRequirements")}
                />
              )}
            </FormField>
          </section>

          {/* 8. Submit */}
          <WhatHappensNext className="lg:hidden" />

          {serverProblem && (
            <div
              role="alert"
              data-testid="server-error"
              className="rounded-card border border-danger-border bg-danger-soft p-4"
            >
              <p className="flex items-center gap-2 font-medium text-foreground">
                <CircleAlert aria-hidden="true" className="size-5 text-danger-ink" />
                We couldn&apos;t submit your request
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-9 text-body-sm text-danger-ink">
                {serverProblem.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </Link>

            <div className="flex flex-col gap-2 sm:items-end">
              <Button type="submit" size="lg" disabled={locked} className="w-full sm:w-auto">
                {locked && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {locked ? "Submitting..." : "Submit tour request"}
              </Button>

              <p className="text-caption text-muted-foreground">
                No booking or payment is made until you accept a quotation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
