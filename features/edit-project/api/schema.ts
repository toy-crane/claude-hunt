import { projectFieldsSchema } from "@entities/project";
import { z } from "zod";

/**
 * Edit takes the same project fields as submit plus a projectId
 * targeting the row to update. Server diffs old vs. new images and
 * cleans orphaned storage objects.
 */
export const editProjectInputSchema = projectFieldsSchema.extend({
  projectId: z
    .string()
    .trim()
    .min(
      1,
      "프로젝트 정보가 올바르지 않아요. 새로고침한 뒤 다시 시도해 주세요."
    ),
});

export type EditProjectInput = z.infer<typeof editProjectInputSchema>;
