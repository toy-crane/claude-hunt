import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "@entities/project";
import { z } from "zod";

/**
 * Text-side fields submitted via the form. The screenshot itself goes
 * through the browser upload helper first, then only its storage path
 * reaches the server action via `screenshot_path`.
 */
export const submitProjectInputSchema = z.object({
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
    .min(1, "태그라인을 입력해 주세요.")
    .max(
      MAX_TAGLINE_LENGTH,
      `태그라인은 ${MAX_TAGLINE_LENGTH}자 이하로 입력해 주세요.`
    ),
  projectUrl: z
    .string()
    .trim()
    .url("http:// 또는 https:// 로 시작하는 URL을 입력해 주세요."),
  screenshotPath: z.string().trim().min(1, "스크린샷을 첨부해 주세요."),
});

export type SubmitProjectInput = z.infer<typeof submitProjectInputSchema>;
