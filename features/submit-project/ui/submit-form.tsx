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
  const descriptionId = useId();
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
        setErrors({
          imagePaths:
            failed.error ??
            "스크린샷을 올리지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }
      const imagePaths = uploads.map((u) => u.path as string);

      const result = await submitProject({
        title: values.title,
        tagline: values.tagline,
        description: blankToUndefined(values.description),
        projectUrl: values.projectUrl,
        githubUrl: blankToUndefined(values.githubUrl),
        imagePaths,
      });
      if (!result.ok) {
        setSubmitError(
          result.error ??
            "프로젝트를 제출하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
        return;
      }
      form.reset();
      setImages([]);
      toast.success("프로젝트를 제출했어요.");
      posthog.capture("project_submitted", {
        project_id: result.projectId,
        has_github_url: Boolean(values.githubUrl),
        image_count: imagePaths.length,
      });
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
          <FieldErrorMessage
            message={errors.title}
            testId="submit-form-error-title"
          />
        </Field>

        <Field data-invalid={errors.tagline ? true : undefined}>
          <FieldLabel htmlFor={taglineId}>
            한 줄 소개 <RequiredMark />
          </FieldLabel>
          <Input
            aria-invalid={errors.tagline ? true : undefined}
            aria-required="true"
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            onChange={() => clearError("tagline")}
            placeholder="멋진 도구 한 줄 소개"
            required
          />
          <FieldErrorMessage
            message={errors.tagline}
            testId="submit-form-error-tagline"
          />
        </Field>

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor={descriptionId}>프로젝트 설명</FieldLabel>
          <Textarea
            aria-invalid={errors.description ? true : undefined}
            disabled={submitting}
            id={descriptionId}
            maxLength={MAX_DESCRIPTION_LENGTH}
            name="description"
            onChange={() => clearError("description")}
            placeholder="프로젝트를 자세히 소개해 주세요 (선택)"
            rows={5}
          />
          <FieldErrorMessage
            message={errors.description}
            testId="submit-form-error-description"
          />
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
          <FieldErrorMessage
            message={errors.projectUrl}
            testId="submit-form-error-projectUrl"
          />
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
          <FieldErrorMessage
            message={errors.githubUrl}
            testId="submit-form-error-githubUrl"
          />
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
          <FieldErrorMessage
            message={errors.imagePaths}
            testId="submit-form-error-imagePaths"
          />
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
