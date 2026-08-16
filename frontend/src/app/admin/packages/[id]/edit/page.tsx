"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  ExternalLink,
  LoaderCircle,
  PackageOpen,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { AdminPackageImages } from "@/features/packages/components/admin-package-images";

import {
  getAdminPackageById,
  updateAdminPackage,
} from "@/features/packages/admin-package.api";

import {
  AdminPackageForm,
  type PackageFormValues,
} from "@/features/packages/components/admin-package-form";

export default function EditAdminPackagePage() {
  const params = useParams<{
    id: string;
  }>();

  const packageId = Number(params.id);

  const queryClient = useQueryClient();

  const {
    data: travelPackage,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "package", packageId],

    queryFn: () => getAdminPackageById(packageId),

    enabled: Number.isFinite(packageId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateAdminPackage>[1]) =>
      updateAdminPackage(packageId, data),

    onSuccess: async (updatedPackage) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "package", packageId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "packages"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["packages"],
      });

      queryClient.setQueryData(["admin", "package", packageId], updatedPackage);
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !travelPackage) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load package</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The package could not be loaded.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Try again
            </button>

            <Link
              href="/admin/packages"
              className={buttonVariants({
                variant: "ghost",
              })}
            >
              Back to packages
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const initialValues: PackageFormValues = {
    title: travelPackage.title,

    slug: travelPackage.slug,

    destination: travelPackage.destination,

    description: travelPackage.description,

    durationDays: String(travelPackage.durationDays),

    price: String(travelPackage.price),

    status: travelPackage.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/admin/packages"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to packages
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <PackageOpen className="size-5" />

              <p className="text-sm font-medium uppercase tracking-wide">
                Package management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Edit Travel Package
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground">
              Update package information, visibility, pricing, and travel
              details.
            </p>
          </div>

          <Link
            href={`/packages/${travelPackage.slug}`}
            target="_blank"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View public page
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>

      {updateMutation.isSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Package updated successfully.
        </div>
      )}

      {updateMutation.isError && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="font-medium text-destructive">
            Unable to update package
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(updateMutation.error)}
          </p>
        </div>
      )}

      <AdminPackageForm
        key={travelPackage.updatedAt}
        initialValues={initialValues}
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={async (data) => {
          await updateMutation.mutateAsync(data);
        }}
      />

      <div className="mt-8">
        <AdminPackageImages
          packageId={travelPackage.id}
          images={travelPackage.images}
        />
      </div>

      <div className="mt-10 rounded-2xl border border-dashed p-6">
        <h2 className="text-lg font-semibold">Package content</h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Images, itinerary days, inclusions, exclusions, and FAQs will be
          managed here next.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">Images</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {travelPackage.images.length} added
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">Itinerary</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {travelPackage.itineraries.length} days
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">Inclusions</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {travelPackage.inclusions.length} items
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">Exclusions</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {travelPackage.exclusions.length} items
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">FAQs</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {travelPackage.faqs.length} added
            </p>
          </div>
        </div>
      </div>
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

  return "Something went wrong while updating the package.";
}
