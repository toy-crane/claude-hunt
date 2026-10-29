import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { CaptureSession } from "@shared/api/capture-browser/session";
import { env } from "@shared/config/env";
import { createClaudeHighlightModel } from "@shared/lib/highlight-agent/claude-model";
import type { HighlightProject } from "@shared/lib/highlight-agent/run-highlight-agent";
import { after } from "next/server";
import { createAutoImageStore } from "./api/auto-image-store";
import {
  type CaptureFirstImageResult,
  captureFirstProjectImage,
  fillProjectHighlights,
} from "./api/auto-images";
import type { ProjectImage } from "./model/schema";

export type { CaptureFirstImageResult } from "./api/auto-images";

/**
 * Opens the project URL in the capture sandbox and stores its first screen
 * as the owner's primary image. Used when a project is submitted or saved
 * with no images.
 */
export function captureProjectFirstScreen({
  projectUrl,
  userId,
}: {
  projectUrl: string;
  userId: string;
}): Promise<CaptureFirstImageResult> {
  const store = createAutoImageStore();
  return captureFirstProjectImage({
    projectUrl,
    userId,
    upload: store.uploadImage,
    // A failed open must not keep the owner waiting for the shutdown.
    release: (stopping) => after(stopping),
  });
}

/** Removes a stored capture that never made it into a saved project. */
export async function discardCapturedImage(path: string): Promise<void> {
  await createAutoImageStore().removeImage(path);
}

/**
 * Lets the highlight agent add more screens to a just-saved project. Meant
 * to run after the response (`after()`); skips quietly when no model key is
 * configured.
 */
export async function startProjectHighlights({
  session,
  projectId,
  userId,
  project,
  images,
}: {
  images: ProjectImage[];
  /** The owner's description is where the agent looks for access information. */
  project: HighlightProject;
  projectId: string;
  session: CaptureSession;
  userId: string;
}): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) {
    await session.close();
    return;
  }
  const model = createClaudeHighlightModel(
    new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  );
  await fillProjectHighlights({
    session,
    store: createAutoImageStore(),
    model,
    projectId,
    userId,
    project,
    images,
  });
}
