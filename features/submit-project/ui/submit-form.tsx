"use client";

import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "@entities/project";
import { uploadScreenshot } from "@shared/lib/screenshot-upload";
import { Button } from "@shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";
import { useId, useState } from "react";
import { submitProject } from "../api/actions";

export interface SubmitFormProps {
  /**
   * `cohort_id` of the signed-in student's profile. At runtime the
   * onboarding gate (`proxy.ts` + `/onboarding` route) guarantees this
   * is non-null for any user who reaches the form — but the prop type
   * stays nullable because `SubmitDialog` passes `null` through in the
   * unauthenticated branch (that branch never actually renders
   * `<SubmitForm>`, but the type must still compile). The server
   * action keeps its own defensive null-check.
   */
  cohortId: string | null;
  /**
   * Called once after the server action returns `ok: true`. The parent
   * owns post-success UI (closing a dialog, showing a toast, etc.) —
   * the form itself no longer renders a success message.
   */
  onSuccess?: () => void;
}

export function SubmitForm({
  cohortId: _cohortId,
  onSuccess,
}: SubmitFormProps) {
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const screenshotId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const fileEl = elements.namedItem("screenshot") as HTMLInputElement | null;
    const title = titleEl?.value ?? "";
    const tagline = taglineEl?.value ?? "";
    const projectUrl = urlEl?.value ?? "";
    const screenshot = fileEl?.files?.[0];

    if (!screenshot || screenshot.size === 0) {
      setFieldError("스크린샷을 첨부해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const upload = await uploadScreenshot(screenshot);
      if (upload.error || !upload.path) {
        setFieldError(upload.error ?? "업로드에 실패했어요.");
        return;
      }

      const result = await submitProject({
        title,
        tagline,
        projectUrl,
        screenshotPath: upload.path,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "프로젝트를 제출할 수 없어요.");
        return;
      }
      form.reset();
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="프로젝트 제출"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={titleId}>제목</FieldLabel>
          <Input
            disabled={submitting}
            id={titleId}
            maxLength={MAX_TITLE_LENGTH}
            name="title"
            placeholder="내 앱"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={taglineId}>태그라인</FieldLabel>
          <Textarea
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            placeholder="멋진 도구 한 줄 소개"
            required
            rows={2}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={urlId}>프로젝트 URL</FieldLabel>
          <Input
            disabled={submitting}
            id={urlId}
            name="projectUrl"
            placeholder="https://myapp.com"
            required
            type="url"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={screenshotId}>스크린샷</FieldLabel>
          <Input
            accept="image/jpeg,image/png,image/webp"
            disabled={submitting}
            id={screenshotId}
            name="screenshot"
            required
            type="file"
          />
          <FieldDescription>JPEG, PNG, WebP — 최대 25 MB.</FieldDescription>
        </Field>
      </FieldGroup>

      {fieldError ? (
        <p
          className="text-destructive text-xs"
          data-testid="submit-form-field-error"
          role="alert"
        >
          {fieldError}
        </p>
      ) : null}
      {submitError ? (
        <p
          className="text-destructive text-xs"
          data-testid="submit-form-submit-error"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <Button disabled={submitting} type="submit">
        {submitting ? <Spinner data-icon="inline-start" /> : null}
        {submitting ? "제출 중..." : "프로젝트 제출"}
      </Button>
    </form>
  );
}
