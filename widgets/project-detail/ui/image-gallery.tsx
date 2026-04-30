"use client";

import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
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
 * Renders the next/image with priority on the visible image so the
 * detail page hits a fast LCP.
 */
export function ImageGallery({ imageUrls, title }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = imageUrls.length;

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? total - 1 : i - 1));
  }, [total]);
  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === total - 1 ? 0 : i + 1));
  }, [total]);

  if (total === 0) {
    return null;
  }

  const currentUrl = imageUrls[activeIndex] ?? imageUrls[0] ?? "";

  return (
    <div className="flex flex-col gap-2" data-testid="project-detail-gallery">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border bg-muted">
        <NextImage
          alt={`${title} 스크린샷 ${activeIndex + 1}/${total}`}
          className="object-cover"
          data-testid="project-detail-primary-image"
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 768px) 100vw, 768px"
          src={currentUrl}
        />
        {total > 1 ? (
          <>
            <button
              aria-label="이전 이미지"
              className="absolute top-1/2 left-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-background"
              data-testid="project-detail-gallery-prev"
              onClick={goPrev}
              type="button"
            >
              <RiArrowLeftSLine />
            </button>
            <button
              aria-label="다음 이미지"
              className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-background"
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
          className="flex gap-2 overflow-x-auto"
          data-testid="project-detail-gallery-strip"
        >
          {imageUrls.map((url, idx) => (
            <button
              aria-current={idx === activeIndex ? "true" : "false"}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border",
                idx === activeIndex
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
