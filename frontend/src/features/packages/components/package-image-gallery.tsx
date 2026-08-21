"use client";

import Image from "next/image";

import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

interface GalleryImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  altText?: string | null;
}

interface PackageImageGalleryProps {
  title: string;
  images: GalleryImage[];
}

export function PackageImageGallery({
  title,
  images,
}: PackageImageGalleryProps) {
  const validImages = useMemo(
    () =>
      [...images]
        .filter((image) => !image.imageUrl.includes("example.com"))
        .sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) {
            return -1;
          }

          if (!a.isPrimary && b.isPrimary) {
            return 1;
          }

          return a.displayOrder - b.displayOrder;
        }),
    [images],
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const isOpen = selectedIndex !== null;

  const closeGallery = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const showPrevious = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      if (validImages.length === 0) {
        return null;
      }

      return (current - 1 + validImages.length) % validImages.length;
    });
  }, [validImages.length]);

  const showNext = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      if (validImages.length === 0) {
        return null;
      }

      return (current + 1) % validImages.length;
    });
  }, [validImages.length]);

  /**
   * =========================================================
   * Keyboard controls
   * =========================================================
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeGallery();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeGallery, showPrevious, showNext]);

  /**
   * =========================================================
   * Prevent background scrolling while lightbox is open
   * =========================================================
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  /**
   * =========================================================
   * Empty gallery
   * =========================================================
   */

  if (validImages.length === 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-muted text-muted-foreground">
        No image available
      </div>
    );
  }

  const primaryImage = validImages[0];

  const secondaryImages = validImages.slice(1, 3);

  return (
    <>
      {/* =====================================================
          HERO GALLERY
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        {/* Primary */}

        <button
          type="button"
          onClick={() => setSelectedIndex(0)}
          className="group relative min-h-[420px] cursor-zoom-in overflow-hidden rounded-[24px] bg-muted text-left sm:min-h-[520px]"
          aria-label={`View ${title} image`}
        >
          <Image
            src={getPackageImageUrl(primaryImage.imageUrl)}
            alt={primaryImage.altText ?? title}
            fill
            unoptimized
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />

          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />

          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg">
            <Images className="size-4" />
            View photos
          </div>
        </button>

        {/* Secondary */}

        <div className="grid gap-3">
          {secondaryImages.map((image, index) => {
            const actualIndex = index + 1;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(actualIndex)}
                className="group relative min-h-[200px] cursor-zoom-in overflow-hidden rounded-[24px] bg-muted sm:min-h-0"
                aria-label={`View ${image.altText ?? title}`}
              >
                <Image
                  src={getPackageImageUrl(image.imageUrl)}
                  alt={image.altText ?? title}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />

                {index === 1 && validImages.length > 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                      +{validImages.length - 3} more
                    </span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Empty placeholders */}

          {secondaryImages.length < 2 &&
            Array.from({
              length: 2 - secondaryImages.length,
            }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="min-h-[200px] rounded-[24px] bg-muted sm:min-h-0"
              />
            ))}
        </div>
      </div>

      {/* =====================================================
          LIGHTBOX
      ===================================================== */}

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image gallery`}
          onClick={closeGallery}
        >
          {/* Close */}

          <button
            type="button"
            onClick={closeGallery}
            className="absolute right-5 top-5 z-20 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close gallery"
          >
            <X className="size-6" />
          </button>

          {/* Counter */}

          <div className="absolute left-5 top-5 z-20 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
            {selectedIndex + 1} / {validImages.length}
          </div>

          {/* Previous */}

          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                showPrevious();
              }}
              className="absolute left-3 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-7" />
            </button>
          )}

          {/* Image */}

          <div
            className="relative h-[80vh] w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={getPackageImageUrl(validImages[selectedIndex].imageUrl)}
              alt={validImages[selectedIndex].altText ?? title}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {/* Next */}

          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                showNext();
              }}
              className="absolute right-3 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
              aria-label="Next image"
            >
              <ChevronRight className="size-7" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
