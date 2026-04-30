import { z } from "zod";
import {
  GITHUB_URL_PATTERN,
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
    .trim()
    .min(1, "한 줄 소개을 입력해 주세요.")
    .max(
      MAX_TAGLINE_LENGTH,
      `한 줄 소개은 ${MAX_TAGLINE_LENGTH}자 이하로 입력해 주세요.`
    ),
  projectUrl: z
    .string()
    .trim()
    .url("http:// 또는 https:// 로 시작하는 URL을 입력해 주세요."),
  githubUrl: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
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
