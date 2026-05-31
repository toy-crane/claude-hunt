"use client";

import {
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  type ProjectFieldErrors,
  type ProjectFieldName,
  readProjectFieldValues,
  validateProjectFields,
} from "@entities/project";
import {
  type ScreenshotSlot,
  ScreenshotSlots,
} from "@features/upload-project-screenshots";
import { uploadScreenshot } from "@shared/lib/screenshot-upload";
import { Button } from "@shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { editProject } from "../api/actions";

export interface EditFormInitial {
  githubUrl: string | null;
  projectId: string;
  projectUrl: string;
  /** Storage paths of existing images, in display order. */
  screenshotPaths: string[];
  /** Public URLs of existing images, in display order. */
  screenshotUrls: string[];
  tagline: string;
  title: string;
}

export interface EditFormProps {
  /**
   * Destination for the cancel link and the post-save redirect. Defaults
   * to the project's detail page when not provided. Settings → edit flow
   * passes `/settings` so the user lands back where they started.
   */
  backHref?: string;
  initial: EditFormInitial;
}

interface ExistingSlot {
  id: string;
  path: string;
  url: string;
}

interface NewSlot extends ScreenshotSlot {
  // Distinguishes freshly-uploaded files from existing ones.
  kind: "new";
}

type Slot = (ExistingSlot & { kind: "existing" }) | NewSlot;

/**
 * Owner-only edit form for /projects/[id]/edit. Mirrors the submit
 * form layout including ScreenshotSlots — but the slot list is seeded
 * with the project's existing images. New uploads are detected by
 * shape (slot.file present) and uploaded on save; existing slots
 * pass their stored path through unchanged.
 */
export function EditForm({ backHref, initial }: EditFormProps) {
  const resolvedBackHref = backHref ?? `/projects/${initial.projectId}`;
  const router = useRouter();
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const githubUrlId = useId();
  const [slots, setSlots] = useState<Slot[]>(() =>
    initial.screenshotUrls.map<Slot>((url, idx) => ({
      kind: "existing",
      id: `existing-${idx}`,
      path: initial.screenshotPaths[idx] ?? "",
      url,
    }))
  );
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Clear a field's error as soon as the user edits it, so a corrected
  // field stops showing a stale message before the next submit.
  function clearError(field: ProjectFieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  // The ScreenshotSlots component expects ScreenshotSlot[] (with file/preview);
  // adapt our hybrid Slot[] for it.
  const screenshotSlotsValue: ScreenshotSlot[] = slots.map((slot) => {
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

  // Re-derive Slot[] from the value ScreenshotSlots gives back. Existing
  // slot IDs map back to ExistingSlot; everything else is a NewSlot.
  function handleScreenshotsChange(next: ScreenshotSlot[]) {
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
    clearError("screenshotPaths");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);

    const form = event.currentTarget;
    const values = readProjectFieldValues(form);

    const validationErrors = validateProjectFields(values, slots.length);
    if (validationErrors) {
      setErrors(validationErrors);
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
        setErrors({ screenshotPaths: failed.error ?? "업로드에 실패했어요." });
        return;
      }
      const screenshotPaths = uploadResults.map((r) => r.path as string);

      const result = await editProject({
        projectId: initial.projectId,
        title: values.title,
        tagline: values.tagline,
        projectUrl: values.projectUrl,
        githubUrl:
          values.githubUrl.trim() === "" ? undefined : values.githubUrl,
        screenshotPaths,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "저장하지 못했어요.");
        return;
      }
      toast.success("저장됐어요.");
      router.push(resolvedBackHref);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="프로젝트 편집"
      className="flex flex-col gap-4"
      noValidate
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor={titleId}>제목</FieldLabel>
          <Input
            aria-invalid={errors.title ? true : undefined}
            defaultValue={initial.title}
            disabled={submitting}
            id={titleId}
            maxLength={MAX_TITLE_LENGTH}
            name="title"
            onChange={() => clearError("title")}
            required
          />
          {errors.title ? (
            <FieldError data-testid="edit-form-error-title">
              {errors.title}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.tagline ? true : undefined}>
          <FieldLabel htmlFor={taglineId}>한 줄 소개</FieldLabel>
          <Textarea
            aria-invalid={errors.tagline ? true : undefined}
            defaultValue={initial.tagline}
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            onChange={() => clearError("tagline")}
            required
            rows={2}
          />
          {errors.tagline ? (
            <FieldError data-testid="edit-form-error-tagline">
              {errors.tagline}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.projectUrl ? true : undefined}>
          <FieldLabel htmlFor={urlId}>프로젝트 URL</FieldLabel>
          <Input
            aria-invalid={errors.projectUrl ? true : undefined}
            defaultValue={initial.projectUrl}
            disabled={submitting}
            id={urlId}
            name="projectUrl"
            onChange={() => clearError("projectUrl")}
            required
            type="url"
          />
          {errors.projectUrl ? (
            <FieldError data-testid="edit-form-error-projectUrl">
              {errors.projectUrl}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.githubUrl ? true : undefined}>
          <FieldLabel htmlFor={githubUrlId}>
            GitHub 저장소{" "}
            <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <Input
            aria-invalid={errors.githubUrl ? true : undefined}
            defaultValue={initial.githubUrl ?? ""}
            disabled={submitting}
            id={githubUrlId}
            name="githubUrl"
            onChange={() => clearError("githubUrl")}
            placeholder="https://github.com/owner/repo"
            type="url"
          />
          {errors.githubUrl ? (
            <FieldError data-testid="edit-form-error-githubUrl">
              {errors.githubUrl}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.screenshotPaths ? true : undefined}>
          <FieldLabel>스크린샷</FieldLabel>
          <ScreenshotSlots
            disabled={submitting}
            onChange={handleScreenshotsChange}
            onError={(message) =>
              setErrors((prev) => ({ ...prev, screenshotPaths: message }))
            }
            value={screenshotSlotsValue}
          />
          {errors.screenshotPaths ? (
            <FieldError data-testid="edit-form-error-screenshotPaths">
              {errors.screenshotPaths}
            </FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      {submitError ? (
        <FieldError data-testid="edit-form-submit-error">
          {submitError}
        </FieldError>
      ) : null}

      <div className="flex items-stretch gap-2">
        <Button asChild variant="outline">
          <Link href={resolvedBackHref}>취소</Link>
        </Button>
        <Button className="flex-1" disabled={submitting} type="submit">
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          저장
        </Button>
      </div>
    </form>
  );
}
