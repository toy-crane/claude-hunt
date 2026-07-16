"use client";

import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { SHIMMER_DATA_URL } from "@shared/lib/image";
import { cn } from "@shared/lib/utils";
import NextImage from "next/image";
import { useCallback, useState } from "react";

export interface ImageGalleryProps {
  /** Image URLs in display order. imageUrls[0] is the primary. */
  imageUrls: string[];
  /** Project title for image alt text. */
  title: string;
}

/**
 * Browseable image gallery for the detail page. Shows the primary
 * image (16:10) plus a thumbnail strip beneath it when there is more
 * than one image. Left/right arrows wrap around at the ends. Clicking
 * a thumbnail jumps directly to that image.
 *
 * Every slide stays mounted, stacked in the 16:10 box, and navigation
 * cross-fades opacity instead of swapping `src` — images decode once,
 * so switching never flashes the shimmer placeholder. The trade-off is
 * that all gallery images (max 5) load on mount. Only the first image
 * gets priority for LCP.
 */
export function ImageGallery({ imageUrls, title }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = imageUrls.length;
  // A revalidation can hand a still-mounted gallery a shorter `imageUrls` (the
  // owner removed images) without resetting state, leaving `activeIndex` past
  // the end — and then no slide matches it and the box renders blank. Fall back
  // to the first image, as the pre-cross-fade `imageUrls[activeIndex] ??
  // imageUrls[0]` did.
  const safeIndex = activeIndex < total ? activeIndex : 0;

  const goPrev = useCallback(() => {
    setActiveIndex(safeIndex === 0 ? total - 1 : safeIndex - 1);
  }, [safeIndex, total]);
  const goNext = useCallback(() => {
    setActiveIndex(safeIndex === total - 1 ? 0 : safeIndex + 1);
  }, [safeIndex, total]);

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2" data-testid="project-detail-gallery">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border bg-muted">
        {imageUrls.map((url, idx) => {
          const active = idx === safeIndex;
          return (
            <NextImage
              alt={`${title} 스크린샷 ${idx + 1}/${total}`}
              aria-hidden={active ? undefined : true}
              className={cn(
                "object-contain transition-opacity duration-200 ease-out",
                active ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              data-active={active ? "true" : "false"}
              data-testid="project-detail-primary-image"
              fill
              key={url}
              placeholder={SHIMMER_DATA_URL}
              priority={idx === 0}
              sizes="(max-width: 768px) 100vw, 768px"
              src={url}
            />
          );
        })}
        {total > 1 ? (
          <>
            <button
              aria-label="이전 이미지"
              className="absolute top-1/2 left-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-background active:scale-[0.97]"
              data-testid="project-detail-gallery-prev"
              onClick={goPrev}
              type="button"
            >
              <RiArrowLeftSLine />
            </button>
            <button
              aria-label="다음 이미지"
              className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-background active:scale-[0.97]"
              data-testid="project-detail-gallery-next"
              onClick={goNext}
              type="button"
            >
              <RiArrowRightSLine />
            </button>
          </>
        ) : null}
      </div>
      {total > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto p-1"
          data-testid="project-detail-gallery-strip"
        >
          {imageUrls.map((url, idx) => (
            <button
              aria-current={idx === safeIndex ? "true" : "false"}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border transition-opacity duration-150 ease-out",
                idx === safeIndex
                  ? "border-transparent ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "border-border opacity-70 hover:opacity-100"
              )}
              data-testid="project-detail-gallery-thumb"
              key={url}
              onClick={() => setActiveIndex(idx)}
              type="button"
            >
              <NextImage
                alt={`${title} 썸네일 ${idx + 1}`}
                className="object-cover"
                fill
                placeholder={SHIMMER_DATA_URL}
                sizes="64px"
                src={url}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
