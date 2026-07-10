"use client";

import {
  type CollisionDetection,
  type DragEndEvent,
  pointerWithin,
  rectIntersection,
  type UniqueIdentifier,
  useDroppable,
} from "@dnd-kit/core";
import { type AnimateLayoutChanges, arrayMove } from "@dnd-kit/sortable";
import { MAX_PROJECT_IMAGES } from "@entities/project";
import { RiAddLine, RiCloseLine, RiUploadCloud2Line } from "@remixicon/react";
import {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  validateScreenshotFile,
} from "@shared/lib/screenshot-upload";
import { cn } from "@shared/lib/utils";
import {
  defaultSortableAnimateLayoutChanges,
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@shared/ui/sortable";
import NextImage from "next/image";
import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { promoteToPrimary } from "../lib/promote";

// share 클래스 토큰 — 슬롯마다 다른 view-transition-name(name=image-slot-*)에
// 공통 애니메이션 정의를 입힌다. CSS는 app/globals.css의 .morph-slot 규칙.
const MORPH_SHARE_CLASS = "morph-slot";

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

const PRIMARY_DROP_ID = "image-slot-primary-drop-target";

// 포인터 좌표 우선 판정 — 대형 대표 슬롯과 썸네일 셀의 rect 크기 차가
// 커서 rect 교차 비율을 왜곡하므로, 커서가 실제로 올라간 droppable을
// 택한다. 포인터 좌표가 없는 센서(키보드)는 rect 교차로 폴백.
const promoteCollisionDetection: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  return collisions.length > 0 ? collisions : rectIntersection(args);
};

