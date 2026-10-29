import { describe, expect, it, vi } from "vitest";
import {
  type HighlightBrowser,
  type HighlightModel,
  runHighlightAgent,
} from "./run-highlight-agent";

interface Call {
  input: Record<string, unknown>;
  name: string;
}

/** A mock whose result is delivered asynchronously, like the real port. */
function resolved<A extends unknown[], R>(impl: (...args: A) => R) {
  return vi.fn((...args: A) => Promise.resolve(impl(...args)));
}

/** A model that answers each step with the next scripted tool call. */
function scriptedModel(calls: Array<Call | "refuse">) {
  const requests: unknown[] = [];
  const model: HighlightModel = {
    next: resolved((request) => {
      requests.push(request);
      const call = calls.shift() ?? { name: "finish", input: {} };
      if (call === "refuse") {
        return { kind: "refusal" as const };
      }
      return { kind: "tool" as const, ...call };
    }),
  };
  return { model, requests };
}

/** A browser whose captures return the scripted hashes in order. */
function fakeBrowser(captureHashes: string[]) {
  const acts: Call[] = [];
  let n = 0;
  const browser: HighlightBrowser = {
    act: resolved((name, input) => {
      acts.push({ name, input });
      return {
        ok: true,
        url: "https://lunch.example.com/",
        changed: true,
        view: Buffer.from(`view-${acts.length}`),
      };
    }),
    capture: resolved(() => {
      const hash = captureHashes[n] ?? `h${n}`;
      n += 1;
      return { hash, image: Buffer.from(`image-${hash}`) };
    }),
  };
  return { browser, acts };
}

const base = {
  project: {
    title: "점심 룰렛",
    tagline: "오늘 점심 메뉴를 골라 주는 룰렛",
  },
  firstView: Buffer.from("first-view"),
  firstHash: "first",
  signup: {
    email: "capture-1a2b@claude-hunt.com",
    password: "Ch-secret-9!",
    name: "claudehunt1a2b",
  },
};

const capture = (caption: string): Call => ({
  name: "capture_highlight",
  input: { caption, note: "결과 화면" },
});
const click = (x: number, y: number): Call => ({
  name: "click",
  input: { x, y, note: "돌리기" },
});

