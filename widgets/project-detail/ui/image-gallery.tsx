"use client";

import { SHIMMER_DATA_URL } from "@shared/lib/image";
import { cn } from "@shared/lib/utils";
import NextImage from "next/image";
import { useState } from "react";

export interface ImageGalleryProps {
  /** Extra classes for the gallery root (e.g. grid placement). */
  className?: string;
  /** Image URLs in display order. imageUrls[0] is the primary. */
  imageUrls: string[];
  /** Project title for image alt text. */
  title: string;
}

/**
 * Browseable image gallery for the detail page. Shows the primary
 * image (16:10) plus a thumbnail grid beneath it when there is more
 * than one image. Navigation is thumbnail-only: clicking a thumbnail
 * jumps directly to that image. The thumbnails lay out as a 4-up grid
 * on desktop and a horizontal scroll strip on mobile.
 *
 * Renders the next/image with priority on the first image so the
 * detail page hits a fast LCP.
 */
export function ImageGallery({
  className,
  imageUrls,
  title,
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = imageUrls.length;

  if (total === 0) {
    return null;
  }

  const currentUrl = imageUrls[activeIndex] ?? imageUrls[0] ?? "";

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-testid="project-detail-gallery"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden border bg-muted">
        <NextImage
          alt={`${title} 스크린샷 ${activeIndex + 1}/${total}`}
          className="object-contain"
          data-testid="project-detail-primary-image"
          fill
          placeholder={SHIMMER_DATA_URL}
          priority={activeIndex === 0}
          sizes="(max-width: 1024px) 100vw, 700px"
          src={currentUrl}
        />
      </div>
      {total > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          {imageUrls.map((url, idx) => (
            <button
              aria-current={idx === activeIndex ? "true" : "false"}
              aria-label={`${title} 스크린샷 ${idx + 1} 보기`}
              className={cn(
                "relative aspect-[16/10] w-20 shrink-0 overflow-hidden border transition-opacity md:w-auto md:shrink",
                idx === activeIndex
                  ? "border-transparent ring-2 ring-foreground"
                  : "border-border opacity-60 hover:opacity-100"
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
                sizes="160px"
                src={url}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
