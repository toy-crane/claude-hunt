"use client";

import { Button } from "@shared/ui/button.tsx";
import { Input } from "@shared/ui/input.tsx";
import { Label } from "@shared/ui/label.tsx";
import { Textarea } from "@shared/ui/textarea.tsx";
import { useId, useState } from "react";
import { submitProject } from "../api/actions.ts";
import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "../api/schema.ts";
import { uploadScreenshot } from "../lib/upload-screenshot.ts";

export interface SubmitFormProps {
  /**
   * `cohort_id` of the signed-in student's profile. `null` means they
   * haven't been assigned yet — the form shows a guidance banner and
   * disables submit.
   */
  cohortId: string | null;
}

export function SubmitForm({ cohortId }: SubmitFormProps) {
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const screenshotId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const blocked = cohortId === null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setSubmitError(null);
    setSuccess(false);

    if (blocked) {
      return;
    }

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
      setSuccess(true);
      form.reset();
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
      {blocked ? (
        <p
          className="rounded-md border border-amber-400/40 bg-amber-50 px-3 py-2 text-amber-900 text-xs dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          data-testid="submit-form-cohort-warning"
          role="status"
        >
          Contact your instructor to get assigned to a cohort before submitting
          a project.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          disabled={blocked || submitting}
          id={titleId}
          maxLength={MAX_TITLE_LENGTH}
          name="title"
          placeholder="My App"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={taglineId}>Tagline</Label>
        <Textarea
          disabled={blocked || submitting}
          id={taglineId}
          maxLength={MAX_TAGLINE_LENGTH}
          name="tagline"
          placeholder="A cool tool"
          required
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={urlId}>Project URL</Label>
        <Input
          disabled={blocked || submitting}
          id={urlId}
          name="projectUrl"
          placeholder="https://myapp.com"
          required
          type="url"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={screenshotId}>Screenshot</Label>
        <Input
          accept="image/jpeg,image/png,image/webp"
          disabled={blocked || submitting}
          id={screenshotId}
          name="screenshot"
          required
          type="file"
        />
        <p className="text-muted-foreground text-xs">
          JPEG, PNG, or WebP up to 5 MB.
        </p>
      </div>

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
      {success ? (
        <p
          className="text-emerald-700 text-xs dark:text-emerald-400"
          role="status"
        >
          Project submitted!
        </p>
      ) : null}

      <Button disabled={blocked || submitting} type="submit">
        {submitting ? "Submitting..." : "Submit project"}
      </Button>
    </form>
  );
}
