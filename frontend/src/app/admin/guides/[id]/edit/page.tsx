"use client";

import Link from "next/link";

import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, LoaderCircle, UserRoundPen } from "lucide-react";

import {
  getAdminTourGuideById,
  updateAdminTourGuide,
} from "@/features/tour-guides/admin-tour-guide.api";

import { AdminTourGuideForm } from "@/features/tour-guides/components/admin-tour-guide-form";

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

  return "Something went wrong while updating the guide.";
}

export default function EditAdminTourGuidePage() {
  const params = useParams<{
    id: string;
  }>();

  const guideId = params.id;

  const router = useRouter();

  const queryClient = useQueryClient();

  const {
    data: guide,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "guide", guideId],

    queryFn: () => getAdminTourGuideById(guideId),

    enabled: Boolean(guideId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateAdminTourGuide>[1]) =>
      updateAdminTourGuide(guideId, data),

    onSuccess: async (updatedGuide) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "guides"],
      });

      queryClient.setQueryData(["admin", "guide", guideId], updatedGuide);

      router.push("/admin/guides");
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !guide) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold">Unable to load this tour guide</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            The guide may not exist, or may have been deactivated.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition hover:bg-muted"
            >
              Try again
            </button>

            <Link
              href="/admin/guides"
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition hover:bg-muted"
            >
              Back to guides
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

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
            <UserRoundPen className="size-5" />

            <p className="text-sm font-medium uppercase tracking-wide">
              Guide management
            </p>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Edit {fullName}
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Email, password and availability are not editable from this form.
            Manage availability from the guide list.
          </p>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">Unable to update guide</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(updateMutation.error)}
          </p>
        </div>
      )}

      <AdminTourGuideForm
        mode="edit"
        submitLabel="Save changes"
        isSubmitting={updateMutation.isPending}
        initialValues={{
          firstName: guide.user.firstName,
          lastName: guide.user.lastName,
          phone: guide.user.phone ?? "",
          bio: guide.bio ?? "",
          experienceYears: String(guide.experienceYears),
          languages: guide.languages.join(", "),
          specializations: guide.specializations.join(", "),
          location: guide.location ?? "",
          dailyRate: guide.dailyRate ?? "",
        }}
        onSubmit={async (data) => {
          await updateMutation.mutateAsync(
            data as Parameters<typeof updateAdminTourGuide>[1],
          );
        }}
      />
    </main>
  );
}
