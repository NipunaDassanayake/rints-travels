"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useForm,
  useWatch,
} from "react-hook-form";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  z,
} from "zod";

import {
  AxiosError,
} from "axios";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import type {
  TravelPackage,
} from "@/features/packages/package.types";

import type {
  TourGuide,
} from "@/features/tour-guides/tour-guide.types";

import {
  createCustomTourRequest,
  createPackageBasedTourRequest,
} from "../tour-request.api";

const optionalNumber = z
  .string()
  .optional();

const tourRequestSchema = z
  .object({
    requestType: z.enum([
      "PACKAGE_BASED",
      "CUSTOM",
    ]),

    packageId: z
      .string()
      .optional(),

    title: z
      .string()
      .trim()
      .optional(),

    destinationPreferences: z
      .string()
      .trim()
      .optional(),

    preferredStartDate: z
      .string()
      .min(
        1,
        "Preferred start date is required"
      ),

    preferredEndDate: z
      .string()
      .optional(),

    adultCount: z
      .string()
      .min(
        1,
        "Adult count is required"
      ),

    childCount: z
      .string()
      .min(
        1,
        "Child count is required"
      ),

    budget: optionalNumber,

    currency: z
      .string()
      .trim()
      .min(
        1,
        "Currency is required"
      )
      .max(
        10,
        "Currency must be 10 characters or less"
      ),

    preferredGuideId: z
      .string()
      .optional(),

    hotelPreference: z
      .string()
      .trim()
      .optional(),

    transportPreference: z
      .string()
      .trim()
      .optional(),

    specialRequirements: z
      .string()
      .trim()
      .optional(),

    contactMethod: z
      .enum([
        "WHATSAPP",
        "PHONE",
        "EMAIL",
      ])
      .or(
        z.literal("")
      ),
  })
  .superRefine(
    (data, ctx) => {
      const adults =
        Number(
          data.adultCount
        );

      const children =
        Number(
          data.childCount
        );

      if (
        !Number.isInteger(
          adults
        ) ||
        adults < 1
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "adultCount",
          ],
          message:
            "At least one adult is required",
        });
      }

      if (
        !Number.isInteger(
          children
        ) ||
        children < 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "childCount",
          ],
          message:
            "Child count cannot be negative",
        });
      }

      if (
        data.budget &&
        Number(
          data.budget
        ) <= 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "budget",
          ],
          message:
            "Budget must be greater than zero",
        });
      }

      if (
        data.preferredEndDate &&
        new Date(
          data.preferredEndDate
        ) <
          new Date(
            data.preferredStartDate
          )
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "preferredEndDate",
          ],
          message:
            "End date cannot be before start date",
        });
      }

      if (
        data.requestType ===
          "PACKAGE_BASED" &&
        !data.packageId
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "packageId",
          ],
          message:
            "Please select a travel package",
        });
      }

      if (
        data.requestType ===
          "CUSTOM" &&
        (
          !data.title ||
          data.title.length <
            3
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "title",
          ],
          message:
            "Trip title must contain at least 3 characters",
        });
      }

      if (
        data.requestType ===
          "CUSTOM" &&
        (
          !data.destinationPreferences ||
          data
            .destinationPreferences
            .length < 2
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "destinationPreferences",
          ],
          message:
            "Please enter your destination preferences",
        });
      }
    }
  );

type TourRequestFormValues =
  z.infer<
    typeof tourRequestSchema
  >;

type TourRequestFormProps = {
  packages:
    TravelPackage[];

  guides:
    TourGuide[];

  initialPackageId?:
    string;

  initialGuideId?:
    string;
};

