"use client";

import {
  useState,
} from "react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

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
  adminEditTourRequest,
} from "@/features/tour-requests/admin-tour-request.api";

import type {
  TourRequest,
} from "@/features/tour-requests/tour-request.types";


interface AdminEditTourRequestDialogProps {
  request: TourRequest;
  requestId: string;
}


function toDateInputValue(
  value: string | null
) {
  if (!value) {
    return "";
  }

  return value.slice(
    0,
    10
  );
}


export function AdminEditTourRequestDialog({
  request,
  requestId,
}: AdminEditTourRequestDialogProps) {
  const queryClient =
    useQueryClient();

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    preferredStartDate,
    setPreferredStartDate,
  ] = useState(
    toDateInputValue(
      request.preferredStartDate
    )
  );

  const [
    preferredEndDate,
    setPreferredEndDate,
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
    budget,
    setBudget,
  ] = useState(
    request.budget ?? ""
  );

  const [
    currency,
    setCurrency,
  ] = useState(
    request.currency
  );

  const [
    destinationPreferences,
    setDestinationPreferences,
  ] = useState(
    request.destinationPreferences ??
      ""
  );

  const [
    hotelPreference,
    setHotelPreference,
  ] = useState(
    request.hotelPreference ??
      ""
  );

  const [
    transportPreference,
    setTransportPreference,
  ] = useState(
    request.transportPreference ??
      ""
  );

  const [
    specialRequirements,
    setSpecialRequirements,
  ] = useState(
    request.specialRequirements ??
      ""
  );

  const [
    contactMethod,
    setContactMethod,
  ] = useState(
    request.contactMethod ??
      ""
  );


  const openEditForm = () => {
    setPreferredStartDate(
      toDateInputValue(
        request.preferredStartDate
      )
    );

    setPreferredEndDate(
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

    setBudget(
      request.budget ??
        ""
    );

    setCurrency(
      request.currency
    );

    setDestinationPreferences(
      request.destinationPreferences ??
        ""
    );

    setHotelPreference(
      request.hotelPreference ??
        ""
    );

    setTransportPreference(
      request.transportPreference ??
        ""
    );

    setSpecialRequirements(
      request.specialRequirements ??
        ""
    );

    setContactMethod(
      request.contactMethod ??
        ""
    );

    setIsOpen(true);
  };


  const mutation =
    useMutation({
      mutationFn: () =>
        adminEditTourRequest(
          requestId,
          {
            preferredStartDate,

            preferredEndDate:
              preferredEndDate ||
              null,

            adultCount:
              Number(
                adultCount
              ),

            childCount:
              Number(
                childCount
              ),

            budget:
              budget
                ? Number(
                    budget
                  )
                : null,

            currency:
              currency
                .trim()
                .toUpperCase(),

            destinationPreferences:
              request.requestType ===
              "CUSTOM"
                ? destinationPreferences ||
                  null
                : undefined,

            hotelPreference:
              hotelPreference ||
              null,

            transportPreference:
              transportPreference ||
              null,

            specialRequirements:
              specialRequirements ||
              null,

            contactMethod:
              contactMethod
                ? (
                    contactMethod as
                      | "WHATSAPP"
                      | "PHONE"
                      | "EMAIL"
                  )
                : null,
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
            "admin",
            "tour-requests",
          ],
        });

        setIsOpen(false);
      },
    });


  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={
          openEditForm
        }
      >
        Edit request
      </Button>
    );
  }


  return (
    <div className="space-y-5 rounded-xl border p-4">
      <div>
        <h3 className="font-semibold">
          Edit request
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Update the tourist&apos;s
          requirements after discussion.
        </p>
      </div>


      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="admin-edit-start-date">
            Start date
          </Label>

          <Input
            id="admin-edit-start-date"
            type="date"
            value={
              preferredStartDate
            }
            onChange={(event) =>
              setPreferredStartDate(
                event.target.value
              )
            }
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="admin-edit-end-date">
            End date
          </Label>

          <Input
            id="admin-edit-end-date"
            type="date"
            value={
              preferredEndDate
            }
            onChange={(event) =>
              setPreferredEndDate(
                event.target.value
              )
            }
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="admin-edit-adults">
            Adults
          </Label>

          <Input
            id="admin-edit-adults"
            type="number"
            min="1"
            value={
              adultCount
            }
            onChange={(event) =>
              setAdultCount(
                event.target.value
              )
            }
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="admin-edit-children">
            Children
          </Label>

          <Input
            id="admin-edit-children"
            type="number"
            min="0"
            value={
              childCount
            }
            onChange={(event) =>
              setChildCount(
                event.target.value
              )
            }
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="admin-edit-budget">
            Budget
          </Label>

          <Input
            id="admin-edit-budget"
            type="number"
            min="1"
            value={budget}
            onChange={(event) =>
              setBudget(
                event.target.value
              )
            }
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="admin-edit-currency">
            Currency
          </Label>

          <Input
            id="admin-edit-currency"
            value={currency}
            maxLength={10}
            onChange={(event) =>
              setCurrency(
                event.target.value
              )
            }
          />
        </div>
      </div>


      {request.requestType ===
        "CUSTOM" && (
        <div className="space-y-2">
          <Label htmlFor="admin-edit-destinations">
            Destination preferences
          </Label>

          <Textarea
            id="admin-edit-destinations"
            value={
              destinationPreferences
            }
            onChange={(event) =>
              setDestinationPreferences(
                event.target.value
              )
            }
          />
        </div>
      )}


      <div className="space-y-2">
        <Label htmlFor="admin-edit-hotel">
          Hotel preference
        </Label>

        <Input
          id="admin-edit-hotel"
          value={
            hotelPreference
          }
          onChange={(event) =>
            setHotelPreference(
              event.target.value
            )
          }
        />
      </div>


      <div className="space-y-2">
        <Label htmlFor="admin-edit-transport">
          Transport preference
        </Label>

        <Input
          id="admin-edit-transport"
          value={
            transportPreference
          }
          onChange={(event) =>
            setTransportPreference(
              event.target.value
            )
          }
        />
      </div>


      <div className="space-y-2">
        <Label htmlFor="admin-edit-contact">
          Contact method
        </Label>

        <select
          id="admin-edit-contact"
          value={
            contactMethod
          }
          onChange={(event) =>
            setContactMethod(
              event.target.value
            )
          }
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">
            Not specified
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
        <Label htmlFor="admin-edit-special">
          Special requirements
        </Label>

        <Textarea
          id="admin-edit-special"
          rows={4}
          value={
            specialRequirements
          }
          onChange={(event) =>
            setSpecialRequirements(
              event.target.value
            )
          }
        />
      </div>


      {mutation.isError && (
        <p className="text-sm text-destructive">
          Unable to update the tour
          request. Please check the
          entered values and try again.
        </p>
      )}


      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={
            mutation.isPending
          }
          onClick={() =>
            mutation.mutate()
          }
        >
          {mutation.isPending
            ? "Saving..."
            : "Save changes"}
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