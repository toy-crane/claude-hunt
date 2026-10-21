import type Anthropic from "@anthropic-ai/sdk";
import type {
  HighlightModel,
  HighlightModelRequest,
} from "./run-highlight-agent";

/** Claude Haiku 5.5, chosen after a 10-project evaluation (project-url-capture decision). */
export const HIGHLIGHT_MODEL_ID = "claude-haiku-5-5";

/** The part of the Anthropic client this adapter uses. */
export interface MessagesClient {
  messages: {
    create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<unknown>;
  };
}

const SYSTEM = `너는 학생이 만든 웹 프로젝트의 "하이라이트 스크린샷"을 찍는 에이전트다.
목표: 방문자가 이 프로젝트가 무엇을 하는지 한눈에 이해하고 흥미를 느낄 화면을 찍는다.
좋은 하이라이트: 핵심 기능이 동작 중인 화면(게임 플레이 중, 검색·계산 결과, 퀴즈 진행/결과, 대시보드에 데이터가 찬 상태), 서로 다른 화면이나 단계.
나쁜 하이라이트: 거의 같은 화면 반복, 로딩·빈 화면·오류·팝업만 있는 화면.

규칙:
- 매 턴 정확히 하나의 도구만 호출한다.
- 첫 화면은 이미 저장되어 있다. 첫 화면과 다른, 조작해야 나오는 화면을 찾아라.
- 버튼을 누르고, 필요하면 예시 값을 입력해 핵심 기능이 실제로 동작한 결과 화면을 만든다.
- 결과·진행 화면이 보이면 다음 행동보다 먼저 즉시 capture_highlight 한다. 미루면 화면이 사라질 수 있다.
- 입력값이 사라졌거나 결과가 안 나오면 같은 입력을 반복하지 말고 다른 기능이나 화면으로 넘어간다.
- 회원가입, 로그인, 결제, 삭제, 메시지·이메일 전송, 신고, 외부 사이트 이동은 절대 하지 않는다.
- 입력이 필요하면 짧고 무해한 예시 값(예: "서울", "아이언맨", "30")을 쓴다.
- 클릭 좌표는 스크린샷 픽셀 기준(가로 1280, 세로 800)이다.
- 같은 행동이 화면을 바꾸지 못했으면 다른 행동을 시도한다.
- 정해진 장수를 다 찍었거나 더 찍을 만한 화면이 없으면 finish 한다.`;

const note = {
  type: "string",
  description: "이 행동을 하는 이유 (한 문장)",
} as const;

function tool(
  name: string,
  description: string,
  props: Record<string, unknown>
): Anthropic.Tool {
  return {
    name,
    description,
    strict: true,
    input_schema: {
      type: "object" as const,
      properties: { ...props, note },
      required: [...Object.keys(props), "note"],
      additionalProperties: false,
    },
  };
}

const TOOLS = [
  tool("click", "화면의 (x, y) 지점을 클릭한다.", {
    x: { type: "integer" },
    y: { type: "integer" },
  }),
  tool(
    "type_text",
    "현재 포커스된 입력창에 글자를 입력한다. 먼저 입력창을 click 해야 한다.",
    { text: { type: "string" } }
  ),
  tool("press_key", "키를 누른다.", {
    key: {
      type: "string",
      enum: [
        "Enter",
        "Escape",
        "Tab",
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ],
    },
  }),
  tool("scroll", "페이지를 위/아래로 한 화면 정도 스크롤한다.", {
    direction: { type: "string", enum: ["up", "down"] },
  }),
  tool("go_back", "브라우저 뒤로 가기.", {}),
  tool(
    "wait",
    "애니메이션·게임·로딩이 끝나길 기다린다. 오래 걸릴 것 같으면 5초를 고른다.",
    { seconds: { type: "integer", enum: [2, 5] } }
  ),
  tool("capture_highlight", "지금 화면을 하이라이트로 저장한다.", {
    caption: {
      type: "string",
      description: "이 화면이 보여주는 것 (한국어 한 줄)",
    },
  }),
  tool("finish", "작업을 끝낸다.", {}),
];

function describeStep(request: HighlightModelRequest) {
  return [
    `프로젝트: ${request.project.title}`,
    `소개: ${request.project.tagline}`,
    `단계 ${request.step}/${request.maxSteps}, 찍은 하이라이트 ${request.captions.length}/${request.maxCaptures}`,
    request.captions.length
      ? `이미 찍은 화면:\n${request.captions.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "아직 찍은 하이라이트 없음",
    request.log.length
      ? `지금까지 한 행동:\n${request.log.join("\n")}`
      : "아직 한 행동 없음",
    "아래는 현재 화면이다. 다음 행동 하나를 도구로 호출하라.",
  ].join("\n\n");
}

interface ClaudeResponse {
  content?: Array<{
    input?: Record<string, unknown>;
    name?: string;
    type: string;
  }>;
  stop_reason?: string;
}

export function createClaudeHighlightModel(
  client: MessagesClient
): HighlightModel {
  return {
    async next(request) {
      const response = (await client.messages.create({
        model: HIGHLIGHT_MODEL_ID,
        max_tokens: 2048,
        system: [
          { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: TOOLS,
        tool_choice: { type: "auto" },
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: describeStep(request) },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: request.view.toString("base64"),
                },
              },
            ],
          },
        ],
      })) as ClaudeResponse;

      if (response.stop_reason === "refusal") {
        return { kind: "refusal" };
      }
      const call = response.content?.find((block) => block.type === "tool_use");
      if (!call?.name) {
        return { kind: "none" };
      }
      return { kind: "tool", name: call.name, input: call.input ?? {} };
    },
  };
}
