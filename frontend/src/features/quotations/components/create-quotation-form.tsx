"use client";

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FileText, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import {
  createQuotation,
  createQuotationRevision,
} from "@/features/quotations/quotation.api";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

import type { TourRequest } from "@/features/tour-requests/tour-request.types";

import type { Quotation } from "@/features/quotations/quotation.types";

interface CreateQuotationFormProps {
  requestId: string;
  request?: TourRequest;
  mode?: "create" | "revise";
  sourceQuotation?: Quotation;
  onCreated?: () => void;
  onCancel?: () => void;
}

interface ItineraryFormItem {
  dayNumber: number;
  title: string;
  description: string;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

/**
 * =========================================================
 * Default Field Values
 * =========================================================
 *
 * In "create" mode, defaults come from the tour request.
 * In "revise" mode, defaults come from the quotation being
 * revised -- the admin then edits any field before submitting.
 */

function getDefaultValues(
  mode: "create" | "revise",
  request: TourRequest | undefined,
  sourceQuotation: Quotation | undefined,
) {
  if (mode === "revise" && sourceQuotation) {
    return {
      guideId: sourceQuotation.guideId ?? "",

      title: sourceQuotation.title,

      description: sourceQuotation.description ?? "",

      startDate: toDateInputValue(sourceQuotation.startDate),

      endDate: toDateInputValue(sourceQuotation.endDate),

      adultCount: String(sourceQuotation.adultCount),

      childCount: String(sourceQuotation.childCount),

      subtotal: sourceQuotation.subtotal,

      discountAmount: sourceQuotation.discountAmount,

      taxAmount: sourceQuotation.taxAmount,

      currency: sourceQuotation.currency,

      notes: sourceQuotation.notes ?? "",

      termsConditions: sourceQuotation.termsConditions ?? "",

      validUntil: toDateInputValue(sourceQuotation.validUntil),

      itineraries: sourceQuotation.itineraries.map((item) => ({
        dayNumber: item.dayNumber,

        title: item.title,

        description: item.description,
      })) as ItineraryFormItem[],

      inclusions: sourceQuotation.inclusions.map((item) => item.title),

      exclusions: sourceQuotation.exclusions.map((item) => item.title),
    };
  }

  return {
    guideId: request?.preferredGuideId ?? "",

    title:
      request?.travelPackage?.title ??
      request?.title ??
      "Custom Sri Lanka Tour",

    description:
      request?.travelPackage?.description ??
      request?.destinationPreferences ??
      "",

    startDate: toDateInputValue(request?.preferredStartDate),

    endDate: toDateInputValue(request?.preferredEndDate),

    adultCount: String(request?.adultCount ?? 1),

    childCount: String(request?.childCount ?? 0),

    subtotal: "",

    discountAmount: "0",

    taxAmount: "0",

    currency: request?.currency ?? "USD",

    notes: "",

    termsConditions: "",

    validUntil: "",

    itineraries: [] as ItineraryFormItem[],

    inclusions: [] as string[],

    exclusions: [] as string[],
  };
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to create the quotation.";
}

export function CreateQuotationForm({
  request,
  requestId,
  mode = "create",
  sourceQuotation,
  onCreated,
  onCancel,
}: CreateQuotationFormProps) {
  const queryClient = useQueryClient();

  /**
   * =========================================================
   * Tour Guides
   * =========================================================
   */

  const {
    data: guides = [],
    isLoading: isLoadingGuides,
    isError: isGuidesError,
  } = useQuery({
    queryKey: ["tour-guides"],

    queryFn: getTourGuides,
  });

  const defaults = getDefaultValues(mode, request, sourceQuotation);

  /**
   * The guide already on the tour request (create mode) or
   * already on the quotation being revised (revise mode)
   * stays selectable even if it has since become unavailable.
   */
  const preservedGuideId =
    mode === "revise" ? (sourceQuotation?.guideId ?? null) : (request?.preferredGuideId ?? null);

  const [isOpen, setIsOpen] = useState(mode === "revise");

  const [guideId, setGuideId] = useState(defaults.guideId);

  const [title, setTitle] = useState(defaults.title);

  const [description, setDescription] = useState(defaults.description);

  const [startDate, setStartDate] = useState(defaults.startDate);

  const [endDate, setEndDate] = useState(defaults.endDate);

  const [adultCount, setAdultCount] = useState(defaults.adultCount);

  const [childCount, setChildCount] = useState(defaults.childCount);

  const [subtotal, setSubtotal] = useState(defaults.subtotal);

  const [discountAmount, setDiscountAmount] = useState(
    defaults.discountAmount,
  );

  const [taxAmount, setTaxAmount] = useState(defaults.taxAmount);

  const [currency, setCurrency] = useState(defaults.currency);

  const [notes, setNotes] = useState(defaults.notes);

  const [termsConditions, setTermsConditions] = useState(
    defaults.termsConditions,
  );

  const [validUntil, setValidUntil] = useState(defaults.validUntil);

  const [itineraries, setItineraries] = useState<ItineraryFormItem[]>(
    defaults.itineraries,
  );

  const [inclusionInput, setInclusionInput] = useState("");

  const [inclusions, setInclusions] = useState<string[]>(defaults.inclusions);

  const [exclusionInput, setExclusionInput] = useState("");

  const [exclusions, setExclusions] = useState<string[]>(defaults.exclusions);

  /**
   * =========================================================
   * Guide Selection
   * =========================================================
   */

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === guideId) ?? null,
    [guides, guideId],
  );

  /**
   * =========================================================
   * Pricing
   * =========================================================
   */

  const totalAmount = useMemo(() => {
    const subtotalValue = Number(subtotal) || 0;

    const discountValue = Number(discountAmount) || 0;

    const taxValue = Number(taxAmount) || 0;

    return Math.max(subtotalValue - discountValue + taxValue, 0);
  }, [subtotal, discountAmount, taxAmount]);

  /**
   * =========================================================
   * Reset / Open
   * =========================================================
   */

  const openForm = () => {
    const resetValues = getDefaultValues(mode, request, sourceQuotation);

    setGuideId(resetValues.guideId);

    setTitle(resetValues.title);

    setDescription(resetValues.description);

    setStartDate(resetValues.startDate);

    setEndDate(resetValues.endDate);

    setAdultCount(resetValues.adultCount);

    setChildCount(resetValues.childCount);

    setCurrency(resetValues.currency);

    setSubtotal(resetValues.subtotal);

    setDiscountAmount(resetValues.discountAmount);

    setTaxAmount(resetValues.taxAmount);

    setNotes(resetValues.notes);

    setTermsConditions(resetValues.termsConditions);

    setValidUntil(resetValues.validUntil);

    setItineraries(resetValues.itineraries);

    setInclusions(resetValues.inclusions);

    setExclusions(resetValues.exclusions);

    setInclusionInput("");

    setExclusionInput("");

    setIsOpen(true);
  };

  /**
   * =========================================================
   * Create Mutation
   * =========================================================
   */

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        guideId: guideId || null,

        title: title.trim(),

        description: description.trim() || null,

        startDate,

        endDate,

        adultCount: Number(adultCount),

        childCount: Number(childCount),

        subtotal: Number(subtotal),

        discountAmount: Number(discountAmount) || 0,

        taxAmount: Number(taxAmount) || 0,

        totalAmount,

        currency: currency.trim().toUpperCase(),

        notes: notes.trim() || null,

        termsConditions: termsConditions.trim() || null,

        validUntil: validUntil || null,

        itineraries,

        inclusions,

        exclusions,
      };

      return mode === "revise" && sourceQuotation
        ? createQuotationRevision(sourceQuotation.id, payload)
        : createQuotation(requestId, payload);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "tour-request", requestId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["tour-request", requestId, "quotations"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "tour-requests"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["tour-request", requestId],
      });

      if (onCreated) {
        onCreated();
      } else {
        setIsOpen(false);
      }
    },
  });

  /**
   * =========================================================
   * Itinerary
   * =========================================================
   */

  const addItineraryItem = () => {
    setItineraries((current) => [
      ...current,

      {
        dayNumber: current.length + 1,

        title: "",

        description: "",
      },
    ]);
  };

  const updateItineraryItem = (
    index: number,

    field: "dayNumber" | "title" | "description",

    value: string,
  ) => {
    setItineraries((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,

              [field]: field === "dayNumber" ? Number(value) : value,
            }
          : item,
      ),
    );
  };

  const removeItineraryItem = (index: number) => {
    setItineraries((current) =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,

          dayNumber: itemIndex + 1,
        })),
    );
  };

  /**
   * =========================================================
   * Inclusions / Exclusions
   * =========================================================
   */

  const addInclusion = () => {
    const value = inclusionInput.trim();

    if (value.length < 2) {
      return;
    }

    setInclusions((current) => [...current, value]);

    setInclusionInput("");
  };

  const addExclusion = () => {
    const value = exclusionInput.trim();

    if (value.length < 2) {
      return;
    }

    setExclusions((current) => [...current, value]);

    setExclusionInput("");
  };

  /**
   * =========================================================
   * Validation
   * =========================================================
   */

  const hasInvalidItinerary = itineraries.some(
    (item) =>
      item.dayNumber < 1 ||
      item.title.trim().length < 3 ||
      item.description.trim().length < 5,
  );

  const isInvalid =
    !title.trim() ||
    title.trim().length < 3 ||
    !startDate ||
    !endDate ||
    endDate < startDate ||
    !adultCount ||
    Number(adultCount) < 1 ||
    Number(childCount) < 0 ||
    !subtotal ||
    Number(subtotal) <= 0 ||
    totalAmount <= 0 ||
    !currency.trim() ||
    hasInvalidItinerary;

  if (!isOpen) {
    return (
      <Button className="w-full" onClick={openForm}>
        <FileText className="size-4" />
        Create quotation
      </Button>
    );
  }

  return (
    <div className="space-y-7 rounded-xl border bg-background p-5">
      {/* =====================================================
          Header
      ====================================================== */}

      <div>
        <h3 className="text-lg font-semibold">
          {mode === "revise" ? "Create revision" : "Create quotation"}
        </h3>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {mode === "revise"
            ? "Review and adjust the quotation before submitting a new revision to the tourist."
            : "Prepare the final customized itinerary, pricing and terms for the tourist."}
        </p>
      </div>

      {/* =====================================================
          Basic Details
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="quotation-title">Title</Label>

          <Input
            id="quotation-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="quotation-description">Description</Label>

          <Textarea
            id="quotation-description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-start-date">Start date</Label>

          <Input
            id="quotation-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-end-date">End date</Label>

          <Input
            id="quotation-end-date"
            type="date"
            min={startDate || undefined}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-adults">Adults</Label>

          <Input
            id="quotation-adults"
            type="number"
            min="1"
            value={adultCount}
            onChange={(event) => setAdultCount(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-children">Children</Label>

          <Input
            id="quotation-children"
            type="number"
            min="0"
            value={childCount}
            onChange={(event) => setChildCount(event.target.value)}
          />
        </div>

        {/* ===================================================
            Guide Selector
        ==================================================== */}

        <div className="space-y-2">
          <Label htmlFor="quotation-guide">Tour guide</Label>

          <select
            id="quotation-guide"
            value={guideId}
            disabled={isLoadingGuides}
            onChange={(event) => setGuideId(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {isLoadingGuides ? "Loading tour guides..." : "No guide selected"}
            </option>

            {guides.map((guide) => {
              const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

              const location = guide.location ? ` — ${guide.location}` : "";

              const experience =
                guide.experienceYears > 0
                  ? ` — ${guide.experienceYears} yr${guide.experienceYears === 1 ? "" : "s"} exp.`
                  : "";

              const rating =
                Number(guide.averageRating) > 0
                  ? ` — ★ ${Number(guide.averageRating).toFixed(1)}`
                  : "";

              const availability = guide.isAvailable ? "" : " — Unavailable";

              return (
                <option
                  key={guide.id}
                  value={guide.id}
                  disabled={
                    !guide.isAvailable && guide.id !== preservedGuideId
                  }
                >
                  {fullName}
                  {location}
                  {experience}
                  {rating}
                  {availability}
                </option>
              );
            })}
          </select>

          {isGuidesError && (
            <p className="text-xs text-destructive">
              Unable to load tour guides.
            </p>
          )}

          {!isGuidesError && !isLoadingGuides && guides.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tour guides are currently available.
            </p>
          )}

          {!isGuidesError && guides.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Choose a guide by name. The internal guide ID is handled
              automatically.
            </p>
          )}

          {selectedGuide && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="font-medium">
                Selected: {selectedGuide.user.firstName}{" "}
                {selectedGuide.user.lastName}
              </p>

              <p className="mt-1 text-muted-foreground">
                {selectedGuide.location ?? "Location not specified"}
                {" · "}
                {selectedGuide.experienceYears} year
                {selectedGuide.experienceYears === 1 ? "" : "s"} experience
                {Number(selectedGuide.averageRating) > 0 && (
                  <>
                    {" · ★ "}
                    {Number(selectedGuide.averageRating).toFixed(1)}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-valid-until">Valid until</Label>

          <Input
            id="quotation-valid-until"
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
        </div>
      </div>

      {/* =====================================================
          Pricing
      ====================================================== */}

      <div className="space-y-4 rounded-xl border p-5">
        <div>
          <h4 className="font-semibold">Pricing</h4>

          <p className="mt-1 text-sm text-muted-foreground">
            The total is calculated automatically.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quotation-subtotal">Subtotal</Label>

            <Input
              id="quotation-subtotal"
              type="number"
              min="0.01"
              step="0.01"
              value={subtotal}
              onChange={(event) => setSubtotal(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-currency">Currency</Label>

            <Input
              id="quotation-currency"
              value={currency}
              maxLength={10}
              onChange={(event) => setCurrency(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-discount">Discount</Label>

            <Input
              id="quotation-discount"
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-tax">Tax</Label>

            <Input
              id="quotation-tax"
              type="number"
              min="0"
              step="0.01"
              value={taxAmount}
              onChange={(event) => setTaxAmount(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">Final total</p>

          <p className="mt-1 text-2xl font-bold">
            {currency || "USD"} {totalAmount.toFixed(2)}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Subtotal − discount + tax
          </p>
        </div>
      </div>

      {/* =====================================================
          Itinerary
      ====================================================== */}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold">Itinerary</h4>

            <p className="text-sm text-muted-foreground">
              Add the customized day-by-day journey.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={addItineraryItem}>
            <Plus className="size-4" />
            Add day
          </Button>
        </div>

        {itineraries.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No itinerary items added yet. The quotation can still be created
            without an itinerary.
          </p>
        )}

        {itineraries.map((item, index) => (
          <div key={index} className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-4">
              <h5 className="font-medium">Day {item.dayNumber}</h5>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeItineraryItem(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>

              <Input
                value={item.title}
                placeholder="Example: Arrival in Colombo"
                onChange={(event) =>
                  updateItineraryItem(
                    index,

                    "title",

                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>

              <Textarea
                rows={3}
                value={item.description}
                placeholder="Describe the day's activities..."
                onChange={(event) =>
                  updateItineraryItem(
                    index,

                    "description",

                    event.target.value,
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================
          Inclusion / Exclusion
      ====================================================== */}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <h4 className="font-semibold">Inclusions</h4>

            <p className="text-sm text-muted-foreground">
              Services covered by the quotation.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={inclusionInput}
              placeholder="Airport pickup"
              onChange={(event) => setInclusionInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();

                  addInclusion();
                }
              }}
            />

            <Button type="button" variant="outline" onClick={addInclusion}>
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {inclusions.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span>{item}</span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setInclusions((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <h4 className="font-semibold">Exclusions</h4>

            <p className="text-sm text-muted-foreground">
              Services the tourist must arrange separately.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={exclusionInput}
              placeholder="International airfare"
              onChange={(event) => setExclusionInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();

                  addExclusion();
                }
              }}
            />

            <Button type="button" variant="outline" onClick={addExclusion}>
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {exclusions.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span>{item}</span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setExclusions((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================
          Notes
      ====================================================== */}

      <div className="space-y-2">
        <Label htmlFor="quotation-notes">Notes</Label>

        <Textarea
          id="quotation-notes"
          rows={4}
          value={notes}
          placeholder="Additional information for the tourist..."
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {/* =====================================================
          Terms
      ====================================================== */}

      <div className="space-y-2">
        <Label htmlFor="quotation-terms">Terms &amp; conditions</Label>

        <Textarea
          id="quotation-terms"
          rows={5}
          value={termsConditions}
          placeholder="Example: Subject to hotel and guide availability..."
          onChange={(event) => setTermsConditions(event.target.value)}
        />
      </div>

      {/* =====================================================
          Error
      ====================================================== */}

      {mutation.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">
            {mode === "revise"
              ? "Unable to create revision"
              : "Unable to create quotation"}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(mutation.error)}
          </p>
        </div>
      )}

      {/* =====================================================
          Actions
      ====================================================== */}

      <div className="flex flex-wrap gap-3">
        <Button
          className="flex-1"
          disabled={mutation.isPending || isInvalid}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              {mode === "revise" ? "Creating revision..." : "Creating..."}
            </>
          ) : mode === "revise" ? (
            "Create revision"
          ) : (
            "Create draft quotation"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              setIsOpen(false);
            }
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}