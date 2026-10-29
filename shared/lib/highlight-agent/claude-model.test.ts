import { describe, expect, it, vi } from "vitest";
import { createClaudeHighlightModel } from "./claude-model";

function fakeClient(response: unknown) {
  const create = vi.fn(async (_body: unknown) => response);
  return { client: { messages: { create } }, create };
}

const request = {
  project: { title: "점심 룰렛", tagline: "오늘 점심 메뉴를 골라 주는 룰렛" },
  step: 3,
  maxSteps: 30,
  maxCaptures: 4,
  captions: ["돌아가는 룰렛"],
  log: ["1. click(x=640, y=700) — 돌리기"],
  view: Buffer.from("jpeg-bytes"),
};

describe("createClaudeHighlightModel", () => {
  it("asks Claude Haiku 5.5 with the current screen as the only image", async () => {
    const { client, create } = fakeClient({
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "t1",
          name: "click",
          input: { x: 1, y: 2, note: "n" },
        },
      ],
    });
    const model = createClaudeHighlightModel(client);

    await model.next(request);

    const body = create.mock.calls[0]?.[0] as {
      model: string;
      messages: Array<{
        content: Array<{ type: string; source?: { data: string } }>;
      }>;
      tools: Array<{ name: string }>;
    };
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.messages).toHaveLength(1);
    const images = body.messages[0]?.content.filter((c) => c.type === "image");
    expect(images).toHaveLength(1);
    expect(images?.[0]?.source?.data).toBe(
      Buffer.from("jpeg-bytes").toString("base64")
    );
    expect(body.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "click",
        "type_text",
        "press_key",
        "scroll",
        "go_back",
        "wait",
        "capture_highlight",
        "finish",
        "type_signup_value",
        "signed_in",
      ])
    );
  });

  it("hands the owner's description over as data in its own block, ahead of the step", async () => {
    const { client, create } = fakeClient({ stop_reason: "end_turn" });

    await createClaudeHighlightModel(client).next({
      ...request,
      project: {
        ...request.project,
        description: "테스트는 검증총무 / 1234 로 가능합니다.",
      },
    });

    const body = create.mock.calls[0]?.[0] as {
      messages: Array<{ content: Array<{ type: string; text?: string }> }>;
    };
    const texts = (body.messages[0]?.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "");
    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain("테스트는 검증총무 / 1234 로 가능합니다.");
    expect(texts[1]).not.toContain("검증총무");
  });

  it("sends no description block when the project has none", async () => {
    const { client, create } = fakeClient({ stop_reason: "end_turn" });

    await createClaudeHighlightModel(client).next({
      ...request,
      project: { ...request.project, description: null },
    });

    const body = create.mock.calls[0]?.[0] as {
      messages: Array<{ content: Array<{ type: string }> }>;
    };
    const texts = (body.messages[0]?.content ?? []).filter(
      (c) => c.type === "text"
    );
    expect(texts).toHaveLength(1);
  });

  it("returns the first tool call Claude makes", async () => {
    const { client } = fakeClient({
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "누를게요" },
        {
          type: "tool_use",
          id: "t1",
          name: "capture_highlight",
          input: { caption: "결과", note: "n" },
        },
      ],
    });

    const reply = await createClaudeHighlightModel(client).next(request);

    expect(reply).toEqual({
      kind: "tool",
      name: "capture_highlight",
      input: { caption: "결과", note: "n" },
    });
  });

  it("reports a refusal so the run can end", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", content: [] });

    const reply = await createClaudeHighlightModel(client).next(request);

    expect(reply).toEqual({ kind: "refusal" });
  });

  it("reports when Claude answered without choosing an action", async () => {
    const { client } = fakeClient({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "잘 모르겠어요" }],
    });

    const reply = await createClaudeHighlightModel(client).next(request);

    expect(reply).toEqual({ kind: "none" });
  });
});