function makeSlotId(): string {
  return `slot-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Multi-image upload composed of one large primary slot (16:10) plus
 * up to four square thumbnail slots in a row. The first item in the
 * array is the primary image.
 *
 * The sortable list contains ONLY the uniform thumbnails; the primary
 * slot is a promote drop target instead of a sortable item. Mixing the
 * two sizes in one list makes rectSortingStrategy preview reorders with
 * non-uniform scale transforms that visibly distort the images.
 *
 * Promoting a thumbnail (by drag or the "대표로 지정" button) commits
 * inside a transition so React's <ViewTransition> can morph the size
 * change instead of an instant swap — dnd-kit's own drop/layout
 * animations don't interpolate size, so without this the promoted image
 * would pop into place.
 *
 * State management is local to this component (not delegated to
 * @reui/use-file-upload) because that hook does not expose a way to
 * replace the array — reorder requires array replacement, and going
 * through clearFiles + addFiles would lose original File references
 * and run validation twice. We do reuse the project's existing
 * validateScreenshotFile so the rules stay in lock-step with single-
 * file uploads.
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
  const [overPromoteTarget, setOverPromoteTarget] = useState(false);

  // 승격 커밋 중에만 true — dnd-kit의 정착 FLIP과 ViewTransition의 morph가
  // 같은 프레임에서 경쟁하지 않도록 FLIP을 끈다. 패시브 이펙트는 dnd-kit의
  // 레이아웃 이펙트보다 늦게 실행되므로, 매 렌더 후 false로 재무장해도
  // 이번 커밋의 FLIP 판단에는 늦지 않는다.
  const suppressFlipRef = useRef(false);
  useEffect(() => {
    suppressFlipRef.current = false;
  });

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

  const primary = value[0] ?? null;
  const thumbs = value.slice(1);

  const handleAdd = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (files.length === 0) {
        return;
      }
      const remaining = MAX_PROJECT_IMAGES - value.length;
      if (files.length > remaining) {
        onError?.("최대 5장까지 업로드할 수 있어요.");
        return;
      }
      const next: ImageSlot[] = [];
      for (const file of files) {
        const v = validateScreenshotFile(file);
        if (!v.ok) {
          onError?.(
            v.error ?? "업로드할 수 없는 파일이에요. 다른 파일을 선택해 주세요."
          );
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

  // 승격/대표 제거는 이 커밋 경로로 — FLIP을 끄고 트랜지션으로 감싸
  // ViewTransition의 크기 morph가 유일한 애니메이션이 되게 한다.
  const commitMorph = useCallback(
    (next: ImageSlot[]) => {
      suppressFlipRef.current = true;
      startTransition(() => onChange(next));
    },
    [onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const next = value.filter((s) => s.id !== id);
      if (id === primary?.id) {
        commitMorph(next);
      } else {
        onChange(next);
      }
    },
    [value, primary, onChange, commitMorph]
  );

  const promote = useCallback(
    (id: string) => {
      commitMorph(promoteToPrimary(value, id));
    },
    [value, commitMorph]
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

  const handleSortValueChange = useCallback(
    (next: ImageSlot[]) => {
      if (primary) {
        onChange([primary, ...next]);
      }
    },
    [primary, onChange]
  );

  // 드롭 위치별 커밋 라우팅. 대표 슬롯은 sortable 아이템이 아니라서
  // overIndex가 -1로 들어오는데, 기본 커밋 경로는 arrayMove(value, i, -1)
  // 로 맨 뒤 이동이 되어버리므로 반드시 여기서 가로챈다.
  const handleMove = useCallback(
    ({
      event,
      activeIndex,
      overIndex,
    }: {
      event: DragEndEvent;
      activeIndex: number;
      overIndex: number;
    }) => {
      if (!primary) {
        return;
      }
      const active = thumbs[activeIndex];
      if (!active) {
        return;
      }
      if (event.over?.id === PRIMARY_DROP_ID) {
        promote(active.id);
        return;
      }
      if (overIndex < 0) {
        return;
      }
      onChange([primary, ...arrayMove(thumbs, activeIndex, overIndex)]);
    },
    [primary, thumbs, onChange, promote]
  );

  // 승격 드롭 중엔 고스트 정착 애니메이션을 꺼서 ViewTransition의 morph만
  // 보이게 한다. drag-end에서는 리셋하지 않는다 — 정착 애니메이션은
  // 드롭된 이후 값을 늦게 읽으므로, 다음 드래그 시작에서만 리셋해도 된다.
  const handleSortDragStart = useCallback(() => {
    setOverPromoteTarget(false);
  }, []);
  const handleSortDragOver = useCallback(
    (event: { over: { id: UniqueIdentifier } | null }) => {
      setOverPromoteTarget(event.over?.id === PRIMARY_DROP_ID);
    },
    []
  );
  const handleSortDragCancel = useCallback(() => {
    setOverPromoteTarget(false);
  }, []);

  const thumbAnimateLayoutChanges: AnimateLayoutChanges = useCallback(
    (args) =>
      !suppressFlipRef.current && defaultSortableAnimateLayoutChanges(args),
    []
  );

  const renderOverlay = useCallback(
    (activeId: UniqueIdentifier) => {
      const slot = value.find((s) => s.id === activeId);
      if (!slot) {
        return null;
      }
      // 살짝 띄운(lift) 고스트 — 집었다는 즉각적인 피드백.
      return (
        <div className="relative h-full w-full scale-[1.03] overflow-hidden rounded-md border bg-muted shadow-lg">
          <NextImage
            alt=""
            className="object-cover"
            fill
            sizes="120px"
            src={slot.preview}
          />
        </div>
      );
    },
    [value]
  );

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
        className="group/sortable flex flex-col gap-3"
        collisionDetection={promoteCollisionDetection}
        dropAnimation={overPromoteTarget ? null : undefined}
        getItemValue={(slot: ImageSlot) => slot.id}
        onDragCancel={handleSortDragCancel}
        onDragOver={handleSortDragOver}
        onDragStart={handleSortDragStart}
        onMove={handleMove}
        onValueChange={handleSortValueChange}
        renderOverlay={renderOverlay}
        strategy="grid"
        value={thumbs}
      >
        {primary ? (
          <PrimarySlot
            disabled={disabled}
            key={primary.id}
            onRemove={() => handleRemove(primary.id)}
            slot={primary}
          />
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
                animateLayoutChanges={thumbAnimateLayoutChanges}
                className="relative aspect-square"
                data-testid="image-slot-thumb-filled"
                disabled={disabled}
                key={slot.id}
                value={slot.id}
              >
                <ViewTransition
                  default="none"
                  name={`image-slot-${slot.id}`}
                  share={MORPH_SHARE_CLASS}
                  update="auto"
                >
                  <div className="absolute inset-0 overflow-hidden rounded-md border bg-muted">
                    <NextImage
                      alt="썸네일"
                      className="object-cover"
                      fill
                      sizes="120px"
                      src={slot.preview}
                    />
                  </div>
                </ViewTransition>
                {/* 타일 전체가 드래그 핸들. 버튼은 이 레이어 위에 온다. */}
                <SortableItemHandle className="absolute inset-0 touch-manipulation" />
                <button
                  aria-label="썸네일 이미지 제거"
                  className="absolute top-1 right-1 inline-flex size-5 items-center justify-center rounded-sm bg-background/80 text-foreground backdrop-blur transition duration-150 ease-out hover:bg-background active:scale-95"
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

/**
 * 대표 슬롯. sortable 아이템이 아니라 승격 드롭 타깃(useDroppable)이다.
 * 드래그 중에는 하이라이트로 예고만 하고 실제 교체는 드롭 커밋이 처리
 * 하므로, 대표 이미지가 드래그 프리뷰 과정에서 변형되는 일이 없다.
 */
function PrimarySlot({
  disabled,
  onRemove,
  slot,
}: {
  disabled: boolean;
  onRemove: () => void;
  slot: ImageSlot;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: PRIMARY_DROP_ID,
    disabled,
  });

  return (
    <div
      className="relative aspect-[16/10] w-full"
      data-testid="image-slot-primary-filled"
      ref={setNodeRef}
    >
      <ViewTransition
        default="none"
        name={`image-slot-${slot.id}`}
        share={MORPH_SHARE_CLASS}
        update="auto"
      >
        <div className="absolute inset-0 overflow-hidden rounded-md border bg-muted">
          <NextImage
            alt="대표 이미지"
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            src={slot.preview}
          />
        </div>
      </ViewTransition>
      <span className="absolute bottom-2 left-2 rounded-sm bg-primary px-1.5 py-0.5 font-medium text-primary-foreground text-xs">
        대표
      </span>
      <button
        aria-label="대표 이미지 제거"
        className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-sm bg-background/80 text-foreground backdrop-blur transition duration-150 ease-out hover:bg-background active:scale-95"
        disabled={disabled}
        onClick={onRemove}
        type="button"
      >
        <RiCloseLine />
      </button>
      {/* 썸네일 드래그 중에만 보이는 승격 타깃 안내 */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 hidden items-center justify-center rounded-md group-data-[dragging=true]/sortable:flex",
          isOver
            ? "bg-primary/15 ring-2 ring-primary ring-inset"
            : "border-2 border-primary/40 border-dashed"
        )}
      >
        <span
          className={cn(
            "rounded-sm bg-primary px-2 py-1 font-medium text-primary-foreground text-xs shadow-sm transition-opacity duration-150 ease-out",
            isOver ? "opacity-100" : "opacity-0"
          )}
        >
          대표로 지정
        </span>
      </div>
    </div>
  );
}
