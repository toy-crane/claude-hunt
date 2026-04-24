"use client";

import {
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  type Project,
} from "@entities/project";
import { RiPencilLine } from "@remixicon/react";
import { uploadScreenshot } from "@shared/lib/screenshot-upload";
import { Button } from "@shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";
import { useId, useState } from "react";
import { editProject } from "../api/actions";

export type EditDialogVariant = "default" | "icon";

export interface EditDialogProps {
  project: Pick<Project, "id" | "title" | "tagline" | "project_url">;
  /**
   * Trigger appearance. `"default"` renders the labeled "수정" button;
   * `"icon"` renders a 28 px square icon-only button with the same
   * dialog behavior (used inside the terminal row).
   */
  variant?: EditDialogVariant;
}

export function EditDialog({ project, variant = "default" }: EditDialogProps) {
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
          setFieldError(upload.error ?? "업로드에 실패했어요.");
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
        setSubmitError(result.error ?? "저장할 수 없어요.");
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
        {variant === "icon" ? (
          <Button
            aria-label="프로젝트 편집"
            className="size-7 rounded-none"
            data-testid="edit-project-trigger"
            size="icon"
            variant="outline"
          >
            <RiPencilLine className="size-3.5" />
          </Button>
        ) : (
          <Button
            data-testid="edit-project-trigger"
            size="sm"
            variant="outline"
          >
            수정
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트 수정</DialogTitle>
        </DialogHeader>
        <form
          aria-label="프로젝트 수정"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={titleId}>제목</FieldLabel>
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
              <FieldLabel htmlFor={taglineId}>한 줄 소개</FieldLabel>
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
              <FieldLabel htmlFor={urlId}>프로젝트 URL</FieldLabel>
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
              <FieldLabel htmlFor={screenshotId}>스크린샷 (선택)</FieldLabel>
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
              취소
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
