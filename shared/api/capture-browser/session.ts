import "server-only";

import { randomUUID } from "node:crypto";
import { env } from "@shared/config/env";
import { Sandbox } from "@vercel/sandbox";
import {
  CAPTURE_DRIVER_SOURCE,
  CAPTURE_PATH,
  DRIVER_PORT,
  VIEW_PATH,
} from "./driver-source";

/** Where the capture snapshot keeps Playwright, Chromium, and the driver. */
export const CAPTURE_HOME = "/opt/capture";
const DRIVER_PATH = `${CAPTURE_HOME}/driver.mjs`;
/** Where a request body that must stay off the command line is staged. */
const PRIVATE_BODY_PATH = "/tmp/capture-act-body.json";
const SANDBOX_REGION = "icn1";

export type BrowserActionName =
  | "click"
  | "type_text"
  | "press_key"
  | "scroll"
  | "go_back"
  | "wait";

export interface BrowserActionResult {
  changed: boolean;
  note?: "returned_to_start" | "left_project_host" | "typing_off_project_host";
  ok: boolean;
  url: string;
  /** Compact screenshot of the screen after the action, for the model. */
  view: Buffer;
}

export interface CapturedImage {
  hash: string;
  image: Buffer;
}

/** A live browser on one project URL, running inside an isolated sandbox. */
export interface CaptureSession {
  act(
    name: BrowserActionName,
    input: Record<string, unknown>
  ): Promise<BrowserActionResult>;
  capture(): Promise<CapturedImage>;
  close(): Promise<void>;
  /** Gallery-quality capture of the page as first opened. */
  readonly firstScreen: CapturedImage;
  /** Compact screenshot of the first screen, for the model. */
  readonly firstView: Buffer;
}

export type OpenCaptureSessionResult =
  | { ok: true; session: CaptureSession }
  | { ok: false; reason: "unreachable" | "unavailable" };

interface OpenOptions {
  /** How long the sandbox may live in total, including any later agent run. */
  lifetimeMs: number;
  /**
   * Receives the sandbox shutdown when opening fails. Stopping a sandbox
   * takes about 25 seconds, so callers serving a request hand it to
   * `after()` instead of making the user wait. Awaited when omitted.
   */
  release?: (stopping: Promise<unknown>) => void;
}

/**
 * Opens `url` in a fresh sandbox started from the capture snapshot and
 * returns a session positioned on its first screen. Resolves to
 * `unreachable` when the page cannot be opened (navigation failure, timeout,
 * or an error status) and to `unavailable` when the capture environment
 * itself is missing or broken.
 */
export async function openCaptureSession(
  url: string,
  { lifetimeMs, release }: OpenOptions
): Promise<OpenCaptureSessionResult> {
  const snapshotId = env.CAPTURE_SANDBOX_SNAPSHOT_ID;
  if (!snapshotId) {
    return { ok: false, reason: "unavailable" };
  }

  let sandbox: Sandbox;
  try {
    sandbox = await Sandbox.create({
      source: { type: "snapshot", snapshotId },
      resources: { vcpus: 1 },
      timeout: lifetimeMs,
      region: SANDBOX_REGION,
      persistent: false,
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  // Lets only this session's commands reach the driver (see driver-source).
  const token = randomUUID();
  const stopNow = () => sandbox.stop().catch(() => undefined);
  const stop = async () => {
    if (release) {
      release(stopNow());
      return;
    }
    await stopNow();
  };

  try {
    await sandbox.writeFiles([
      { path: DRIVER_PATH, content: Buffer.from(CAPTURE_DRIVER_SOURCE) },
    ]);
    await sandbox.runCommand({
      cmd: "node",
      args: [DRIVER_PATH],
      cwd: CAPTURE_HOME,
      env: {
        PLAYWRIGHT_BROWSERS_PATH: `${CAPTURE_HOME}/browsers`,
        DRIVER_TOKEN: token,
      },
      detached: true,
    });

    const call = async (
      path: string,
      body?: unknown,
      { private: viaFile = false } = {}
    ) => {
      const args = ["-s", "--max-time", "60", "-H", `x-driver-token: ${token}`];
      if (body !== undefined && viaFile) {
        // Typed text can be a password: keep it off the command line, which
        // the sandbox platform records, and pass it through a file instead.
        await sandbox.writeFiles([
          {
            path: PRIVATE_BODY_PATH,
            content: Buffer.from(JSON.stringify(body)),
          },
        ]);
        args.push("-X", "POST", "--data-binary", `@${PRIVATE_BODY_PATH}`);
      } else if (body !== undefined) {
        args.push("-X", "POST", "--data-binary", JSON.stringify(body));
      }
      args.push(`http://127.0.0.1:${DRIVER_PORT}${path}`);
      const finished = await sandbox.runCommand("curl", args);
      const stdout = await finished.stdout();
      return stdout ? JSON.parse(stdout) : { ok: false };
    };

    let ready = false;
    for (let attempt = 0; attempt < 40 && !ready; attempt++) {
      ready = (await call("/health").catch(() => ({ ok: false }))).ok === true;
      if (!ready) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    if (!ready) {
      await stop();
      return { ok: false, reason: "unavailable" };
    }

    const opened = await call("/open", { url });
    if (!opened.ok) {
      await stop();
      return { ok: false, reason: "unreachable" };
    }

    const readCapture = async (): Promise<CapturedImage> => {
      const shot = await call("/capture", {});
      if (!shot.ok) {
        throw new Error("capture failed");
      }
      const image = await sandbox.readFileToBuffer({ path: CAPTURE_PATH });
      if (!image) {
        throw new Error("capture file missing");
      }
      return { image, hash: String(shot.hash) };
    };
    const readView = async () => {
      const view = await sandbox.readFileToBuffer({ path: VIEW_PATH });
      if (!view) {
        throw new Error("view file missing");
      }
      return view;
    };

    const firstScreen = await readCapture();
    const firstView = await readView();

    return {
      ok: true,
      session: {
        firstScreen,
        firstView,
        capture: readCapture,
        async act(name, input) {
          const result = await call(
            "/act",
            { name, input },
            { private: name === "type_text" }
          );
          return {
            ok: result.ok === true,
            url: String(result.url ?? ""),
            changed: result.changed === true,
            note: result.note,
            view: await readView(),
          };
        },
        close: async () => {
          await stopNow();
        },
      },
    };
  } catch {
    await stop();
    return { ok: false, reason: "unavailable" };
  }
}
