"use client";

import {
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  type ProjectFieldErrors,
  type ProjectFieldName,
  readProjectFieldValues,
  validateProjectFields,
} from "@entities/project";
import { type ImageSlot, ImageSlots } from "@features/upload-project-images";
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
import { submitProject } from "../api/actions";

export interface SubmitFormProps {
  /**
   * Destination for the cancel link and the post-submit redirect.
   * Defaults to `/` for cancel and `/projects/${newId}` for success
   * when not provided. The settings → new flow passes `/settings` so
   * the user lands back where they started and sees the freshly added
   * row in 내 프로젝트.
   */
  backHref?: string;
  /**
   * `cohort_id` of the signed-in student's profile. At runtime the
   * onboarding gate (`proxy.ts` + `/onboarding` route) guarantees this
   * is non-null for any user who reaches the form. Kept nullable here
   * because the page-level auth gate may pass null defensively; the
   * server action also checks.
   */
  cohortId: string | null;
}

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  );
}

export function SubmitForm({ backHref, cohortId: _cohortId }: SubmitFormProps) {
  const router = useRouter();
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const githubUrlId = useId();
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Clear a field's error as soon as the user edits it, so a corrected
  // field stops showing a stale message before the next submit.
  function clearError(field: ProjectFieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);

    const form = event.currentTarget;
    const values = readProjectFieldValues(form);

    const validationErrors = validateProjectFields(values, images.length);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Upload every image in parallel; abort the whole submit on
      // the first failure so the user can fix and retry.
      const uploads = await Promise.all(
        images.map((slot) => uploadScreenshot(slot.file))
      );
      const failed = uploads.find((u) => u.error || !u.path);
      if (failed) {
        setErrors({ imagePaths: failed.error ?? "업로드에 실패했어요." });
        return;
      }
      const imagePaths = uploads.map((u) => u.path as string);

      const result = await submitProject({
        title: values.title,
        tagline: values.tagline,
        projectUrl: values.projectUrl,
        githubUrl:
          values.githubUrl.trim() === "" ? undefined : values.githubUrl,
        imagePaths,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "프로젝트를 제출할 수 없어요.");
        return;
      }
      form.reset();
      setImages([]);
      toast.success("프로젝트가 제출되었어요.");
      // When the user came from a specific entry point (e.g. /settings),
      // honor it for both success and fallback paths. Otherwise default
      // to the new project's detail page (which doesn't exist until the
      // server action returned the id, so it cannot live in backHref).
      const successHref = backHref ?? `/projects/${result.projectId}`;
      const fallbackHref = backHref ?? "/";
      router.push(result.projectId ? successHref : fallbackHref);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="프로젝트 제출"
      className="flex flex-col gap-6"
      noValidate
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor={titleId}>
            제목 <RequiredMark />
          </FieldLabel>
          <Input
            aria-invalid={errors.title ? true : undefined}
            aria-required="true"
            disabled={submitting}
            id={titleId}
            maxLength={MAX_TITLE_LENGTH}
            name="title"
            onChange={() => clearError("title")}
            placeholder="내 앱"
            required
          />
          {errors.title ? (
            <FieldError data-testid="submit-form-error-title">
              {errors.title}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.tagline ? true : undefined}>
          <FieldLabel htmlFor={taglineId}>
            한 줄 소개 <RequiredMark />
          </FieldLabel>
          <Textarea
            aria-invalid={errors.tagline ? true : undefined}
            aria-required="true"
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            onChange={() => clearError("tagline")}
            placeholder="멋진 도구 한 줄 소개"
            required
            rows={2}
          />
          {errors.tagline ? (
            <FieldError data-testid="submit-form-error-tagline">
              {errors.tagline}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.projectUrl ? true : undefined}>
          <FieldLabel htmlFor={urlId}>
            프로젝트 URL <RequiredMark />
          </FieldLabel>
          <Input
            aria-invalid={errors.projectUrl ? true : undefined}
            aria-required="true"
            disabled={submitting}
            id={urlId}
            name="projectUrl"
            onChange={() => clearError("projectUrl")}
            placeholder="https://myapp.com"
            required
            type="url"
          />
          {errors.projectUrl ? (
            <FieldError data-testid="submit-form-error-projectUrl">
              {errors.projectUrl}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.githubUrl ? true : undefined}>
          <FieldLabel htmlFor={githubUrlId}>GitHub 저장소</FieldLabel>
          <Input
            aria-invalid={errors.githubUrl ? true : undefined}
            disabled={submitting}
            id={githubUrlId}
            name="githubUrl"
            onChange={() => clearError("githubUrl")}
            placeholder="https://github.com/owner/repo"
            type="url"
          />
          {errors.githubUrl ? (
            <FieldError data-testid="submit-form-error-githubUrl">
              {errors.githubUrl}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.imagePaths ? true : undefined}>
          <FieldLabel>
            스크린샷 <RequiredMark />
          </FieldLabel>
          <ImageSlots
            disabled={submitting}
            onChange={(next) => {
              setImages(next);
              clearError("imagePaths");
            }}
            onError={(message) =>
              setErrors((prev) => ({ ...prev, imagePaths: message }))
            }
            value={images}
          />
          {errors.imagePaths ? (
            <FieldError data-testid="submit-form-error-imagePaths">
              {errors.imagePaths}
            </FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      {submitError ? (
        <FieldError data-testid="submit-form-submit-error">
          {submitError}
        </FieldError>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button asChild size="lg" variant="outline">
          <Link href={backHref ?? "/"}>취소</Link>
        </Button>
        <Button disabled={submitting} size="lg" type="submit">
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          프로젝트 제출
        </Button>
      </div>
    </form>
  );
}
