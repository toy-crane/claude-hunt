import "server-only";

import {
  type CaptureSession,
  openCaptureSession,
} from "@shared/api/capture-browser/session";
import {
  type HighlightModel,
  runHighlightAgent,
} from "@shared/lib/highlight-agent/run-highlight-agent";
import { MAX_PROJECT_IMAGES } from "../model/constants";
import type { ProjectImage } from "../model/schema";

/** Highlight runs (the model-driven part) one owner may start per rolling day. */
export const HIGHLIGHT_RUNS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a capture sandbox may live: the first-screen wait plus a
 * highlight run (capped at three minutes) and some slack.
 */
export const CAPTURE_SANDBOX_LIFETIME_MS = 5 * 60 * 1000;

export type CaptureRunStatus = "succeeded" | "failed" | "cancelled";

/** Where automatic captures are kept and how the gallery is changed. */
export interface AutoImageStore {
  /** Appends one image only while the gallery still equals `expected`. */
  appendImage(
    projectId: string,
    expected: ProjectImage[],
    image: ProjectImage
  ): Promise<boolean>;
  countRunsSince(userId: string, since: Date): Promise<number>;
  finishRun(
    runId: string,
    status: CaptureRunStatus,
    imagesAdded: number
  ): Promise<void>;
  /** Makes the board and detail page show the changed gallery. */
  refresh(): void;
  removeImage(path: string): Promise<void>;
  startRun(projectId: string, userId: string): Promise<string>;
  uploadImage(userId: string, image: Buffer): Promise<string>;
}

export type CaptureFirstImageResult =
  | { ok: true; path: string; session: CaptureSession }
  | { ok: false; reason: "unreachable" | "unavailable" };

/**
 * Opens the project URL and keeps its first screen as the primary image.
 * The returned session stays open so the highlight run can continue from
 * the same page.
 */
export async function captureFirstProjectImage({
  projectUrl,
  userId,
  upload,
  release,
}: {
  projectUrl: string;
  /** Takes over a slow sandbox shutdown so the caller need not wait. */
  release?: (stopping: Promise<unknown>) => void;
  /** Stores the image under the owner's folder and returns its path. */
  upload: (userId: string, image: Buffer) => Promise<string>;
  userId: string;
}): Promise<CaptureFirstImageResult> {
  const opened = await openCaptureSession(projectUrl, {
    lifetimeMs: CAPTURE_SANDBOX_LIFETIME_MS,
    release,
  });
  if (!opened.ok) {
    return opened;
  }
  try {
    const path = await upload(userId, opened.session.firstScreen.image);
    return { ok: true, path, session: opened.session };
  } catch {
    const closing = opened.session.close();
    if (release) {
      release(closing);
    } else {
      await closing;
    }
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Background part of automatic images: lets the highlight agent add up to
 * four more screens after the first one. A capture that arrives after the
 * owner changed the gallery is discarded and ends the run. Always closes
 * the browser session.
 */
export async function fillProjectHighlights({
  session,
  store,
  model,
  projectId,
  userId,
  project,
  images,
  now = Date.now,
}: {
  images: ProjectImage[];
  model: HighlightModel;
  now?: () => number;
  project: { tagline: string; title: string };
  projectId: string;
  session: CaptureSession;
  store: AutoImageStore;
  userId: string;
}): Promise<void> {
  try {
    const recent = await store.countRunsSince(userId, new Date(now() - DAY_MS));
    if (recent >= HIGHLIGHT_RUNS_PER_DAY) {
      return;
    }

    const runId = await store.startRun(projectId, userId);
    let expected = images;
    let added = 0;
    try {
      const result = await runHighlightAgent({
        browser: session,
        model,
        project,
        firstView: session.firstView,
        firstHash: session.firstScreen.hash,
        maxCaptures: Math.max(0, MAX_PROJECT_IMAGES - images.length),
        now,
        onCapture: async ({ image }) => {
          const path = await store.uploadImage(userId, image);
          const next = { path };
          const appended = await store.appendImage(projectId, expected, next);
          if (!appended) {
            await store.removeImage(path);
            return false;
          }
          expected = [...expected, next];
          added += 1;
          store.refresh();
          return true;
        },
      });
      await store.finishRun(
        runId,
        result.endReason === "stopped" ? "cancelled" : "succeeded",
        added
      );
    } catch {
      await store.finishRun(runId, "failed", added);
    }
  } finally {
    await session.close();
  }
}
