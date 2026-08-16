"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, PackagePlus } from "lucide-react";

import { createAdminPackage } from "@/features/packages/admin-package.api";

import { AdminPackageForm } from "@/features/packages/components/admin-package-form";

export default function CreateAdminPackagePage() {
  const router = useRouter();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createAdminPackage,

    onSuccess: async (travelPackage) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "packages"],
      });

      router.push(`/admin/packages/${travelPackage.id}/edit`);
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/admin/packages"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to packages
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-primary">
            <PackagePlus className="size-5" />

            <p className="text-sm font-medium uppercase tracking-wide">
              Package management
            </p>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Create Travel Package
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Add the core details for your new journey. After creating it,
            you&apos;ll be able to add photos, itinerary days, inclusions,
            exclusions and FAQs.
          </p>
        </div>
      </div>

      {mutation.isError && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">
            Unable to create package
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(mutation.error)}
          </p>
        </div>
      )}

      <AdminPackageForm
        submitLabel="Create Package"
        isSubmitting={mutation.isPending}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data);
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

  return "Something went wrong while creating the package.";
}