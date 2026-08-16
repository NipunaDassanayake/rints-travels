"use client";

import { useMemo, useState } from "react";

import {
  HelpCircle,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  addAdminPackageFaq,
  deleteAdminPackageFaq,
  updateAdminPackageFaq,
} from "@/features/packages/admin-package.api";

import type { PackageFaq } from "@/features/packages/package.types";

interface AdminPackageFaqsProps {
  packageId: number;
  initialFaqs: PackageFaq[];
}

interface FaqFormState {
  question: string;
  answer: string;
  displayOrder: string;
}

const EMPTY_FORM: FaqFormState = {
  question: "",
  answer: "",
  displayOrder: "0",
};

export function AdminPackageFaqs({
  packageId,
  initialFaqs,
}: AdminPackageFaqsProps) {
  const [faqs, setFaqs] = useState<PackageFaq[]>(initialFaqs);

  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const sortedFaqs = useMemo(
    () => [...faqs].sort((a, b) => a.displayOrder - b.displayOrder),
    [faqs],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);

    setEditingId(null);

    setIsFormOpen(false);

    setError(null);
  };

  const openCreateForm = () => {
    const nextOrder =
      faqs.length > 0
        ? Math.max(...faqs.map((faq) => faq.displayOrder)) + 1
        : 0;

    setEditingId(null);

    setForm({
      question: "",
      answer: "",
      displayOrder: String(nextOrder),
    });

    setError(null);

    setIsFormOpen(true);
  };

  const openEditForm = (faq: PackageFaq) => {
    setEditingId(faq.id);

    setForm({
      question: faq.question,

      answer: faq.answer,

      displayOrder: String(faq.displayOrder),
    });

    setError(null);

    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    const question = form.question.trim();

    const answer = form.answer.trim();

    const displayOrder = Number(form.displayOrder);

    if (question.length < 5) {
      setError("Question must contain at least 5 characters.");

      return;
    }

    if (answer.length < 5) {
      setError("Answer must contain at least 5 characters.");

      return;
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError("Display order must be 0 or greater.");

      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        question,
        answer,
        displayOrder,
      };

      if (editingId !== null) {
        const updated = await updateAdminPackageFaq(
          packageId,
          editingId,
          payload,
        );

        setFaqs((current) =>
          current.map((faq) => (faq.id === editingId ? updated : faq)),
        );
      } else {
        const created = await addAdminPackageFaq(packageId, payload);

        setFaqs((current) => [...current, created]);
      }

      resetForm();
    } catch (requestError) {
      console.error(requestError);

      setError("Unable to save FAQ. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (faq: PackageFaq) => {
    const confirmed = window.confirm(`Delete "${faq.question}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(faq.id);

    setError(null);

    try {
      await deleteAdminPackageFaq(packageId, faq.id);

      setFaqs((current) => current.filter((item) => item.id !== faq.id));

      if (editingId === faq.id) {
        resetForm();
      }
    } catch (requestError) {
      console.error(requestError);

      setError("Unable to delete FAQ.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5" />

            <h2 className="text-xl font-semibold">
              Frequently asked questions
            </h2>
          </div>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add common questions travelers may have about this package.
          </p>
        </div>

        {!isFormOpen && (
          <Button type="button" onClick={openCreateForm}>
            <Plus className="size-4" />
            Add FAQ
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border bg-muted/20 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">
              {editingId !== null ? "Edit FAQ" : "Add FAQ"}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close FAQ form"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-5">
            <div>
              <label htmlFor="faq-question" className="text-sm font-medium">
                Question
              </label>

              <input
                id="faq-question"
                value={form.question}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    question: event.target.value,
                  }))
                }
                placeholder="Example: Can the itinerary be customized?"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            <div>
              <label htmlFor="faq-answer" className="text-sm font-medium">
                Answer
              </label>

              <textarea
                id="faq-answer"
                rows={5}
                value={form.answer}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    answer: event.target.value,
                  }))
                }
                placeholder="Explain the answer clearly for the traveler..."
                className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="max-w-[200px]">
              <label
                htmlFor="faq-display-order"
                className="text-sm font-medium"
              >
                Display order
              </label>

              <input
                id="faq-display-order"
                type="number"
                min="0"
                step="1"
                value={form.displayOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    displayOrder: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Lower numbers appear first.
              </p>
            </div>
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
                  : "Add FAQ"}
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

      <div className="mt-6">
        {sortedFaqs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <HelpCircle className="mx-auto size-8 text-muted-foreground" />

            <p className="mt-3 font-medium">No FAQs added yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add common traveler questions for this package.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {sortedFaqs.map((faq) => (
              <article key={faq.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        #{faq.displayOrder}
                      </span>

                      <div>
                        <h3 className="font-semibold">{faq.question}</h3>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditForm(faq)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === faq.id}
                      onClick={() => handleDelete(faq)}
                    >
                      {deletingId === faq.id ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
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