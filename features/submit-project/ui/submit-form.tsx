"use client";

import { Button } from "@shared/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@shared/ui/field.tsx";
import { Input } from "@shared/ui/input.tsx";
import { Spinner } from "@shared/ui/spinner.tsx";
import { Textarea } from "@shared/ui/textarea.tsx";
import { useId, useState } from "react";
import { submitProject } from "../api/actions.ts";
import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "../api/schema.ts";
import { uploadScreenshot } from "../lib/upload-screenshot.ts";

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
      setFieldError("Screenshot is required");
      return;
    }

    setSubmitting(true);
    try {
      const upload = await uploadScreenshot(screenshot);
      if (upload.error || !upload.path) {
        setFieldError(upload.error ?? "Upload failed");
        return;
      }

      const result = await submitProject({
        title,
        tagline,
        projectUrl,
        screenshotPath: upload.path,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "Could not submit project");
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
      aria-label="Submit a project"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={titleId}>Title</FieldLabel>
          <Input
            disabled={submitting}
            id={titleId}
            maxLength={MAX_TITLE_LENGTH}
            name="title"
            placeholder="My App"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={taglineId}>Tagline</FieldLabel>
          <Textarea
            disabled={submitting}
            id={taglineId}
            maxLength={MAX_TAGLINE_LENGTH}
            name="tagline"
            placeholder="A cool tool"
            required
            rows={2}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={urlId}>Project URL</FieldLabel>
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
          <FieldLabel htmlFor={screenshotId}>Screenshot</FieldLabel>
          <Input
            accept="image/jpeg,image/png,image/webp"
            disabled={submitting}
            id={screenshotId}
            name="screenshot"
            required
            type="file"
          />
          <FieldDescription>JPEG, PNG, or WebP up to 25 MB.</FieldDescription>
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
        {submitting ? "Submitting..." : "Submit project"}
      </Button>
    </form>
  );
}
