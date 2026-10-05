"use client";

import Image from "next/image";

import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

import { useRef, useState, useSyncExternalStore } from "react";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import { cn } from "@/lib/utils";

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

/** Preview tiles shown at `sm` and up; the lightbox holds every photo. */
const MAX_PREVIEWS = 3;

const noopSubscribe = () => () => {};

/*
 * Package gallery (CR-029 Stage 4C).
 *
 * Adapts to the photo count: phones show one 4:3 image; from `sm`
 * one wide image, two equal images, or a main image with two tiles.
 * Images keep the API order (primary first, then display order).
 *
 * Each preview is a figure with the real image (its alt text is the
 * content) and a full-cover control named for the action. Without
 * JavaScript that control is a plain link to the full-size image;
 * once hydrated it opens an accessible lightbox built on the CR-028
 * Dialog (focus moves in, is trapped, and returns to the opener).
 * A <noscript> list keeps every photo reachable without JavaScript.
 */
export function PackageImageGallery({ title, images }: PackageImageGalleryProps) {
  const photos = images.filter((image) => !image.imageUrl.includes("example.com"));

  const count = photos.length;

  // false on the server and during hydration, true afterwards.
  const enhanced = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [index, setIndex] = useState<number | null>(null);

  const openerRef = useRef<HTMLElement | null>(null);

  if (count === 0) {
    return null;
  }

  const altFor = (photo: GalleryImage) => photo.altText || title;

  const open = (at: number, opener: HTMLElement) => {
    openerRef.current = opener;

    setIndex(at);
  };

  const step = (delta: number) => {
    setIndex((current) => (current === null ? current : (current + delta + count) % count));
  };

  const previews = photos.slice(0, MAX_PREVIEWS);

  const layout =
    count === 1
      ? "sm:grid-cols-1"
      : count === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:grid-rows-2";

  const controlLabel = (at: number) => (count === 1 ? "Open photo" : `Open photo ${at + 1} of ${count}`);

  const current = index === null ? null : photos[index];

  return (
    <>
      <div className={cn("relative grid gap-2 sm:h-80 sm:gap-3 lg:h-[26rem]", layout)}>
        {previews.map((photo, at) => (
          <figure
            key={photo.id}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-sand-100",
              at === 0 ? "aspect-[4/3] sm:aspect-auto" : "hidden sm:block",
              at === 0 && count >= 3 && "sm:row-span-2",
            )}
          >
            <Image
              src={getPackageImageUrl(photo.imageUrl)}
              alt={altFor(photo)}
              fill
              unoptimized
              loading={at === 0 ? "eager" : "lazy"}
              fetchPriority={at === 0 ? "high" : "auto"}
              sizes={at === 0 ? "(min-width: 640px) 66vw, 100vw" : "(min-width: 640px) 33vw, 100vw"}
              className="object-cover transition-transform duration-slower ease-standard group-hover:scale-[1.02] motion-reduce:transition-none"
            />

            {enhanced ? (
              <button
                type="button"
                aria-label={controlLabel(at)}
                aria-haspopup="dialog"
                onClick={(event) => open(at, event.currentTarget)}
                className="absolute inset-0 cursor-zoom-in rounded-2xl"
              />
            ) : (
              <a
                href={getPackageImageUrl(photo.imageUrl)}
                aria-label={`${controlLabel(at)} (full size)`}
                className="absolute inset-0 rounded-2xl"
              />
            )}
          </figure>
        ))}

        {enhanced && count > 1 && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={(event) => open(0, event.currentTarget)}
            className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-card/95 px-4 text-label text-foreground shadow-md transition-colors duration-fast hover:bg-card sm:bottom-4 sm:right-4"
          >
            <Images aria-hidden="true" className="size-4" />
            View all {count} photos
          </button>
        )}
      </div>

      {/*
        Without JavaScript some photos are not previewed (phones show one,
        larger screens three), so list them all as plain links. Browsers
        with JavaScript never render this.
      */}
      {count > 1 && (
        <noscript>
          <ul aria-label="All photos" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-label">
            {photos.map((photo, at) => (
              <li key={photo.id}>
                <a
                  href={getPackageImageUrl(photo.imageUrl)}
                  className="inline-flex min-h-10 items-center text-tea-700 underline underline-offset-4"
                >
                  Photo {at + 1} of {count}
                </a>
              </li>
            ))}
          </ul>
        </noscript>
      )}

      <Dialog
        open={index !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIndex(null);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay className="bg-ink-950 supports-backdrop-filter:backdrop-blur-none" />

          <DialogPrimitive.Popup
            finalFocus={openerRef}
            aria-modal="true"
            data-surface="dark"
            onKeyDown={(event) => {
              if (count > 1 && event.key === "ArrowRight") {
                event.preventDefault();
                step(1);
              }

              if (count > 1 && event.key === "ArrowLeft") {
                event.preventDefault();
                step(-1);
              }
            }}
            className="fixed inset-0 z-60 flex flex-col text-ivory outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          >
            <div className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-6">
              <DialogTitle className="truncate text-label font-medium text-ink-200">{title}</DialogTitle>

              <DialogClose
                aria-label="Close photos"
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-950/60 text-ivory ring-1 ring-white/25 transition-colors duration-fast hover:bg-ink-800"
              >
                <X aria-hidden="true" className="size-6" />
              </DialogClose>
            </div>

            <div className="relative mx-4 my-4 min-h-0 flex-1 sm:mx-6">
              {current && (
                <Image
                  key={current.id}
                  src={getPackageImageUrl(current.imageUrl)}
                  alt={altFor(current)}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-4 px-4 pb-6 sm:gap-6">
              {count > 1 && (
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => step(-1)}
                  className="inline-flex size-12 items-center justify-center rounded-full bg-ink-950/60 text-ivory ring-1 ring-white/25 transition-colors duration-fast hover:bg-ink-800"
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                </button>
              )}

              <DialogDescription
                aria-live="polite"
                aria-atomic="true"
                className={cn("min-w-28 text-center text-label text-ink-200", count === 1 && "sr-only")}
              >
                Photo {(index ?? 0) + 1} of {count}
              </DialogDescription>

              {count > 1 && (
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => step(1)}
                  className="inline-flex size-12 items-center justify-center rounded-full bg-ink-950/60 text-ivory ring-1 ring-white/25 transition-colors duration-fast hover:bg-ink-800"
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                </button>
              )}
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
