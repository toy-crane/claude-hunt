"use client";

import type { Project } from "@entities/project/index.ts";
import {
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  uploadScreenshot,
} from "@features/submit-project/index.ts";
import { Button } from "@shared/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog.tsx";
import { Field, FieldGroup, FieldLabel } from "@shared/ui/field.tsx";
import { Input } from "@shared/ui/input.tsx";
import { Spinner } from "@shared/ui/spinner.tsx";
import { Textarea } from "@shared/ui/textarea.tsx";
import { useId, useState } from "react";
import { editProject } from "../api/actions.ts";

export interface EditDialogProps {
  project: Pick<Project, "id" | "title" | "tagline" | "project_url">;
}

export function EditDialog({ project }: EditDialogProps) {
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const screenshotId = useId();
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    const form = event.currentTarget;
    const elements = form.elements;
    const title =
      (elements.namedItem("title") as HTMLInputElement | null)?.value ?? "";
    const tagline =
      (elements.namedItem("tagline") as HTMLTextAreaElement | null)?.value ??
      "";
    const projectUrl =
      (elements.namedItem("projectUrl") as HTMLInputElement | null)?.value ??
      "";
    const fileEl = elements.namedItem("screenshot") as HTMLInputElement | null;
    const newScreenshot = fileEl?.files?.[0];

    setSubmitting(true);
    try {
      let screenshotPath: string | undefined;
      if (newScreenshot && newScreenshot.size > 0) {
        const upload = await uploadScreenshot(newScreenshot);
        if (upload.error || !upload.path) {
          setFieldError(upload.error ?? "Upload failed");
          return;
        }
        screenshotPath = upload.path;
      }

      const result = await editProject({
        projectId: project.id,
        title,
        tagline,
        projectUrl,
        screenshotPath,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "Could not save");
        return;
      }
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button data-testid="edit-project-trigger" size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update your project's details. Leave the screenshot blank to keep
            the current image.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-label="Edit project"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={titleId}>Title</FieldLabel>
              <Input
                defaultValue={project.title ?? ""}
                disabled={submitting}
                id={titleId}
                maxLength={MAX_TITLE_LENGTH}
                name="title"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={taglineId}>Tagline</FieldLabel>
              <Textarea
                defaultValue={project.tagline ?? ""}
                disabled={submitting}
                id={taglineId}
                maxLength={MAX_TAGLINE_LENGTH}
                name="tagline"
                required
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={urlId}>Project URL</FieldLabel>
              <Input
                defaultValue={project.project_url ?? ""}
                disabled={submitting}
                id={urlId}
                name="projectUrl"
                required
                type="url"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={screenshotId}>
                Screenshot (optional)
              </FieldLabel>
              <Input
                accept="image/jpeg,image/png,image/webp"
                disabled={submitting}
                id={screenshotId}
                name="screenshot"
                type="file"
              />
            </Field>
          </FieldGroup>

          {fieldError ? (
            <p
              className="text-destructive text-xs"
              data-testid="edit-dialog-field-error"
              role="alert"
            >
              {fieldError}
            </p>
          ) : null}
          {submitError ? (
            <p
              className="text-destructive text-xs"
              data-testid="edit-dialog-submit-error"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              disabled={submitting}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
