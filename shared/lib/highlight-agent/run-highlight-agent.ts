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

/**
 * What the agent knows about the project besides its screen. The owner's
 * description is the only place it looks for access information.
 */
export interface HighlightProject {
  description?: string | null;
  tagline: string;
  title: string;
}

export interface HighlightModelRequest {
  captions: string[];
  log: string[];
  maxCaptures: number;
  maxSteps: number;
  project: HighlightProject;
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

/**
 * The account the agent signs up with when a sign-in wall blocks the
 * project. The model only names a field; the values never enter its
 * prompt or the step log.
 */
export interface HighlightSignupIdentity {
  email: string;
  name: string;
  password: string;
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
   * project's images changed underneath it. `replacesFirst` marks the first
   * screen saved after the agent got past a sign-in first screen, which
   * should take that sign-in screen's place as the primary image.
   */
  onCapture: (
    capture: HighlightCapture & { caption: string; replacesFirst: boolean }
  ) => Promise<boolean>;
  project: HighlightProject;
  signup: HighlightSignupIdentity;
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
  if (result.note === "typing_off_project_host") {
    return " [프로젝트 주소가 아닌 사이트라 입력하지 않음]";
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
  /** The sign-in first screen was already replaced; it happens once a run. */
  replacedFirst: boolean;
  /** The next saved screen replaces the sign-in first screen. */
  replaceFirst: boolean;
  seen: Set<string>;
  steps: number;
  /** Whether anything was typed yet; signing in needs at least that. */
  typed: boolean;
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
  const replacesFirst = state.replaceFirst;
  if (!(await onCapture({ ...shot, caption, replacesFirst }))) {
    return "stopped";
  }
  if (replacesFirst) {
    state.replaceFirst = false;
    state.replacedFirst = true;
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
  if (name === "type_text" && result.ok) {
    state.typed = true;
  }
  state.log.push(
    `${state.steps}. ${name}(${describeArgs(input)}) — ${textInput(input, "note")}${actionOutcome(result)}`
  );
}

/**
 * Records that the agent got into the app. When the first screen was the
 * sign-in wall, the next saved screen replaces it as the primary image.
 */
function markSignedIn(state: RunState, input: Record<string, unknown>) {
  if (!state.typed) {
    state.log.push(
      `${state.steps}. signed_in 거절: 아직 아무것도 입력하지 않음`
    );
    return;
  }
  if (input.first_screen_was_sign_in === true && !state.replacedFirst) {
    state.replaceFirst = true;
  }
  state.log.push(`${state.steps}. signed_in — ${textInput(input, "note")}`);
}

const SIGNUP_FIELDS = new Set<keyof HighlightSignupIdentity>([
  "email",
  "name",
  "password",
]);

/** Types one sign-up value; the log names the field, never the value. */
async function typeSignupValue(
  state: RunState,
  browser: HighlightBrowser,
  signup: HighlightSignupIdentity,
  input: Record<string, unknown>
) {
  const field = textInput(input, "field") as keyof HighlightSignupIdentity;
  if (!SIGNUP_FIELDS.has(field)) {
    state.log.push(`${state.steps}. type_signup_value 거절: 모르는 칸`);
    return;
  }
  const result = await browser.act("type_text", { text: signup[field] });
  state.view = result.view;
  state.typed ||= result.ok;
  state.log.push(
    `${state.steps}. type_signup_value(field="${field}") — ${textInput(input, "note")}${actionOutcome(result)}`
  );
}

export async function runHighlightAgent({
  browser,
  model,
  project,
  firstView,
  firstHash,
  onCapture,
  signup,
  maxSteps = 30,
  maxCaptures = 4,
  maxDurationMs = 180_000,
  now = Date.now,
}: RunHighlightAgentOptions): Promise<RunHighlightAgentResult> {
  const startedAt = now();
  const state: RunState = {
    captions: [],
    log: [],
    replaceFirst: false,
    replacedFirst: false,
    seen: new Set([firstHash]),
    steps: 0,
    typed: false,
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

    const endReason = await takeStep(state, reply, {
      browser,
      maxCaptures,
      onCapture,
      signup,
    });
    if (endReason) {
      return end(endReason);
    }
  }

  return end("max_steps");
}

/** Carries out the model's choice for one step; returns why the run ends, if it does. */
async function takeStep(
  state: RunState,
  reply: HighlightModelReply,
  {
    browser,
    maxCaptures,
    onCapture,
    signup,
  }: Pick<RunHighlightAgentOptions, "browser" | "onCapture" | "signup"> & {
    maxCaptures: number;
  }
): Promise<HighlightEndReason | undefined> {
  if (reply.kind === "refusal") {
    return "refusal";
  }
  if (reply.kind === "none") {
    state.log.push(`${state.steps}. (도구 호출 없음)`);
    return;
  }
  switch (reply.name) {
    case "finish":
      return "finished";
    case "capture_highlight": {
      const caption = textInput(reply.input, "caption");
      const saved = await saveHighlight(state, browser, caption, onCapture);
      if (saved === "stopped") {
        return "stopped";
      }
      return state.captions.length >= maxCaptures ? "max_captures" : undefined;
    }
    case "type_signup_value":
      await typeSignupValue(state, browser, signup, reply.input);
      return;
    case "signed_in":
      markSignedIn(state, reply.input);
      return;
    default:
      await performAction(state, browser, reply.name, reply.input);
      return;
  }
}
