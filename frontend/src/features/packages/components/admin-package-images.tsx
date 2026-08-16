"use client";

import Image from "next/image";

import { useRef, useState } from "react";

import {
  ImagePlus,
  LoaderCircle,
  Pencil,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import type { PackageImage } from "@/features/packages/package.types";

import {
  deleteAdminPackageImage,
  getPackageImageUrl,
  updateAdminPackageImage,
  uploadAdminPackageImage,
} from "@/features/packages/admin-package.api";

interface AdminPackageImagesProps {
  packageId: number;
  images: PackageImage[];
}

type ImageFormValues = {
  altText: string;
  isPrimary: boolean;
  displayOrder: string;
};

const emptyForm: ImageFormValues = {
  altText: "",
  isPrimary: false,
  displayOrder: "0",
};

export function AdminPackageImages({
  packageId,
  images,
}: AdminPackageImagesProps) {
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState<ImageFormValues>(emptyForm);

  const [editingImageId, setEditingImageId] = useState<number | null>(null);

  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Refresh package information
   * after upload/update/delete.
   */
  const refreshPackage = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin", "package", packageId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["admin", "packages"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["packages"],
    });
  };

  /**
   * Destroy the current temporary
   * browser preview URL.
   */
  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
  };

  /**
   * Remove selected file.
   */
  const clearSelectedFile = () => {
    clearPreview();

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Reset complete image form.
   */
  const resetForm = () => {
    clearPreview();

    setSelectedFile(null);

    setEditingImageId(null);

    setForm(emptyForm);

    setLocalError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Upload new image.
   */
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) {
        throw new Error("No image selected");
      }

      return uploadAdminPackageImage(packageId, {
        file: selectedFile,

        altText: form.altText.trim() || null,

        isPrimary: form.isPrimary,

        displayOrder: Number(form.displayOrder),
      });
    },

    onSuccess: async () => {
      resetForm();

      await refreshPackage();
    },
  });

  /**
   * Update existing image metadata.
   *
   * We do not upload another file here.
   */
  const updateMutation = useMutation({
    mutationFn: () => {
      if (editingImageId === null) {
        throw new Error("No image selected");
      }

      return updateAdminPackageImage(packageId, editingImageId, {
        altText: form.altText.trim() || null,

        isPrimary: form.isPrimary,

        displayOrder: Number(form.displayOrder),
      });
    },

    onSuccess: async () => {
      resetForm();

      await refreshPackage();
    },
  });

  /**
   * Delete image.
   */
  const deleteMutation = useMutation({
    mutationFn: (imageId: number) =>
      deleteAdminPackageImage(packageId, imageId),

    onSuccess: async () => {
      await refreshPackage();
    },
  });

  const isSaving = uploadMutation.isPending || updateMutation.isPending;

  /**
   * Validate selected/dropped image.
   */
  const handleFileSelected = (file: File | null) => {
    setLocalError(null);

    if (!file) {
      clearSelectedFile();

      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      clearSelectedFile();

      setLocalError("Only JPG, PNG and WEBP images are allowed.");

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      clearSelectedFile();

      setLocalError("Image size must be 5 MB or less.");

      return;
    }

    /**
     * Remove previous temporary URL
     * before creating another one.
     */
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl = URL.createObjectURL(file);

    setSelectedFile(file);

    setPreviewUrl(newPreviewUrl);
  };

  /**
   * Drag-and-drop.
   */
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (editingImageId !== null) {
      return;
    }

    const file = event.dataTransfer.files?.[0] ?? null;

    handleFileSelected(file);
  };

  /**
   * Start editing existing image.
   */
  const startEditing = (image: PackageImage) => {
    clearSelectedFile();

    setEditingImageId(image.id);

    setForm({
      altText: image.altText ?? "",

      isPrimary: image.isPrimary,

      displayOrder: String(image.displayOrder),
    });

    setLocalError(null);
  };

  /**
   * Submit either:
   *
   * New image upload
   * OR
   * Existing image metadata update
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLocalError(null);

    const displayOrder = Number(form.displayOrder);

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setLocalError("Display order must be 0 or greater.");

      return;
    }

    /**
     * Update existing image.
     */
    if (editingImageId !== null) {
      try {
        await updateMutation.mutateAsync();
      } catch {
        // Error is rendered below.
      }

      return;
    }

    /**
     * Upload new image.
     */
    if (!selectedFile) {
      setLocalError("Please choose an image from your computer.");

      return;
    }

    try {
      await uploadMutation.mutateAsync();
    } catch {
      // Error is rendered below.
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Package images</h2>

          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Upload high-quality travel photos directly from your computer. Mark
            one image as primary to use it across Travora package cards.
          </p>
        </div>

        <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {images.length} {images.length === 1 ? "image" : "images"}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border bg-muted/20 p-5"
      >
        <div className="flex items-center gap-2">
          <ImagePlus className="size-5 text-muted-foreground" />

          <h3 className="font-medium">
            {editingImageId !== null ? "Edit image" : "Upload image"}
          </h3>
        </div>

        {/* Validation error */}
        {localError && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {localError}
          </div>
        )}

        {/* Upload/update error */}
        {(uploadMutation.isError || updateMutation.isError) && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Unable to save package image. Please check the backend response and
            try again.
          </div>
        )}

        {/* Upload new image */}
        {editingImageId === null ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) =>
                handleFileSelected(event.target.files?.[0] ?? null)
              }
            />

            <div
              role="button"
              tabIndex={0}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();

                  fileInputRef.current?.click();
                }
              }}
              className="mt-5 cursor-pointer rounded-2xl border-2 border-dashed bg-background px-6 py-10 text-center transition hover:border-primary/50 hover:bg-primary/[0.02]"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <UploadCloud className="size-6 text-muted-foreground" />
              </div>

              <h4 className="mt-4 font-semibold">
                {selectedFile ? selectedFile.name : "Drop an image here"}
              </h4>

              <p className="mt-2 text-sm text-muted-foreground">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : "or click to choose an image from your computer"}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                JPG, PNG or WEBP · Maximum 5 MB
              </p>
            </div>

            {/* Preview */}
            {selectedFile && previewUrl && (
              <div className="relative mt-5 overflow-hidden rounded-2xl border bg-muted">
                <div className="relative aspect-[16/7]">
                  <Image
                    src={previewUrl}
                    alt={form.altText || "Package image preview"}
                    fill
                    unoptimized
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>

                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                  aria-label="Remove selected image"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            You are editing this image&apos;s information. The existing image
            file will remain unchanged.
          </div>
        )}

        {/* Metadata fields */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="altText" className="text-sm font-medium">
              Alt text
            </label>

            <input
              id="altText"
              value={form.altText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  altText: event.target.value,
                }))
              }
              placeholder="Train travelling through Ella"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />

            <p className="text-xs text-muted-foreground">
              Describe the image for accessibility and SEO.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="displayOrder" className="text-sm font-medium">
              Display order
            </label>

            <input
              id="displayOrder"
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />

            <p className="text-xs text-muted-foreground">
              Lower numbers appear first.
            </p>
          </div>
        </div>

        {/* Primary */}
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-4">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                isPrimary: event.target.checked,
              }))
            }
            className="mt-1 size-4"
          />

          <div>
            <p className="font-medium">Primary image</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Use this as the main package image. Setting a new primary image
              automatically removes primary status from the previous image.
            </p>
          </div>
        </label>

        {/* Buttons */}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {editingImageId !== null && (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={resetForm}
            >
              Cancel
            </Button>
          )}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : editingImageId !== null ? (
              <Pencil className="size-4" />
            ) : (
              <UploadCloud className="size-4" />
            )}

            {isSaving
              ? "Saving..."
              : editingImageId !== null
                ? "Save changes"
                : "Upload image"}
          </Button>
        </div>
      </form>

      {/* Existing images */}
      <div className="mt-8">
        {images.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
            <ImagePlus className="mx-auto size-8 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No package images yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Upload a high-quality travel image and mark one as primary.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => {
              const imageSrc = getPackageImageUrl(image.imageUrl);

              return (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-2xl border bg-background"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={imageSrc}
                      alt={image.altText ?? "Travel package image"}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />

                    {image.isPrimary && (
                      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950 shadow">
                        <Star className="size-3.5 fill-current" />
                        Primary
                      </span>
                    )}

                    <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                      #{image.displayOrder}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-medium">
                      {image.altText || "No alt text"}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {image.imageUrl}
                    </p>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => startEditing(image)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(
                            "Delete this package image?",
                          );

                          if (confirmed) {
                            deleteMutation.mutate(image.id);
                          }
                        }}
                      >
                        {deleteMutation.isPending ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}