export function TourRequestForm({
  packages,
  guides,
  initialPackageId,
  initialGuideId,
}: TourRequestFormProps) {
  const router =
    useRouter();

  const [
    serverError,
    setServerError,
  ] = useState<
    string | null
  >(null);

  const defaultRequestType:
    "PACKAGE_BASED" |
    "CUSTOM" =
    initialPackageId
      ? "PACKAGE_BASED"
      : "CUSTOM";

  const {
    register,
    handleSubmit,
    control,
    formState: {
      errors,
      isSubmitting,
    },
  } =
    useForm<TourRequestFormValues>({
      resolver:
        zodResolver(
          tourRequestSchema
        ),

      defaultValues: {
        requestType:
          defaultRequestType,

        packageId:
          initialPackageId ??
          "",

        preferredGuideId:
          initialGuideId ??
          "",

        title: "",

        destinationPreferences:
          "",

        preferredStartDate:
          "",

        preferredEndDate:
          "",

        adultCount: "1",

        childCount: "0",

        budget: "",

        currency: "USD",

        hotelPreference:
          "",

        transportPreference:
          "",

        specialRequirements:
          "",

        contactMethod: "",
      },
    });

  const requestType =
    useWatch({
      control,
      name:
        "requestType",
    });

  const selectedPackageId =
    useWatch({
      control,
      name:
        "packageId",
    });

  const selectedGuideId =
    useWatch({
      control,
      name:
        "preferredGuideId",
    });

  const selectedPackage =
    useMemo(
      () =>
        packages.find(
          (
            travelPackage
          ) =>
            String(
              travelPackage.id
            ) ===
            selectedPackageId
        ),
      [
        packages,
        selectedPackageId,
      ]
    );

  const selectedGuide =
    useMemo(
      () =>
        guides.find(
          (
            guide
          ) =>
            guide.id ===
            selectedGuideId
        ),
      [
        guides,
        selectedGuideId,
      ]
    );

  const onSubmit =
    async (
      values:
        TourRequestFormValues
    ) => {
      try {
        setServerError(
          null
        );

        const commonData = {
          preferredStartDate:
            values
              .preferredStartDate,

          preferredEndDate:
            values
              .preferredEndDate ||
            null,

          adultCount:
            Number(
              values.adultCount
            ),

          childCount:
            Number(
              values.childCount
            ),

          budget:
            values.budget
              ? Number(
                  values.budget
                )
              : null,

          currency:
            values.currency
              .trim()
              .toUpperCase(),

          preferredGuideId:
            values
              .preferredGuideId ||
            null,

          hotelPreference:
            values
              .hotelPreference ||
            null,

          transportPreference:
            values
              .transportPreference ||
            null,

          specialRequirements:
            values
              .specialRequirements ||
            null,

          contactMethod:
            values
              .contactMethod ||
            null,
        };

        if (
          values.requestType ===
          "PACKAGE_BASED"
        ) {
          await createPackageBasedTourRequest(
            {
              packageId:
                Number(
                  values.packageId
                ),

              ...commonData,
            }
          );
        } else {
          await createCustomTourRequest(
            {
              title:
                values
                  .title!
                  .trim(),

              destinationPreferences:
                values
                  .destinationPreferences!
                  .trim(),

              ...commonData,
            }
          );
        }

        router.push(
          "/tourist"
        );
      } catch (error) {
        if (
          error instanceof
          AxiosError
        ) {
          setServerError(
            error
              .response
              ?.data
              ?.message ??
              "Unable to submit your tour request."
          );

          return;
        }

        setServerError(
          "Unable to submit your tour request."
        );
      }
    };

  return (
    <form
      onSubmit={
        handleSubmit(
          onSubmit
        )
      }
      className="space-y-8"
    >
      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          Request type
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
            <input
              type="radio"
              value="PACKAGE_BASED"
              {...register(
                "requestType"
              )}
            />

            <div>
              <p className="font-medium">
                Customize a package
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Start from one
                of Travora&apos;s
                existing travel
                templates.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
            <input
              type="radio"
              value="CUSTOM"
              {...register(
                "requestType"
              )}
            />

            <div>
              <p className="font-medium">
                Create from
                scratch
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Tell us where
                you want to go
                and we&apos;ll
                design the
                journey.
              </p>
            </div>
          </label>
        </div>
      </section>

      {requestType ===
        "PACKAGE_BASED" && (
        <section className="rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">
            Travel package
          </h2>

          <div className="mt-5 space-y-2">
            <Label htmlFor="packageId">
              Select package
            </Label>

            <select
              id="packageId"
              {...register(
                "packageId"
              )}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">
                Select a
                package
              </option>

              {packages.map(
                (
                  travelPackage
                ) => (
                  <option
                    key={
                      travelPackage.id
                    }
                    value={
                      travelPackage.id
                    }
                  >
                    {
                      travelPackage.title
                    }
                  </option>
                )
              )}
            </select>

            {errors
              .packageId && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .packageId
                    .message
                }
              </p>
            )}

            {selectedPackage && (
              <p className="text-sm text-muted-foreground">
                {
                  selectedPackage.destination
                }
                {" · "}
                {
                  selectedPackage.durationDays
                }
                {
                  " days · Starting from $"
                }
                {
                  selectedPackage.price
                }
              </p>
            )}
          </div>
        </section>
      )}

      {requestType ===
        "CUSTOM" && (
        <section className="space-y-5 rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">
            Your custom
            journey
          </h2>

          <div className="space-y-2">
            <Label htmlFor="title">
              Trip title
            </Label>

            <Input
              id="title"
              placeholder="My Sri Lanka adventure"
              {...register(
                "title"
              )}
            />

            {errors.title && (
              <p className="text-sm text-destructive">
                {
                  errors.title
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationPreferences">
              Destination
              preferences
            </Label>

            <Textarea
              id="destinationPreferences"
              placeholder="Kandy, Ella, Mirissa, wildlife parks..."
              {...register(
                "destinationPreferences"
              )}
            />

            {errors
              .destinationPreferences && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .destinationPreferences
                    .message
                }
              </p>
            )}
          </div>
        </section>
      )}

      <section className="space-y-6 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          Travel details
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredStartDate">
              Preferred start
              date
            </Label>

            <Input
              id="preferredStartDate"
              type="date"
              {...register(
                "preferredStartDate"
              )}
            />

            {errors
              .preferredStartDate && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .preferredStartDate
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredEndDate">
              Preferred end
              date
            </Label>

            <Input
              id="preferredEndDate"
              type="date"
              {...register(
                "preferredEndDate"
              )}
            />

            {errors
              .preferredEndDate && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .preferredEndDate
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adultCount">
              Adults
            </Label>

            <Input
              id="adultCount"
              type="number"
              min="1"
              {...register(
                "adultCount"
              )}
            />

            {errors
              .adultCount && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .adultCount
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="childCount">
              Children
            </Label>

            <Input
              id="childCount"
              type="number"
              min="0"
              {...register(
                "childCount"
              )}
            />

            {errors
              .childCount && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .childCount
                    .message
                }
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          Preferences
        </h2>

        <div className="space-y-2">
          <Label htmlFor="preferredGuideId">
            Preferred tour
            guide
          </Label>

          <select
            id="preferredGuideId"
            {...register(
              "preferredGuideId"
            )}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              No preference
            </option>

            {guides.map(
              (
                guide
              ) => (
                <option
                  key={
                    guide.id
                  }
                  value={
                    guide.id
                  }
                >
                  {
                    guide.user
                      .firstName
                  }{" "}
                  {
                    guide.user
                      .lastName
                  }
                </option>
              )
            )}
          </select>

          {selectedGuide && (
            <p className="text-sm text-muted-foreground">
              {
                selectedGuide.experienceYears
              }
              {
                " years experience · "
              }
              {
                selectedGuide.languages.join(
                  ", "
                )
              }
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="budget">
              Approximate
              budget
            </Label>

            <Input
              id="budget"
              type="number"
              min="1"
              placeholder="2000"
              {...register(
                "budget"
              )}
            />

            {errors
              .budget && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .budget
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">
              Currency
            </Label>

            <Input
              id="currency"
              maxLength={
                10
              }
              {...register(
                "currency"
              )}
            />

            {errors
              .currency && (
              <p className="text-sm text-destructive">
                {
                  errors
                    .currency
                    .message
                }
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hotelPreference">
              Hotel
              preference
            </Label>

            <Input
              id="hotelPreference"
              placeholder="3-star, boutique, luxury..."
              {...register(
                "hotelPreference"
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transportPreference">
              Transport
              preference
            </Label>

            <Input
              id="transportPreference"
              placeholder="Private car, van..."
              {...register(
                "transportPreference"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactMethod">
            Preferred contact
            method
          </Label>

          <select
            id="contactMethod"
            {...register(
              "contactMethod"
            )}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              No preference
            </option>

            <option value="WHATSAPP">
              WhatsApp
            </option>

            <option value="PHONE">
              Phone
            </option>

            <option value="EMAIL">
              Email
            </option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialRequirements">
            Special
            requirements
          </Label>

          <Textarea
            id="specialRequirements"
            placeholder="Vegetarian meals, accessibility requirements, celebrations..."
            rows={5}
            {...register(
              "specialRequirements"
            )}
          />
        </div>
      </section>

      {serverError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={
            isSubmitting
          }
        >
          {isSubmitting
            ? "Submitting..."
            : "Submit tour request"}
        </Button>
      </div>
    </form>
  );
}