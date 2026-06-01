import { blankToUndefined, flattenToSingleLine } from "@shared/lib/text";
import { getZodFieldErrors } from "@shared/lib/validation";
import { z } from "zod";
import {
  GITHUB_URL_PATTERN,
  MAX_DESCRIPTION_LENGTH,
  MAX_PROJECT_IMAGES,
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants";

/**
 * Validation rules shared by submit and edit. The submit/edit schemas
 * extend this so messages and limits stay in lock-step. Image paths
 * are validated as a non-empty array up to MAX_PROJECT_IMAGES;
 * uploads happen client-side first.
 */
export const projectFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(
      MAX_TITLE_LENGTH,
      `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.`
    ),
  tagline: z
    .string()
    // Collapse any newlines into a single space so the tagline is always one
    // line, no matter what was pasted, before the length check applies.
    .transform(flattenToSingleLine)
    .pipe(
      z
        .string()
        .min(1, "한 줄 소개을 입력해 주세요.")
        .max(
          MAX_TAGLINE_LENGTH,
          `한 줄 소개은 ${MAX_TAGLINE_LENGTH}자 이하로 입력해 주세요.`
        )
    ),
  description: z
    .string()
    .transform(blankToUndefined)
    .pipe(
      z
        .string()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `프로젝트 설명은 ${MAX_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.`
        )
        .optional()
    )
    .optional(),
  projectUrl: z
    .string()
    .trim()
    .url("http:// 또는 https:// 로 시작하는 URL을 입력해 주세요."),
  githubUrl: z
    .string()
    .transform(blankToUndefined)
    .pipe(
      z
        .string()
        .regex(GITHUB_URL_PATTERN, "GitHub 저장소 주소를 입력해주세요")
        .optional()
    )
    .optional(),
  imagePaths: z
    .array(z.string().trim().min(1))
    .min(1, "스크린샷을 1장 이상 첨부해 주세요.")
    .max(
      MAX_PROJECT_IMAGES,
      `최대 ${MAX_PROJECT_IMAGES}장까지 업로드할 수 있어요.`
    ),
});

/** The text/url fields shared by the submit and edit project forms. */
export type ProjectFieldName =
  | "title"
  | "tagline"
  | "description"
  | "projectUrl"
  | "githubUrl"
  | "imagePaths";

export type ProjectFieldErrors = Partial<Record<ProjectFieldName, string>>;

export interface ProjectFieldValues {
  description: string;
  githubUrl: string;
  projectUrl: string;
  tagline: string;
  title: string;
}

/** Read the four text/url fields off a project form by input `name`. */
export function readProjectFieldValues(
  form: HTMLFormElement
): ProjectFieldValues {
  const get = (name: string) =>
    (
      form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null
    )?.value ?? "";
  return {
    title: get("title"),
    tagline: get("tagline"),
    description: get("description"),
    projectUrl: get("projectUrl"),
    githubUrl: get("githubUrl"),
  };
}

/**
 * Validate the project fields against {@link projectFieldsSchema} so each
 * message can land next to its own field. Uploads happen after this gate,
 * so `imageCount` is checked against the array min/max via a placeholder
 * of matching length. Returns `null` when everything is valid.
 */
export function validateProjectFields(
  values: ProjectFieldValues,
  imageCount: number
): ProjectFieldErrors | null {
  const parsed = projectFieldsSchema.safeParse({
    title: values.title,
    tagline: values.tagline,
    description: blankToUndefined(values.description),
    projectUrl: values.projectUrl,
    githubUrl: blankToUndefined(values.githubUrl),
    imagePaths: Array.from({ length: imageCount }, () => "x"),
  });
  if (parsed.success) {
    return null;
  }
  return getZodFieldErrors(parsed.error) as ProjectFieldErrors;
}
