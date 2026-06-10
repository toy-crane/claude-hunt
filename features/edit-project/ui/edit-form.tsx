"use client";

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  type ProjectFieldErrors,
  type ProjectFieldName,
  readProjectFieldValues,
  validateProjectFields,
} from "@entities/project";
import { type ImageSlot, ImageSlots } from "@features/upload-project-images";
import { uploadScreenshot } from "@shared/lib/screenshot-upload";
import { blankToUndefined } from "@shared/lib/text";
import { Button } from "@shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@shared/ui/field";
import { FieldErrorMessage } from "@shared/ui/field-error-message";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useId, useState } from "react";
import { toast } from "sonner";
import { editProject } from "../api/actions";

export interface EditFormInitial {
  /** Existing long-form body; null when unset. */
  description: string | null;
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
export function EditForm({ backHref, initial }: EditFormProps) {
  const resolvedBackHref = backHref ?? `/projects/${initial.projectId}`;
  const router = useRouter();
  const titleId = useId();
  const taglineId = useId();
  const descriptionId = useId();
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
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Clear a field's error as soon as the user edits it, so a corrected
  // field stops showing a stale message before the next submit.
  function clearError(field: ProjectFieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

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
    clearError("imagePaths");
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
        setErrors({
          imagePaths:
            failed.error ??
            "스크린샷을 올리지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }
      const imagePaths = uploadResults.map((r) => r.path as string);

      const result = await editProject({
        projectId: initial.projectId,
        title: values.title,
        tagline: values.tagline,
        description: blankToUndefined(values.description),
        projectUrl: values.projectUrl,
        githubUrl: blankToUndefined(values.githubUrl),
        imagePaths,
      });
      if (!result.ok) {
        setSubmitError(
          result.error ?? "저장하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
        return;
      }
      toast.success("저장했어요.");
      posthog.capture("project_edited", {
        project_id: initial.projectId,
        has_github_url: Boolean(values.githubUrl),
        image_count: imagePaths.length,
      });
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
          <FieldErrorMessage
            message={errors.title}
            testId="edit-form-error-title"
          />
        </Field>

        <Field data-invalid={errors.tagline ? true : undefined}>
          <FieldLabel htmlFor={taglineId}>한 줄 소개</FieldLabel>
          <Input
            aria-invalid={errors.tagline ? true : undefined}
            defaultValue={initial.tagline}
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            onChange={() => clearError("tagline")}
            required
          />
          <FieldErrorMessage
            message={errors.tagline}
            testId="edit-form-error-tagline"
          />
        </Field>

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor={descriptionId}>
            프로젝트 설명{" "}
            <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <Textarea
            aria-invalid={errors.description ? true : undefined}
            defaultValue={initial.description ?? ""}
            disabled={submitting}
            id={descriptionId}
            maxLength={MAX_DESCRIPTION_LENGTH}
            name="description"
            onChange={() => clearError("description")}
            placeholder="프로젝트를 자세히 소개해 주세요"
            rows={5}
          />
          <FieldErrorMessage
            message={errors.description}
            testId="edit-form-error-description"
          />
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
          <FieldErrorMessage
            message={errors.projectUrl}
            testId="edit-form-error-projectUrl"
          />
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
          <FieldErrorMessage
            message={errors.githubUrl}
            testId="edit-form-error-githubUrl"
          />
        </Field>

        <Field data-invalid={errors.imagePaths ? true : undefined}>
          <FieldLabel>스크린샷</FieldLabel>
          <ImageSlots
            disabled={submitting}
            onChange={handleImagesChange}
            onError={(message) =>
              setErrors((prev) => ({ ...prev, imagePaths: message }))
            }
            value={imageSlotsValue}
          />
          <FieldErrorMessage
            message={errors.imagePaths}
            testId="edit-form-error-imagePaths"
          />
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
