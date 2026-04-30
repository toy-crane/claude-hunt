import {
  GITHUB_URL_PATTERN,
  MAX_PROJECT_IMAGES,
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
} from "@entities/project";
import { z } from "zod";

/**
 * Edit mirrors submit validation. The full image array is sent on
 * every save (paths in the order the user wants persisted); the
 * server diffs old vs. new to remove orphaned storage objects.
 */
export const editProjectInputSchema = z.object({
  projectId: z.string().trim().min(1, "잘못된 프로젝트 ID 예요."),
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

export type EditProjectInput = z.infer<typeof editProjectInputSchema>;
