"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, UserRoundPlus } from "lucide-react";

import { createAdminTourGuide } from "@/features/tour-guides/admin-tour-guide.api";

import { AdminTourGuideForm } from "@/features/tour-guides/components/admin-tour-guide-form";

export default function CreateAdminTourGuidePage() {
  const router = useRouter();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createAdminTourGuide,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "guides"],
      });

      router.push("/admin/guides");
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/admin/guides"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to guides
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-primary">
            <UserRoundPlus className="size-5" />

            <p className="text-sm font-medium uppercase tracking-wide">
              Guide management
            </p>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Add Tour Guide
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Create a guide account and profile so they can be presented to
            travellers and assigned to bookings.
          </p>
        </div>
      </div>

      {mutation.isError && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">Unable to create guide</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(mutation.error)}
          </p>
        </div>
      )}

      <AdminTourGuideForm
        mode="create"
        submitLabel="Create guide"
        isSubmitting={mutation.isPending}
        onSubmit={async (data) => {
          await mutation.mutateAsync(
            data as Parameters<typeof createAdminTourGuide>[0],
          );
        }}
      />
    </main>
  );
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

  return "Something went wrong while creating the guide.";
}
