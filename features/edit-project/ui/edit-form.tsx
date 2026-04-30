"use client";

import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "@entities/project";
import { type ImageSlot, ImageSlots } from "@features/upload-project-images";
import { uploadScreenshot } from "@shared/lib/screenshot-upload";
import { Button } from "@shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { editProject } from "../api/actions";

export interface EditFormInitial {
  githubUrl: string | null;
  /** Storage paths of existing images, in display order. */
  imagePaths: string[];
  /** Public URLs of existing images, in display order. */
  imageUrls: string[];
  projectId: string;
  projectUrl: string;
  tagline: string;
  title: string;
}

export interface EditFormProps {
  initial: EditFormInitial;
}

interface ExistingSlot {
  id: string;
  path: string;
  url: string;
}

interface NewSlot extends ImageSlot {
  // Distinguishes freshly-uploaded files from existing ones.
  kind: "new";
}

type Slot = (ExistingSlot & { kind: "existing" }) | NewSlot;

/**
 * Owner-only edit form for /projects/[id]/edit. Mirrors the submit
 * form layout including ImageSlots — but the slot list is seeded
 * with the project's existing images. New uploads are detected by
 * shape (slot.file present) and uploaded on save; existing slots
 * pass their stored path through unchanged.
 */
export function EditForm({ initial }: EditFormProps) {
  const router = useRouter();
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const githubUrlId = useId();
  const [slots, setSlots] = useState<Slot[]>(() =>
    initial.imageUrls.map<Slot>((url, idx) => ({
      kind: "existing",
      id: `existing-${idx}`,
      path: initial.imagePaths[idx] ?? "",
      url,
    }))
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The ImageSlots component expects ImageSlot[] (with file/preview);
  // adapt our hybrid Slot[] for it.
  const imageSlotsValue: ImageSlot[] = slots.map((slot) => {
    if (slot.kind === "existing") {
      return {
        id: slot.id,
        // Sentinel File so Sortable + remove/preview keep working;
        // the file is never uploaded because we detect existing slots
        // by their `id` matching one of the originals.
        file: new File([], "", { type: "image/webp" }),
        preview: slot.url,
      };
    }
    return slot;
  });

  // Re-derive Slot[] from the value ImageSlots gives back. Existing
  // slot IDs map back to ExistingSlot; everything else is a NewSlot.
  function handleImagesChange(next: ImageSlot[]) {
    const existingById = new Map<string, ExistingSlot & { kind: "existing" }>();
    for (const s of slots) {
      if (s.kind === "existing") {
        existingById.set(s.id, s);
      }
    }
    const reconciled: Slot[] = next.map((entry) => {
      const existing = existingById.get(entry.id);
      if (existing) {
        return existing;
      }
      return { kind: "new", ...entry };
    });
    setSlots(reconciled);
  }

  // Cleanup any object URLs whenever the slot set changes; safe to
  // also call on existing public URLs (revokeObjectURL is a no-op
  // for non-blob URLs).
  useEffect(() => {
    return () => {
      for (const slot of slots) {
        if (slot.kind === "new") {
          URL.revokeObjectURL(slot.preview);
        }
      }
    };
  }, [slots]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    const form = event.currentTarget;
    const elements = form.elements;
    const titleEl = elements.namedItem("title") as HTMLInputElement | null;
    const taglineEl = elements.namedItem(
      "tagline"
    ) as HTMLTextAreaElement | null;
    const urlEl = elements.namedItem("projectUrl") as HTMLInputElement | null;
    const githubUrlEl = elements.namedItem(
      "githubUrl"
    ) as HTMLInputElement | null;

    if (slots.length === 0) {
      setFieldError("스크린샷을 1장 이상 첨부해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload only the new slots; existing slots keep their path.
      const uploadResults: { error?: string; path?: string }[] =
        await Promise.all(
          slots.map((slot) => {
            if (slot.kind === "existing") {
              return Promise.resolve<{ error?: string; path?: string }>({
                path: slot.path,
              });
            }
            return uploadScreenshot(slot.file);
          })
        );
      const failed = uploadResults.find((r) => r.error || !r.path);
      if (failed) {
        setFieldError(failed.error ?? "업로드에 실패했어요.");
        return;
      }
      const imagePaths = uploadResults.map((r) => r.path as string);

      const githubUrlValue = (githubUrlEl?.value ?? "").trim();
      const result = await editProject({
        projectId: initial.projectId,
        title: titleEl?.value ?? "",
        tagline: taglineEl?.value ?? "",
        projectUrl: urlEl?.value ?? "",
        githubUrl: githubUrlValue === "" ? undefined : githubUrlValue,
        imagePaths,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "저장하지 못했어요.");
        return;
      }
      toast.success("저장됐어요.");
      router.push(`/projects/${initial.projectId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="프로젝트 편집"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={titleId}>제목</FieldLabel>
          <Input
            defaultValue={initial.title}
            disabled={submitting}
            id={titleId}
            maxLength={MAX_TITLE_LENGTH}
            name="title"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={taglineId}>한 줄 소개</FieldLabel>
          <Textarea
            defaultValue={initial.tagline}
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            required
            rows={2}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={urlId}>프로젝트 URL</FieldLabel>
          <Input
            defaultValue={initial.projectUrl}
            disabled={submitting}
            id={urlId}
            name="projectUrl"
            required
            type="url"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={githubUrlId}>
            GitHub 저장소{" "}
            <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <Input
            defaultValue={initial.githubUrl ?? ""}
            disabled={submitting}
            id={githubUrlId}
            name="githubUrl"
            placeholder="https://github.com/owner/repo"
            type="url"
          />
        </Field>

        <Field>
          <FieldLabel>스크린샷</FieldLabel>
          <ImageSlots
            disabled={submitting}
            onChange={handleImagesChange}
            onError={setFieldError}
            value={imageSlotsValue}
          />
        </Field>
      </FieldGroup>

      {fieldError ? (
        <p
          className="text-destructive text-xs"
          data-testid="edit-form-field-error"
          role="alert"
        >
          {fieldError}
        </p>
      ) : null}
      {submitError ? (
        <p
          className="text-destructive text-xs"
          data-testid="edit-form-submit-error"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <div className="flex items-stretch gap-2">
        <Button asChild variant="outline">
          <Link href={`/projects/${initial.projectId}`}>취소</Link>
        </Button>
        <Button className="flex-1" disabled={submitting} type="submit">
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {submitting ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}
