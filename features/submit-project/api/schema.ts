import { projectFieldsSchema } from "@entities/project";
import type { z } from "zod";

/**
 * Submit reuses the shared project field shape (title, tagline,
 * projectUrl, githubUrl, imagePaths). The form passes upload paths
 * after the client uploads each image.
 */
export const submitProjectInputSchema = projectFieldsSchema;

export type SubmitProjectInput = z.infer<typeof submitProjectInputSchema>;
