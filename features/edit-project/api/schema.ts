import { projectFieldsSchema } from "@entities/project";
import { z } from "zod";

/**
 * Edit takes the same project fields as submit plus a projectId
 * targeting the row to update. Server diffs old vs. new images and
 * cleans orphaned storage objects.
 */
export const editProjectInputSchema = projectFieldsSchema.extend({
  projectId: z.string().trim().min(1, "잘못된 프로젝트 ID 예요."),
});

export type EditProjectInput = z.infer<typeof editProjectInputSchema>;
