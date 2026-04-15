import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "@entities/project";
import { z } from "zod";

/**
 * Edit mirrors submit validation for text fields. Screenshot path is
 * optional: omit to keep the existing screenshot, supply to swap.
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
  screenshotPath: z.string().trim().min(1).optional(),
});

export type EditProjectInput = z.infer<typeof editProjectInputSchema>;
