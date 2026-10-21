/**
 * The highlight agent loop: a model looks at the current screen of a live
 * browser and picks one action at a time until it has saved enough
 * highlight screens. Domain-agnostic: it knows a browser, a model, and a
 * callback that keeps each saved screen.
 *
 * Every step is stateless for the model — it receives the goal, a short log
 * of what happened so far, and only the current screen — so the cost of a
 * step stays flat however long the run gets.
 */

export interface HighlightBrowserView {
  changed: boolean;
  note?: string;
  ok: boolean;
  url: string;
  view: Buffer;
}

export interface HighlightCapture {
  hash: string;
  image: Buffer;
}

export interface HighlightBrowser {
  act(
    name: string,
    input: Record<string, unknown>
  ): Promise<HighlightBrowserView>;
  capture(): Promise<HighlightCapture>;
}

export interface HighlightModelRequest {
  captions: string[];
  log: string[];
  maxCaptures: number;
  maxSteps: number;
  project: { tagline: string; title: string };
  step: number;
  /** The current screen. The only image the model receives this step. */
  view: Buffer;
}

export type HighlightModelReply =
  | { input: Record<string, unknown>; kind: "tool"; name: string }
  | { kind: "refusal" }
  | { kind: "none" };

export interface HighlightModel {
  next(request: HighlightModelRequest): Promise<HighlightModelReply>;
}

export interface RunHighlightAgentOptions {
  browser: HighlightBrowser;
  /** Hash of the already saved first screen, so it is never saved twice. */
  firstHash: string;
  firstView: Buffer;
  maxCaptures?: number;
  /** Wall-clock budget for the whole run. */
  maxDurationMs?: number;
  maxSteps?: number;
  model: HighlightModel;
  now?: () => number;
  /**
   * Keeps one saved screen. Return false to stop the run, e.g. when the
   * project's images changed underneath it.
   */
  onCapture: (
    capture: HighlightCapture & { caption: string }
  ) => Promise<boolean>;
  project: { tagline: string; title: string };
}

export type HighlightEndReason =
  | "finished"
  | "max_captures"
  | "max_steps"
  | "timeout"
  | "refusal"
  | "stopped";

export interface RunHighlightAgentResult {
  captured: number;
  endReason: HighlightEndReason;
  steps: number;
}

const BROWSER_ACTIONS = new Set([
  "click",
  "type_text",
  "press_key",
  "scroll",
  "go_back",
  "wait",
]);

function describeArgs(input: Record<string, unknown>) {
  return Object.entries(input)
    .filter(([key]) => key !== "note")
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ");
}

function actionOutcome(result: HighlightBrowserView) {
  if (result.note === "left_project_host") {
    return " [외부 사이트로 이동해 되돌림]";
  }
  if (result.note) {
    return " [첫 화면으로 다시 엶]";
  }
  return result.changed ? "" : " [화면 변화 없음]";
}

function textInput(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

interface RunState {
  captions: string[];
  log: string[];
  seen: Set<string>;
  steps: number;
  view: Buffer;
}

/** Saves the current screen unless it repeats one already saved. */
async function saveHighlight(
  state: RunState,
  browser: HighlightBrowser,
  caption: string,
  onCapture: RunHighlightAgentOptions["onCapture"]
): Promise<"kept" | "duplicate" | "stopped"> {
  const shot = await browser.capture();
  if (state.seen.has(shot.hash)) {
    state.log.push(`${state.steps}. capture 거절: 이미 저장한 화면과 같음`);
    return "duplicate";
  }
  state.seen.add(shot.hash);
  if (!(await onCapture({ ...shot, caption }))) {
    return "stopped";
  }
  state.captions.push(caption);
  state.log.push(`${state.steps}. capture_highlight — ${caption}`);
  return "kept";
}

/** Performs one browser action and records what it did. */
async function performAction(
  state: RunState,
  browser: HighlightBrowser,
  name: string,
  input: Record<string, unknown>
) {
  if (!BROWSER_ACTIONS.has(name)) {
    state.log.push(`${state.steps}. 알 수 없는 도구: ${name}`);
    return;
  }
  const result = await browser.act(name, input);
  state.view = result.view;
  state.log.push(
    `${state.steps}. ${name}(${describeArgs(input)}) — ${textInput(input, "note")}${actionOutcome(result)}`
  );
}

export async function runHighlightAgent({
  browser,
  model,
  project,
  firstView,
  firstHash,
  onCapture,
  maxSteps = 30,
  maxCaptures = 4,
  maxDurationMs = 180_000,
  now = Date.now,
}: RunHighlightAgentOptions): Promise<RunHighlightAgentResult> {
  const startedAt = now();
  const state: RunState = {
    captions: [],
    log: [],
    seen: new Set([firstHash]),
    steps: 0,
    view: firstView,
  };
  const end = (endReason: HighlightEndReason): RunHighlightAgentResult => ({
    captured: state.captions.length,
    endReason,
    steps: state.steps,
  });

  while (state.steps < maxSteps) {
    if (now() - startedAt > maxDurationMs) {
      return end("timeout");
    }
    state.steps += 1;
    const reply = await model.next({
      project,
      step: state.steps,
      maxSteps,
      maxCaptures,
      captions: [...state.captions],
      log: state.log.slice(-12),
      view: state.view,
    });

    if (reply.kind === "refusal") {
      return end("refusal");
    }
    if (reply.kind === "none") {
      state.log.push(`${state.steps}. (도구 호출 없음)`);
    } else if (reply.name === "finish") {
      return end("finished");
    } else if (reply.name === "capture_highlight") {
      const saved = await saveHighlight(
        state,
        browser,
        textInput(reply.input, "caption"),
        onCapture
      );
      if (saved === "stopped") {
        return end("stopped");
      }
      if (state.captions.length >= maxCaptures) {
        return end("max_captures");
      }
    } else {
      await performAction(state, browser, reply.name, reply.input);
    }
  }

  return end("max_steps");
}
