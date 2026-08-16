"use client";

import Image from "next/image";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { AxiosError } from "axios";

import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Hotel,
  LoaderCircle,
  MapPin,
  Route,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import type { TravelPackage } from "@/features/packages/package.types";

import type { TourGuide } from "@/features/tour-guides/tour-guide.types";

import {
  createCustomTourRequest,
  createPackageBasedTourRequest,
} from "../tour-request.api";

/**
 * =========================================================
 * Validation
 * =========================================================
 */

const optionalNumber = z.string().optional();

const tourRequestSchema = z
  .object({
    requestType: z.enum(["PACKAGE_BASED", "CUSTOM"]),

    packageId: z.string().optional(),

    title: z.string().trim().optional(),

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

    hotelPreference: z.string().trim().optional(),

    transportPreference: z.string().trim().optional(),

    specialRequirements: z.string().trim().optional(),

    contactMethod: z.enum(["WHATSAPP", "PHONE", "EMAIL"]).or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const adults = Number(data.adultCount);

    const children = Number(data.childCount);

    if (!Number.isInteger(adults) || adults < 1) {
      ctx.addIssue({
        code: "custom",

        path: ["adultCount"],

        message: "At least one adult is required",
      });
    }

    if (!Number.isInteger(children) || children < 0) {
      ctx.addIssue({
        code: "custom",

        path: ["childCount"],

        message: "Child count cannot be negative",
      });
    }

    if (data.budget && Number(data.budget) <= 0) {
      ctx.addIssue({
        code: "custom",

        path: ["budget"],

        message: "Budget must be greater than zero",
      });
    }

    if (
      data.preferredEndDate &&
      new Date(data.preferredEndDate) < new Date(data.preferredStartDate)
    ) {
      ctx.addIssue({
        code: "custom",

        path: ["preferredEndDate"],

        message: "End date cannot be before start date",
      });
    }

    if (data.requestType === "PACKAGE_BASED" && !data.packageId) {
      ctx.addIssue({
        code: "custom",

        path: ["packageId"],

        message: "Please select a travel package",
      });
    }

    if (
      data.requestType === "CUSTOM" &&
      (!data.title || data.title.length < 3)
    ) {
      ctx.addIssue({
        code: "custom",

        path: ["title"],

        message: "Trip title must contain at least 3 characters",
      });
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

/**
 * =========================================================
 * Props
 * =========================================================
 */

type TourRequestFormProps = {
  packages: TravelPackage[];

  guides: TourGuide[];

  initialPackageId?: string;

  initialGuideId?: string;
};

/**
 * =========================================================
 * Component
 * =========================================================
 */

export function TourRequestForm({
  packages,
  guides,
  initialPackageId,
  initialGuideId,
}: TourRequestFormProps) {
  const router = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);

  const defaultRequestType: "PACKAGE_BASED" | "CUSTOM" = initialPackageId
    ? "PACKAGE_BASED"
    : "CUSTOM";

  const {
    register,
    handleSubmit,
    control,

    formState: { errors, isSubmitting },
  } = useForm<TourRequestFormValues>({
    resolver: zodResolver(tourRequestSchema),

    defaultValues: {
      requestType: defaultRequestType,

      packageId: initialPackageId ?? "",

      preferredGuideId: initialGuideId ?? "",

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

  /**
   * =========================================================
   * Watch fields
   * =========================================================
   */

  const requestType = useWatch({
    control,

    name: "requestType",
  });

  const selectedPackageId = useWatch({
    control,

    name: "packageId",
  });

  const selectedGuideId = useWatch({
    control,

    name: "preferredGuideId",
  });

  /**
   * =========================================================
   * Selected entities
   * =========================================================
   */

  const selectedPackage = useMemo(
    () =>
      packages.find(
        (travelPackage) => String(travelPackage.id) === selectedPackageId,
      ),
    [packages, selectedPackageId],
  );

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedGuideId),
    [guides, selectedGuideId],
  );

  const selectedPackageImage = selectedPackage
    ? (selectedPackage.images.find((image) => image.isPrimary) ??
      selectedPackage.images[0])
    : null;

  const selectedPackageImageUrl = selectedPackageImage
    ? getPackageImageUrl(selectedPackageImage.imageUrl)
    : null;

  /**
   * =========================================================
   * Submit
   * =========================================================
   */

  const onSubmit = async (values: TourRequestFormValues) => {
    try {
      setServerError(null);

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

      let createdRequest;

      if (values.requestType === "PACKAGE_BASED") {
        createdRequest = await createPackageBasedTourRequest({
          packageId: Number(values.packageId),

          ...commonData,
        });
      } else {
        createdRequest = await createCustomTourRequest({
          title: values.title!.trim(),

          destinationPreferences: values.destinationPreferences!.trim(),

          ...commonData,
        });
      }

      router.push(`/tourist/requests/${createdRequest.id}`);
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message ??
            "Unable to submit your tour request.",
        );

        return;
      }

      setServerError("Unable to submit your tour request.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* =====================================================
          REQUEST TYPE
      ===================================================== */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Route className="size-5 text-primary" />

          <h2 className="text-xl font-semibold">
            How would you like to start?
          </h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Customize one of our existing journeys or ask us to design something
          completely new.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-xl border p-4 transition ${
              requestType === "PACKAGE_BASED"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/40"
            }`}
          >
            <div className="flex gap-3">
              <input
                type="radio"
                value="PACKAGE_BASED"
                {...register("requestType")}
                className="mt-1"
              />

              <div>
                <p className="font-medium">Customize a package</p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Start from an existing Travora journey and personalize the
                  dates, travelers, accommodation, guide and experiences.
                </p>
              </div>
            </div>
          </label>

          <label
            className={`cursor-pointer rounded-xl border p-4 transition ${
              requestType === "CUSTOM"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/40"
            }`}
          >
            <div className="flex gap-3">
              <input
                type="radio"
                value="CUSTOM"
                {...register("requestType")}
                className="mt-1"
              />

              <div>
                <p className="font-medium">Create from scratch</p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Tell us what you have in mind and our team will design a
                  completely custom Sri Lanka journey.
                </p>
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* =====================================================
          PACKAGE
      ===================================================== */}

      {requestType === "PACKAGE_BASED" && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />

            <h2 className="text-xl font-semibold">Selected journey</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Use this journey as your starting point. Your preferences below will
            be sent to our team for customization.
          </p>

          {/* Selected package card */}

          {selectedPackage && (
            <div className="mt-5 overflow-hidden rounded-2xl border">
              <div className="grid md:grid-cols-[220px_1fr]">
                <div className="relative min-h-[180px] bg-muted">
                  {selectedPackageImage && selectedPackageImageUrl ? (
                    <Image
                      src={selectedPackageImageUrl}
                      alt={
                        selectedPackageImage.altText ?? selectedPackage.title
                      }
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 220px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center p-5 text-sm text-muted-foreground">
                      No image available
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold">
                    {selectedPackage.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" />

                      {selectedPackage.destination}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-4" />
                      {selectedPackage.durationDays}{" "}
                      {selectedPackage.durationDays === 1 ? "day" : "days"}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {selectedPackage.description}
                  </p>

                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Starting from
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      ${selectedPackage.price}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Package selector */}

          <div className="mt-5 space-y-2">
            <Label htmlFor="packageId">Travel package</Label>

            <select
              id="packageId"
              {...register("packageId")}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a package</option>

              {packages.map((travelPackage) => (
                <option key={travelPackage.id} value={travelPackage.id}>
                  {travelPackage.title}
                </option>
              ))}
            </select>

            {errors.packageId && (
              <p className="text-sm text-destructive">
                {errors.packageId.message}
              </p>
            )}

            {initialPackageId && selectedPackage && (
              <p className="text-xs text-muted-foreground">
                This package was selected from the journey page. You can change
                it if you prefer another package.
              </p>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          CUSTOM REQUEST
      ===================================================== */}

      {requestType === "CUSTOM" && (
        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Your custom journey</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Give us a starting idea and we&apos;ll shape the itinerary with
              you.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Trip title</Label>

            <Input
              id="title"
              placeholder="My Sri Lanka adventure"
              {...register("title")}
            />

            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationPreferences">
              Destination preferences
            </Label>

            <Textarea
              id="destinationPreferences"
              placeholder="Example: Kandy, Ella, Mirissa, Yala, Sigiriya..."
              rows={4}
              {...register("destinationPreferences")}
            />

            {errors.destinationPreferences && (
              <p className="text-sm text-destructive">
                {errors.destinationPreferences.message}
              </p>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          DATES
      ===================================================== */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />

          <h2 className="text-xl font-semibold">Travel dates</h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Tell us when you would like to travel. The end date can remain
          flexible if your plans are not final.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredStartDate">Preferred start date</Label>

            <Input
              id="preferredStartDate"
              type="date"
              {...register("preferredStartDate")}
            />

            {errors.preferredStartDate && (
              <p className="text-sm text-destructive">
                {errors.preferredStartDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredEndDate">Preferred end date</Label>

            <Input
              id="preferredEndDate"
              type="date"
              {...register("preferredEndDate")}
            />

            {errors.preferredEndDate && (
              <p className="text-sm text-destructive">
                {errors.preferredEndDate.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          TRAVELERS
      ===================================================== */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />

          <h2 className="text-xl font-semibold">Travelers</h2>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adultCount">Adults</Label>

            <Input
              id="adultCount"
              type="number"
              min="1"
              {...register("adultCount")}
            />

            {errors.adultCount && (
              <p className="text-sm text-destructive">
                {errors.adultCount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="childCount">Children</Label>

            <Input
              id="childCount"
              type="number"
              min="0"
              {...register("childCount")}
            />

            {errors.childCount && (
              <p className="text-sm text-destructive">
                {errors.childCount.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          BUDGET
      ===================================================== */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="size-5 text-primary" />

          <h2 className="text-xl font-semibold">Budget</h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          An approximate budget helps our team prepare a realistic quotation.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="budget">Approximate budget</Label>

            <Input
              id="budget"
              type="number"
              min="1"
              placeholder={
                selectedPackage ? String(selectedPackage.price) : "2000"
              }
              {...register("budget")}
            />

            {errors.budget && (
              <p className="text-sm text-destructive">
                {errors.budget.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>

            <Input id="currency" maxLength={10} {...register("currency")} />

            {errors.currency && (
              <p className="text-sm text-destructive">
                {errors.currency.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          PREFERENCES
      ===================================================== */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Travel preferences</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          These details are optional, but they help us personalize the proposal.
        </p>

        {/* Guide */}

        <div className="mt-6 space-y-2">
          <Label htmlFor="preferredGuideId">Preferred tour guide</Label>

          <select
            id="preferredGuideId"
            {...register("preferredGuideId")}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No preference</option>

            {guides
              .filter((guide) => guide.isAvailable)
              .map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.user.firstName} {guide.user.lastName}
                </option>
              ))}
          </select>

          {selectedGuide && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {selectedGuide.user.firstName} {selectedGuide.user.lastName}
              </p>

              <p className="mt-1">
                {selectedGuide.experienceYears}{" "}
                {selectedGuide.experienceYears === 1 ? "year" : "years"}{" "}
                experience
                {selectedGuide.languages.length > 0
                  ? ` · ${selectedGuide.languages.join(", ")}`
                  : ""}
              </p>
            </div>
          )}
        </div>

        {/* Hotel + transport */}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hotelPreference">Hotel preference</Label>

            <div className="relative">
              <Hotel className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="hotelPreference"
                placeholder="3-star, boutique, luxury..."
                className="pl-9"
                {...register("hotelPreference")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transportPreference">Transport preference</Label>

            <div className="relative">
              <Route className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="transportPreference"
                placeholder="Private car, van, train..."
                className="pl-9"
                {...register("transportPreference")}
              />
            </div>
          </div>
        </div>

        {/* Contact */}

        <div className="mt-6 space-y-2">
          <Label htmlFor="contactMethod">Preferred contact method</Label>

          <select
            id="contactMethod"
            {...register("contactMethod")}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No preference</option>

            <option value="WHATSAPP">WhatsApp</option>

            <option value="PHONE">Phone</option>

            <option value="EMAIL">Email</option>
          </select>
        </div>

        {/* Requirements */}

        <div className="mt-6 space-y-2">
          <Label htmlFor="specialRequirements">Special requirements</Label>

          <Textarea
            id="specialRequirements"
            placeholder="Vegetarian meals, accessibility requirements, honeymoon arrangements, activities you want to include..."
            rows={5}
            {...register("specialRequirements")}
          />
        </div>
      </section>

      {/* =====================================================
          SERVER ERROR
      ===================================================== */}

      {serverError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* =====================================================
          SUBMIT
      ===================================================== */}

      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Submitting this request does not create a booking or charge you.
          Travora will review your preferences and prepare a quotation.
        </p>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="shrink-0"
        >
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}

          {isSubmitting ? "Submitting..." : "Submit tour request"}
        </Button>
      </div>
    </form>
  );
}