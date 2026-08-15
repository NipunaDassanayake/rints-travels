"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Plus,
  Trash2,
} from "lucide-react";

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

import {
  createQuotation,
} from "@/features/quotations/quotation.api";

import type {
  TourRequest,
} from "@/features/tour-requests/tour-request.types";

interface CreateQuotationFormProps {
  request: TourRequest;
  requestId: string;
}

interface ItineraryFormItem {
  dayNumber: number;
  title: string;
  description: string;
}

function toDateInputValue(
  value: string | null
) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function CreateQuotationForm({
  request,
  requestId,
}: CreateQuotationFormProps) {
  const queryClient =
    useQueryClient();

  const defaultTitle =
    request.travelPackage?.title ??
    request.title ??
    "Custom Sri Lanka Tour";

  const defaultDescription =
    request.travelPackage?.description ??
    request.destinationPreferences ??
    "";

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    guideId,
    setGuideId,
  ] = useState(
    request.preferredGuideId ?? ""
  );

  const [
    title,
    setTitle,
  ] = useState(
    defaultTitle
  );

  const [
    description,
    setDescription,
  ] = useState(
    defaultDescription
  );

  const [
    startDate,
    setStartDate,
  ] = useState(
    toDateInputValue(
      request.preferredStartDate
    )
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    toDateInputValue(
      request.preferredEndDate
    )
  );

  const [
    adultCount,
    setAdultCount,
  ] = useState(
    String(
      request.adultCount
    )
  );

  const [
    childCount,
    setChildCount,
  ] = useState(
    String(
      request.childCount
    )
  );

  const [
    subtotal,
    setSubtotal,
  ] = useState("");

  const [
    discountAmount,
    setDiscountAmount,
  ] = useState("0");

  const [
    taxAmount,
    setTaxAmount,
  ] = useState("0");

  const [
    currency,
    setCurrency,
  ] = useState(
    request.currency
  );

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    termsConditions,
    setTermsConditions,
  ] = useState("");

  const [
    validUntil,
    setValidUntil,
  ] = useState("");

  const [
    itineraries,
    setItineraries,
  ] = useState<
    ItineraryFormItem[]
  >([]);

  const [
    inclusionInput,
    setInclusionInput,
  ] = useState("");

  const [
    inclusions,
    setInclusions,
  ] = useState<string[]>([]);

  const [
    exclusionInput,
    setExclusionInput,
  ] = useState("");

  const [
    exclusions,
    setExclusions,
  ] = useState<string[]>([]);

  const totalAmount =
    useMemo(() => {
      const subtotalValue =
        Number(subtotal) || 0;

      const discountValue =
        Number(
          discountAmount
        ) || 0;

      const taxValue =
        Number(taxAmount) || 0;

      return Math.max(
        subtotalValue -
          discountValue +
          taxValue,
        0
      );
    }, [
      subtotal,
      discountAmount,
      taxAmount,
    ]);

  const openForm = () => {
    setGuideId(
      request.preferredGuideId ??
        ""
    );

    setTitle(
      request.travelPackage?.title ??
        request.title ??
        "Custom Sri Lanka Tour"
    );

    setDescription(
      request.travelPackage?.description ??
        request.destinationPreferences ??
        ""
    );

    setStartDate(
      toDateInputValue(
        request.preferredStartDate
      )
    );

    setEndDate(
      toDateInputValue(
        request.preferredEndDate
      )
    );

    setAdultCount(
      String(
        request.adultCount
      )
    );

    setChildCount(
      String(
        request.childCount
      )
    );

    setCurrency(
      request.currency
    );

    setSubtotal("");
    setDiscountAmount("0");
    setTaxAmount("0");

    setNotes("");
    setTermsConditions("");
    setValidUntil("");

    setItineraries([]);
    setInclusions([]);
    setExclusions([]);

    setInclusionInput("");
    setExclusionInput("");

    setIsOpen(true);
  };

  const mutation =
    useMutation({
      mutationFn: () =>
        createQuotation(
          requestId,
          {
            guideId:
              guideId || null,

            title:
              title.trim(),

            description:
              description.trim() ||
              null,

            startDate,
            endDate,

            adultCount:
              Number(
                adultCount
              ),

            childCount:
              Number(
                childCount
              ),

            subtotal:
              Number(
                subtotal
              ),

            discountAmount:
              Number(
                discountAmount
              ) || 0,

            taxAmount:
              Number(
                taxAmount
              ) || 0,

            totalAmount,

            currency:
              currency
                .trim()
                .toUpperCase(),

            notes:
              notes.trim() ||
              null,

            termsConditions:
              termsConditions.trim() ||
              null,

            validUntil:
              validUntil ||
              null,

            itineraries,

            inclusions,

            exclusions,
          }
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "admin",
            "tour-request",
            requestId,
          ],
        });

        await queryClient.invalidateQueries({
          queryKey: [
            "tour-request",
            requestId,
            "quotations",
          ],
        });

        setIsOpen(false);
      },
    });

  const addItineraryItem = () => {
    setItineraries(
      (current) => [
        ...current,
        {
          dayNumber:
            current.length + 1,
          title: "",
          description: "",
        },
      ]
    );
  };

  const updateItineraryItem = (
    index: number,
    field:
      | "dayNumber"
      | "title"
      | "description",
    value: string
  ) => {
    setItineraries(
      (current) =>
        current.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex === index
              ? {
                  ...item,

                  [field]:
                    field ===
                    "dayNumber"
                      ? Number(
                          value
                        )
                      : value,
                }
              : item
        )
    );
  };

  const removeItineraryItem = (
    index: number
  ) => {
    setItineraries(
      (current) =>
        current
          .filter(
            (
              _,
              itemIndex
            ) =>
              itemIndex !==
              index
          )
          .map(
            (
              item,
              itemIndex
            ) => ({
              ...item,
              dayNumber:
                itemIndex + 1,
            })
          )
    );
  };

  const addInclusion = () => {
    const value =
      inclusionInput.trim();

    if (!value) {
      return;
    }

    setInclusions(
      (current) => [
        ...current,
        value,
      ]
    );

    setInclusionInput("");
  };

  const addExclusion = () => {
    const value =
      exclusionInput.trim();

    if (!value) {
      return;
    }

    setExclusions(
      (current) => [
        ...current,
        value,
      ]
    );

    setExclusionInput("");
  };

  const isInvalid =
    !title.trim() ||
    !startDate ||
    !endDate ||
    !adultCount ||
    Number(adultCount) < 1 ||
    Number(childCount) < 0 ||
    !subtotal ||
    Number(subtotal) <= 0 ||
    totalAmount <= 0 ||
    !currency.trim();

  if (!isOpen) {
    return (
      <Button
        className="w-full"
        onClick={openForm}
      >
        Create quotation
      </Button>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border p-4">
      <div>
        <h3 className="text-lg font-semibold">
          Create quotation
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Prepare a customized quotation for this tour request.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="quotation-title">
            Title
          </Label>

          <Input
            id="quotation-title"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="quotation-description">
            Description
          </Label>

          <Textarea
            id="quotation-description"
            rows={4}
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-start-date">
            Start date
          </Label>

          <Input
            id="quotation-start-date"
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-end-date">
            End date
          </Label>

          <Input
            id="quotation-end-date"
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-adults">
            Adults
          </Label>

          <Input
            id="quotation-adults"
            type="number"
            min="1"
            value={adultCount}
            onChange={(event) =>
              setAdultCount(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-children">
            Children
          </Label>

          <Input
            id="quotation-children"
            type="number"
            min="0"
            value={childCount}
            onChange={(event) =>
              setChildCount(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-guide">
            Guide ID
          </Label>

          <Input
            id="quotation-guide"
            placeholder="Optional guide UUID"
            value={guideId}
            onChange={(event) =>
              setGuideId(
                event.target.value
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation-valid-until">
            Valid until
          </Label>

          <Input
            id="quotation-valid-until"
            type="date"
            value={validUntil}
            onChange={(event) =>
              setValidUntil(
                event.target.value
              )
            }
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border p-4">
        <h4 className="font-semibold">
          Pricing
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quotation-subtotal">
              Subtotal
            </Label>

            <Input
              id="quotation-subtotal"
              type="number"
              min="0"
              step="0.01"
              value={subtotal}
              onChange={(event) =>
                setSubtotal(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-currency">
              Currency
            </Label>

            <Input
              id="quotation-currency"
              value={currency}
              maxLength={10}
              onChange={(event) =>
                setCurrency(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-discount">
              Discount
            </Label>

            <Input
              id="quotation-discount"
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(event) =>
                setDiscountAmount(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-tax">
              Tax
            </Label>

            <Input
              id="quotation-tax"
              type="number"
              min="0"
              step="0.01"
              value={taxAmount}
              onChange={(event) =>
                setTaxAmount(
                  event.target.value
                )
              }
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Total
          </p>

          <p className="mt-1 text-2xl font-bold">
            {currency || "USD"}{" "}
            {totalAmount.toFixed(
              2
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold">
              Itinerary
            </h4>

            <p className="text-sm text-muted-foreground">
              Add the customized day-by-day plan.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={
              addItineraryItem
            }
          >
            <Plus className="size-4" />
            Add day
          </Button>
        </div>

        {itineraries.length ===
          0 && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No itinerary items added yet.
          </p>
        )}

        {itineraries.map(
          (
            item,
            index
          ) => (
            <div
              key={index}
              className="space-y-4 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <h5 className="font-medium">
                  Day{" "}
                  {
                    item.dayNumber
                  }
                </h5>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    removeItineraryItem(
                      index
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>
                  Title
                </Label>

                <Input
                  value={
                    item.title
                  }
                  onChange={(event) =>
                    updateItineraryItem(
                      index,
                      "title",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Description
                </Label>

                <Textarea
                  rows={3}
                  value={
                    item.description
                  }
                  onChange={(event) =>
                    updateItineraryItem(
                      index,
                      "description",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          )
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">
              Inclusions
            </h4>

            <p className="text-sm text-muted-foreground">
              What is included in the quotation.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={
                inclusionInput
              }
              placeholder="Example: Airport pickup"
              onChange={(event) =>
                setInclusionInput(
                  event.target.value
                )
              }
            />

            <Button
              type="button"
              variant="outline"
              onClick={
                addInclusion
              }
            >
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {inclusions.map(
              (
                item,
                index
              ) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span>
                    {item}
                  </span>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setInclusions(
                        (current) =>
                          current.filter(
                            (
                              _,
                              itemIndex
                            ) =>
                              itemIndex !==
                              index
                          )
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">
              Exclusions
            </h4>

            <p className="text-sm text-muted-foreground">
              What is not included in the quotation.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={
                exclusionInput
              }
              placeholder="Example: International flights"
              onChange={(event) =>
                setExclusionInput(
                  event.target.value
                )
              }
            />

            <Button
              type="button"
              variant="outline"
              onClick={
                addExclusion
              }
            >
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {exclusions.map(
              (
                item,
                index
              ) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span>
                    {item}
                  </span>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setExclusions(
                        (current) =>
                          current.filter(
                            (
                              _,
                              itemIndex
                            ) =>
                              itemIndex !==
                              index
                          )
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quotation-notes">
          Notes
        </Label>

        <Textarea
          id="quotation-notes"
          rows={4}
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quotation-terms">
          Terms & conditions
        </Label>

        <Textarea
          id="quotation-terms"
          rows={5}
          value={
            termsConditions
          }
          onChange={(event) =>
            setTermsConditions(
              event.target.value
            )
          }
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">
          Unable to create the quotation. Please check the entered values.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          className="flex-1"
          disabled={
            mutation.isPending ||
            isInvalid
          }
          onClick={() =>
            mutation.mutate()
          }
        >
          {mutation.isPending
            ? "Creating..."
            : "Create draft quotation"}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={
            mutation.isPending
          }
          onClick={() =>
            setIsOpen(false)
          }
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}