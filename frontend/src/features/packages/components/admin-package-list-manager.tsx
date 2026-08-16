"use client";

import { useState } from "react";

import { Check, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  addAdminPackageExclusion,
  addAdminPackageInclusion,
  deleteAdminPackageExclusion,
  deleteAdminPackageInclusion,
  updateAdminPackageExclusion,
  updateAdminPackageInclusion,
} from "@/features/packages/admin-package.api";

import type {
  PackageExclusion,
  PackageInclusion,
} from "@/features/packages/package.types";

type ManagerMode = "inclusions" | "exclusions";

interface AdminPackageListManagerProps {
  packageId: number;

  mode: ManagerMode;

  initialItems: PackageInclusion[] | PackageExclusion[];
}

export function AdminPackageListManager({
  packageId,
  mode,
  initialItems,
}: AdminPackageListManagerProps) {
  const [items, setItems] = useState<PackageInclusion[] | PackageExclusion[]>(
    initialItems,
  );

  const [title, setTitle] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const isInclusion = mode === "inclusions";

  const sectionTitle = isInclusion ? "What's included" : "What's not included";

  const description = isInclusion
    ? "Add services and benefits included with this travel package."
    : "Add expenses or services that are not included in the package price.";

  const addLabel = isInclusion ? "Add inclusion" : "Add exclusion";

  const emptyMessage = isInclusion
    ? "No inclusions added yet."
    : "No exclusions added yet.";

  const resetForm = () => {
    setTitle("");

    setEditingId(null);

    setIsFormOpen(false);

    setError(null);
  };

  const openCreateForm = () => {
    setTitle("");

    setEditingId(null);

    setError(null);

    setIsFormOpen(true);
  };

  const openEditForm = (item: PackageInclusion | PackageExclusion) => {
    setEditingId(item.id);

    setTitle(item.title);

    setError(null);

    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    const cleanedTitle = title.trim();

    if (cleanedTitle.length < 2) {
      setError("Title must contain at least 2 characters.");

      return;
    }

    setIsSaving(true);

    try {
      if (editingId !== null) {
        const updated = isInclusion
          ? await updateAdminPackageInclusion(packageId, editingId, {
              title: cleanedTitle,
            })
          : await updateAdminPackageExclusion(packageId, editingId, {
              title: cleanedTitle,
            });

        setItems((current) =>
          current.map((item) => (item.id === editingId ? updated : item)),
        );
      } else {
        const created = isInclusion
          ? await addAdminPackageInclusion(packageId, {
              title: cleanedTitle,
            })
          : await addAdminPackageExclusion(packageId, {
              title: cleanedTitle,
            });

        setItems((current) => [...current, created]);
      }

      resetForm();
    } catch (requestError) {
      console.error(requestError);

      setError(`Unable to save ${isInclusion ? "inclusion" : "exclusion"}.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: PackageInclusion | PackageExclusion) => {
    const confirmed = window.confirm(`Delete "${item.title}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);

    setError(null);

    try {
      if (isInclusion) {
        await deleteAdminPackageInclusion(packageId, item.id);
      } else {
        await deleteAdminPackageExclusion(packageId, item.id);
      }

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );

      if (editingId === item.id) {
        resetForm();
      }
    } catch (requestError) {
      console.error(requestError);

      setError(`Unable to delete ${isInclusion ? "inclusion" : "exclusion"}.`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isInclusion ? (
              <Check className="size-5 shrink-0 text-green-600" />
            ) : (
              <X className="size-5 shrink-0 text-muted-foreground" />
            )}

            <h2 className="text-xl font-semibold">{sectionTitle}</h2>
          </div>

          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        {!isFormOpen && (
          <Button
            type="button"
            onClick={openCreateForm}
            className="shrink-0 self-start"
          >
            <Plus className="size-4" />

            {addLabel}
          </Button>
        )}
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* =====================================================
          FORM
      ===================================================== */}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border bg-muted/20 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">
              {editingId !== null
                ? `Edit ${isInclusion ? "inclusion" : "exclusion"}`
                : addLabel}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close form"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-5">
            <label htmlFor={`${mode}-title`} className="text-sm font-medium">
              Title
            </label>

            <input
              id={`${mode}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                isInclusion
                  ? "Example: Private air-conditioned transport"
                  : "Example: International airfare"
              }
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : editingId !== null ? (
                <Pencil className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}

              {isSaving
                ? "Saving..."
                : editingId !== null
                  ? "Save changes"
                  : addLabel}
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

      {/* =====================================================
          ITEMS
      ===================================================== */}

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            {isInclusion ? (
              <Check className="mx-auto size-8 text-muted-foreground" />
            ) : (
              <X className="mx-auto size-8 text-muted-foreground" />
            )}

            <p className="mt-3 font-medium">{emptyMessage}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {isInclusion
                ? "Add the services travelers receive with this package."
                : "Add expenses travelers need to arrange or pay separately."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                      isInclusion
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isInclusion ? (
                      <Check className="size-4" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </div>

                  <p className="pt-1 text-sm font-medium">{item.title}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditForm(item)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    {deletingId === item.id ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}