describe("runHighlightAgent", () => {
  it("saves the screens the model asks for, in order, and stops after four", async () => {
    const { model } = scriptedModel([
      click(640, 700),
      capture("돌아가는 룰렛"),
      click(640, 700),
      capture("오늘 점심 결과"),
      capture("메뉴 목록"),
      capture("최근 기록"),
      capture("하나 더"),
    ]);
    const { browser } = fakeBrowser(["a", "b", "c", "d", "e"]);
    const saved: string[] = [];

    const result = await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: (image) => {
        saved.push(image.hash);
        return Promise.resolve(true);
      },
    });

    expect(saved).toEqual(["a", "b", "c", "d"]);
    expect(result).toMatchObject({ captured: 4, endReason: "max_captures" });
  });

  it("asks the model at most thirty times", async () => {
    const { model } = scriptedModel(
      Array.from({ length: 50 }, () => click(10, 10))
    );
    const { browser } = fakeBrowser([]);

    const result = await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: async () => true,
    });

    expect(model.next).toHaveBeenCalledTimes(30);
    expect(result.endReason).toBe("max_steps");
  });

  it("never saves the first screen or an already saved screen again", async () => {
    const { model } = scriptedModel([
      capture("첫 화면 그대로"),
      capture("결과"),
      capture("결과 그대로"),
      { name: "finish", input: { note: "끝" } },
    ]);
    const { browser } = fakeBrowser(["first", "b", "b"]);
    const saved: string[] = [];

    await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: (image) => {
        saved.push(image.hash);
        return Promise.resolve(true);
      },
    });

    expect(saved).toEqual(["b"]);
  });

  it("stops as soon as a saved screen can no longer be kept", async () => {
    const { model } = scriptedModel([
      capture("결과"),
      click(1, 1),
      capture("목록"),
    ]);
    const { browser } = fakeBrowser(["a", "b"]);

    const result = await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: async () => false,
    });

    expect(result).toMatchObject({ captured: 0, endReason: "stopped" });
    expect(browser.act).not.toHaveBeenCalled();
  });

  it("ends without saving more when the model refuses", async () => {
    const { model } = scriptedModel(["refuse", capture("결과")]);
    const { browser } = fakeBrowser(["a"]);

    const result = await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: async () => true,
    });

    expect(result).toMatchObject({ captured: 0, endReason: "refusal" });
  });

  it("stops when the run's time budget is spent", async () => {
    const { model } = scriptedModel(
      Array.from({ length: 10 }, () => click(10, 10))
    );
    const { browser } = fakeBrowser([]);
    let clock = 0;

    const result = await runHighlightAgent({
      ...base,
      browser,
      model,
      maxDurationMs: 180_000,
      now: () => {
        clock += 70_000;
        return clock;
      },
      onCapture: async () => true,
    });

    expect(result.endReason).toBe("timeout");
    expect(model.next).toHaveBeenCalledTimes(2);
  });

  it("types the capture account's sign-up values without showing them in the step log", async () => {
    const { model, requests } = scriptedModel([
      click(400, 300),
      {
        name: "type_signup_value",
        input: { field: "email", note: "이메일 칸" },
      },
      click(400, 360),
      {
        name: "type_signup_value",
        input: { field: "password", note: "비밀번호 칸" },
      },
    ]);
    const { browser, acts } = fakeBrowser([]);

    await runHighlightAgent({
      ...base,
      browser,
      model,
      maxSteps: 5,
      onCapture: async () => true,
    });

    expect(acts).toEqual([
      { name: "click", input: { x: 400, y: 300, note: "돌리기" } },
      { name: "type_text", input: { text: "capture-1a2b@claude-hunt.com" } },
      { name: "click", input: { x: 400, y: 360, note: "돌리기" } },
      { name: "type_text", input: { text: "Ch-secret-9!" } },
    ]);
    const lastLog = (requests.at(-1) as { log: string[] }).log.join("\n");
    expect(lastLog).toContain('type_signup_value(field="password")');
    expect(lastLog).not.toContain("Ch-secret-9!");
    expect(lastLog).not.toContain("capture-1a2b@claude-hunt.com");
  });

  it("marks the first screen saved after getting past a sign-in first screen as the new primary image", async () => {
    const { model } = scriptedModel([
      click(400, 300),
      { name: "type_text", input: { text: "검증총무", note: "이름" } },
      click(400, 400),
      {
        name: "signed_in",
        input: { first_screen_was_sign_in: true, note: "입장 완료" },
      },
      capture("투표 목록"),
      capture("투표 결과"),
    ]);
    const { browser } = fakeBrowser(["a", "b"]);
    const saved: Array<{ hash: string; replacesFirst: boolean }> = [];

    await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: ({ hash, replacesFirst }) => {
        saved.push({ hash, replacesFirst });
        return Promise.resolve(true);
      },
    });

    expect(saved).toEqual([
      { hash: "a", replacesFirst: true },
      { hash: "b", replacesFirst: false },
    ]);
  });

  it("replaces the primary image at most once, even when the agent signs in again", async () => {
    const signedIn = {
      name: "signed_in",
      input: { first_screen_was_sign_in: true, note: "입장" },
    };
    const { model } = scriptedModel([
      { name: "type_text", input: { text: "demo", note: "아이디" } },
      signedIn,
      capture("대시보드"),
      { name: "type_text", input: { text: "demo", note: "다시 로그인" } },
      signedIn,
      capture("결과"),
    ]);
    const { browser } = fakeBrowser(["a", "b"]);
    const saved: boolean[] = [];

    await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: ({ replacesFirst }) => {
        saved.push(replacesFirst);
        return Promise.resolve(true);
      },
    });

    expect(saved).toEqual([true, false]);
  });

  it("keeps the primary image when the agent reports signing in without having typed anything", async () => {
    const { model } = scriptedModel([
      click(400, 400),
      {
        name: "signed_in",
        input: { first_screen_was_sign_in: true, note: "들어옴" },
      },
      capture("목록"),
    ]);
    const { browser } = fakeBrowser(["a"]);
    const saved: boolean[] = [];

    await runHighlightAgent({
      ...base,
      browser,
      model,
      onCapture: ({ replacesFirst }) => {
        saved.push(replacesFirst);
        return Promise.resolve(true);
      },
    });

    expect(saved).toEqual([false]);
  });

  it("shows the model only the current screen at each step", async () => {
    const { model, requests } = scriptedModel([
      click(640, 700),
      click(640, 700),
    ]);
    const { browser } = fakeBrowser([]);

    await runHighlightAgent({
      ...base,
      browser,
      model,
      maxSteps: 3,
      onCapture: async () => true,
    });

    const views = (requests as Array<{ view: Buffer }>).map((r) =>
      r.view.toString()
    );
    expect(views).toEqual(["first-view", "view-1", "view-2"]);
  });
});
