"use client";

import { MAX_PROJECT_IMAGES } from "@entities/project";
import {
  RiAddLine,
  RiCloseLine,
  RiDraggable,
  RiUploadCloud2Line,
} from "@remixicon/react";
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
import { useCallback, useEffect, useId, useRef, useState } from "react";

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
  const [dragging, setDragging] = useState(false);

  // Track every preview URL we've created so we can revoke on remove
  // and on unmount. revokeObjectURL is a no-op for non-blob URLs, so
  // it's safe to call even on the public storage URLs that EditForm
  // seeds in.
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
  useEffect(
    () => () => {
      for (const url of previewsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewsRef.current = new Set();
    },
    []
  );

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

  const canAddMore = value.length < MAX_PROJECT_IMAGES;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !canAddMore) {
        return;
      }
      // Required so the browser doesn't open the file in a new tab on drop.
      e.preventDefault();
      setDragging(true);
    },
    [disabled, canAddMore]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // dragleave fires when crossing into a child element too — ignore
    // those by checking whether the cursor is still inside the box.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) {
      return;
    }
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) {
        return;
      }
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleAdd(e.dataTransfer.files);
      }
    },
    [disabled, handleAdd]
  );

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
        className="flex flex-col gap-3"
        getItemValue={(slot: ImageSlot) => slot.id}
        onValueChange={onChange}
        strategy="grid"
        value={value}
      >
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
            className={cn(
              "relative flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60",
              dragging && "border-primary bg-primary/5 text-primary"
            )}
            data-testid="image-slot-primary-empty"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            type="button"
          >
            <RiUploadCloud2Line className="size-8" />
            <span className="font-medium text-sm">
              이미지를 끌어다 놓거나 클릭해서 추가
            </span>
            <span className="text-xs">최대 {MAX_PROJECT_IMAGES}장</span>
          </button>
        )}

        {primary ? (
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
            {canAddMore ? (
              <button
                aria-label="이미지 추가"
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60",
                  dragging && "border-primary bg-primary/5 text-primary"
                )}
                data-testid="image-slot-thumb-empty"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                type="button"
              >
                <RiAddLine className="size-5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </Sortable>

      {primary ? (
        <p className="text-right text-muted-foreground text-xs tabular-nums">
          {value.length} / {MAX_PROJECT_IMAGES}
        </p>
      ) : null}
    </div>
  );
}
