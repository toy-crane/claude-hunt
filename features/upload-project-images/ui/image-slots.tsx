"use client";

import { MAX_PROJECT_IMAGES } from "@entities/project";
import { RiAddLine, RiCloseLine, RiDraggable } from "@remixicon/react";
import {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  validateScreenshotFile,
} from "@shared/lib/screenshot-upload";
import { cn } from "@shared/lib/utils";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@shared/ui/sortable";
import NextImage from "next/image";
import { useCallback, useEffect, useId, useRef } from "react";

export interface ImageSlot {
  file: File;
  id: string;
  preview: string;
}

export interface ImageSlotsProps {
  disabled?: boolean;
  onChange: (slots: ImageSlot[]) => void;
  onError?: (message: string) => void;
  value: ImageSlot[];
}

const ACCEPT = ALLOWED_SCREENSHOT_MIME_TYPES.join(",");

// Stable string keys for the empty trailing thumb slots. Indexes
// would change when items reorder, so we use named placeholders.
const EMPTY_THUMB_KEYS = ["empty-1", "empty-2", "empty-3", "empty-4"] as const;

function makeSlotId(): string {
  return `slot-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Multi-image upload composed of one large primary slot (16:10) plus
 * up to four square thumbnail slots in a row. The first item in the
 * array is the primary image; reordering items via drag promotes a
 * different file to primary.
 *
 * State management is local to this component (not delegated to
 * @reui/use-file-upload) because that hook does not expose a way to
 * replace the array — reorder requires array replacement, and going
 * through clearFiles + addFiles would lose original File references
 * and run validation twice. We do reuse the project's existing
 * validateScreenshotFile so the rules stay in lock-step with single-
 * file uploads, and @reui/sortable still handles all reorder UX.
 */
export function ImageSlots({
  value,
  onChange,
  onError,
  disabled = false,
}: ImageSlotsProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup object URLs when slots are removed.
  const previewsRef = useRef(new Set<string>());
  useEffect(() => {
    const next = new Set(value.map((s) => s.preview));
    for (const old of previewsRef.current) {
      if (!next.has(old)) {
        URL.revokeObjectURL(old);
      }
    }
    previewsRef.current = next;
  }, [value]);

  const handleAdd = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (files.length === 0) {
        return;
      }
      const remaining = MAX_PROJECT_IMAGES - value.length;
      if (files.length > remaining) {
        onError?.("최대 5장까지 업로드할 수 있어요");
        return;
      }
      const next: ImageSlot[] = [];
      for (const file of files) {
        const v = validateScreenshotFile(file);
        if (!v.ok) {
          onError?.(v.error ?? "업로드할 수 없는 파일이에요");
          return;
        }
        next.push({
          id: makeSlotId(),
          file,
          preview: URL.createObjectURL(file),
        });
      }
      onChange([...value, ...next]);
    },
    [value, onChange, onError]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(value.filter((s) => s.id !== id));
    },
    [value, onChange]
  );

  const empties = MAX_PROJECT_IMAGES - value.length;
  const primary = value[0] ?? null;
  const thumbs = value.slice(1);

  return (
    <div className="flex flex-col gap-2" data-testid="image-slots">
      <input
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        id={inputId}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAdd(e.target.files);
            // reset so selecting the same file again still triggers change
            e.target.value = "";
          }
        }}
        ref={inputRef}
        type="file"
      />

      <Sortable
        getItemValue={(slot: ImageSlot) => slot.id}
        onValueChange={onChange}
        strategy="grid"
        value={value}
      >
        {/* Primary slot (16:10) — when filled, renders SortableItem; when empty, renders an upload placeholder */}
        {primary ? (
          <SortableItem
            className="relative block aspect-[16/10] w-full overflow-hidden rounded-md border bg-muted"
            data-testid="image-slot-primary-filled"
            value={primary.id}
          >
            <NextImage
              alt="대표 이미지"
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              src={primary.preview}
            />
            <span className="absolute bottom-2 left-2 rounded-sm bg-primary px-1.5 py-0.5 font-medium text-primary-foreground text-xs">
              대표
            </span>
            <SortableItemHandle className="absolute top-2 left-2 inline-flex size-7 items-center justify-center rounded-sm bg-background/80 text-foreground backdrop-blur hover:bg-background">
              <RiDraggable aria-label="순서 변경" />
            </SortableItemHandle>
            <button
              aria-label="대표 이미지 제거"
              className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-sm bg-background/80 text-foreground backdrop-blur hover:bg-background"
              disabled={disabled}
              onClick={() => handleRemove(primary.id)}
              type="button"
            >
              <RiCloseLine />
            </button>
          </SortableItem>
        ) : (
          <button
            className="relative flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/40 text-muted-foreground hover:bg-muted/60"
            data-testid="image-slot-primary-empty"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <RiAddLine className="size-6" />
            <span className="text-xs">대표 이미지 추가 (필수)</span>
          </button>
        )}

        {/* Secondary slots — 4 in a row */}
        <div className="grid grid-cols-4 gap-2">
          {thumbs.map((slot) => (
            <SortableItem
              className="relative block aspect-square overflow-hidden rounded-md border bg-muted"
              data-testid="image-slot-thumb-filled"
              key={slot.id}
              value={slot.id}
            >
              <NextImage
                alt="썸네일"
                className="object-cover"
                fill
                sizes="120px"
                src={slot.preview}
              />
              <SortableItemHandle className="absolute top-1 left-1 inline-flex size-5 items-center justify-center rounded-sm bg-background/80 text-foreground backdrop-blur hover:bg-background">
                <RiDraggable aria-label="순서 변경" className="size-3" />
              </SortableItemHandle>
              <button
                aria-label="썸네일 이미지 제거"
                className="absolute top-1 right-1 inline-flex size-5 items-center justify-center rounded-sm bg-background/80 text-foreground backdrop-blur hover:bg-background"
                disabled={disabled}
                onClick={() => handleRemove(slot.id)}
                type="button"
              >
                <RiCloseLine className="size-3" />
              </button>
            </SortableItem>
          ))}
          {EMPTY_THUMB_KEYS.slice(
            0,
            Math.max(0, empties - (primary ? 0 : 1))
          ).map((emptyKey) => (
            <button
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border border-dashed bg-muted/40 text-muted-foreground hover:bg-muted/60"
              )}
              data-testid="image-slot-thumb-empty"
              disabled={disabled || empties === 0}
              key={emptyKey}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <RiAddLine className="size-4" />
              <span className="text-[10px]">추가</span>
            </button>
          ))}
        </div>
      </Sortable>

      <p className="text-muted-foreground text-xs">
        첫 번째 이미지가 대표 이미지(보드 썸네일·공유 카드)로 쓰여요. 드래그로
        순서를 바꿀 수 있어요. JPEG · PNG · WebP, 한 장당 최대 25 MB.
      </p>
    </div>
  );
}
