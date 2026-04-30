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
import { useId, useState } from "react";
import { toast } from "sonner";
import { submitProject } from "../api/actions";

export interface SubmitFormProps {
  /**
   * `cohort_id` of the signed-in student's profile. At runtime the
   * onboarding gate (`proxy.ts` + `/onboarding` route) guarantees this
   * is non-null for any user who reaches the form. Kept nullable here
   * because the page-level auth gate may pass null defensively; the
   * server action also checks.
   */
  cohortId: string | null;
}

export function SubmitForm({ cohortId: _cohortId }: SubmitFormProps) {
  const router = useRouter();
  const titleId = useId();
  const taglineId = useId();
  const urlId = useId();
  const githubUrlId = useId();
  const [images, setImages] = useState<ImageSlot[]>([]);
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
    const githubUrlEl = elements.namedItem(
      "githubUrl"
    ) as HTMLInputElement | null;
    const title = titleEl?.value ?? "";
    const tagline = taglineEl?.value ?? "";
    const projectUrl = urlEl?.value ?? "";
    const githubUrl = githubUrlEl?.value ?? "";

    if (images.length === 0) {
      setFieldError("스크린샷을 1장 이상 첨부해 주세요.");
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
        setFieldError(failed.error ?? "업로드에 실패했어요.");
        return;
      }
      const imagePaths = uploads.map((u) => u.path as string);

      const result = await submitProject({
        title,
        tagline,
        projectUrl,
        githubUrl: githubUrl.trim() === "" ? undefined : githubUrl,
        imagePaths,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "프로젝트를 제출할 수 없어요.");
        return;
      }
      form.reset();
      setImages([]);
      toast.success("프로젝트가 제출되었어요.");
      if (result.projectId) {
        router.push(`/projects/${result.projectId}`);
      } else {
        router.push("/");
      }
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
          <FieldLabel htmlFor={taglineId}>한 줄 소개</FieldLabel>
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
          <FieldLabel htmlFor={githubUrlId}>
            GitHub 저장소{" "}
            <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <Input
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
            onChange={setImages}
            onError={setFieldError}
            value={images}
          />
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

      <div className="flex items-stretch gap-2">
        <Button asChild variant="outline">
          <Link href="/">취소</Link>
        </Button>
        <Button className="flex-1" disabled={submitting} type="submit">
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {submitting ? "제출 중..." : "프로젝트 제출"}
        </Button>
      </div>
    </form>
  );
}
