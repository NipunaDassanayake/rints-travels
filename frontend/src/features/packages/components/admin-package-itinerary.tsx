"use client";

import { useMemo, useState } from "react";

import {
  CalendarDays,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  addAdminPackageItinerary,
  deleteAdminPackageItinerary,
  updateAdminPackageItinerary,
} from "@/features/packages/admin-package.api";

import type { PackageItinerary } from "@/features/packages/package.types";

interface AdminPackageItineraryProps {
  packageId: number;
  initialItineraries: PackageItinerary[];
}

interface ItineraryFormState {
  dayNumber: string;
  title: string;
  description: string;
}

const EMPTY_FORM: ItineraryFormState = {
  dayNumber: "",
  title: "",
  description: "",
};

export function AdminPackageItinerary({
  packageId,
  initialItineraries,
}: AdminPackageItineraryProps) {
  const [itineraries, setItineraries] =
    useState<PackageItinerary[]>(initialItineraries);

  const [form, setForm] = useState<ItineraryFormState>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const sortedItineraries = useMemo(
    () => [...itineraries].sort((a, b) => a.dayNumber - b.dayNumber),
    [itineraries],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);

    setEditingId(null);

    setIsFormOpen(false);

    setError(null);
  };

  const openCreateForm = () => {
    const nextDay =
      itineraries.length > 0
        ? Math.max(...itineraries.map((item) => item.dayNumber)) + 1
        : 1;

    setEditingId(null);

    setForm({
      dayNumber: String(nextDay),

      title: "",

      description: "",
    });

    setError(null);

    setIsFormOpen(true);
  };

  const openEditForm = (itinerary: PackageItinerary) => {
    setEditingId(itinerary.id);

    setForm({
      dayNumber: String(itinerary.dayNumber),

      title: itinerary.title,

      description: itinerary.description,
    });

    setError(null);

    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    const dayNumber = Number(form.dayNumber);

    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      setError("Day number must be a positive whole number.");

      return;
    }

    if (form.title.trim().length < 3) {
      setError("Title must contain at least 3 characters.");

      return;
    }

    if (form.description.trim().length < 5) {
      setError("Description must contain at least 5 characters.");

      return;
    }

    const duplicateDay = itineraries.some(
      (item) => item.dayNumber === dayNumber && item.id !== editingId,
    );

    if (duplicateDay) {
      setError(`Day ${dayNumber} already exists.`);

      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        dayNumber,

        title: form.title.trim(),

        description: form.description.trim(),
      };

      if (editingId !== null) {
        const updated = await updateAdminPackageItinerary(
          packageId,
          editingId,
          payload,
        );

        setItineraries((current) =>
          current.map((item) => (item.id === editingId ? updated : item)),
        );
      } else {
        const created = await addAdminPackageItinerary(packageId, payload);

        setItineraries((current) => [...current, created]);
      }

      resetForm();
    } catch (requestError) {
      console.error(requestError);

      setError("Unable to save the itinerary. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itinerary: PackageItinerary) => {
    const confirmed = window.confirm(
      `Delete Day ${itinerary.dayNumber}: ${itinerary.title}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(itinerary.id);

    setError(null);

    try {
      await deleteAdminPackageItinerary(packageId, itinerary.id);

      setItineraries((current) =>
        current.filter((item) => item.id !== itinerary.id),
      );

      if (editingId === itinerary.id) {
        resetForm();
      }
    } catch (requestError) {
      console.error(requestError);

      setError("Unable to delete the itinerary item.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* Header */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5" />

            <h2 className="text-xl font-semibold">Itinerary</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Build the package journey day by day.
          </p>
        </div>

        {!isFormOpen && (
          <Button type="button" onClick={openCreateForm}>
            <Plus className="size-4" />
            Add Day
          </Button>
        )}
      </div>

      {/* Error */}

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add / Edit Form */}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border bg-slate-50 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">
              {editingId !== null ? "Edit itinerary day" : "Add itinerary day"}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-slate-200 hover:text-slate-950"
              aria-label="Close itinerary form"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-5">
            {/* Day Number */}

            <div>
              <label
                htmlFor="itinerary-day-number"
                className="text-sm font-medium"
              >
                Day number
              </label>

              <input
                id="itinerary-day-number"
                type="number"
                min="1"
                value={form.dayNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    dayNumber: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-[180px]"
                required
              />
            </div>

            {/* Title */}

            <div>
              <label htmlFor="itinerary-title" className="text-sm font-medium">
                Title
              </label>

              <input
                id="itinerary-title"
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    title: event.target.value,
                  }))
                }
                placeholder="Example: Sigiriya & Dambulla"
                className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            {/* Description */}

            <div>
              <label
                htmlFor="itinerary-description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="itinerary-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    description: event.target.value,
                  }))
                }
                placeholder="Describe what the traveler will experience on this day..."
                rows={5}
                className="mt-2 w-full resize-y rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4" />

                  {editingId !== null ? "Save Changes" : "Add Day"}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Existing itinerary */}

      <div className="mt-6">
        {sortedItineraries.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-muted-foreground" />

            <p className="mt-3 font-medium">No itinerary added yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add Day 1 to start building this journey.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedItineraries.map((itinerary) => (
              <article key={itinerary.id} className="rounded-xl border p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                      {itinerary.dayNumber}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        Day {itinerary.dayNumber}
                      </p>

                      <h3 className="mt-1 text-base font-semibold">
                        {itinerary.title}
                      </h3>

                      <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {itinerary.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(itinerary)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === itinerary.id}
                      onClick={() => handleDelete(itinerary)}
                    >
                      {deletingId === itinerary.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}