import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchTopProjects } from "@widgets/project-grid/server";
import { ImageResponse } from "next/og";
import type { CSSProperties, ReactElement } from "react";

export const alt = "claude-hunt — 함께 배우는 사람들의 프로젝트";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

// Colors — mirror artifacts/improve-og-image/references/project/colors_and_type.css.
const TERRACOTTA = "#c15f3c";
const BG_WHITE = "#ffffff";
const BG_RIGHT = "#fafafa";
const INK = "#252525";
const MUTED = "#8c8c8c";
const BORDER = "rgba(0,0,0,.08)";
const CARD_BORDER = "rgba(0,0,0,.1)";
const RANK_1 = "#f59e0b";
const RANK_2 = "#a1a1aa";
const RANK_3 = "#c2410c";

const RANK_COLORS = [RANK_1, RANK_2, RANK_3] as const;
const RANK_LABELS = ["1st", "2nd", "3rd"] as const;

export interface OgProject {
  author_display_name: string | null;
  id: string | null;
  screenshotUrl: string;
  tagline: string | null;
  title: string | null;
  vote_count: number | null;
}

// Six hardcoded projects used when the component is rendered without data
// (tests, intermediate verification). Task 3 replaces this with live data.
const PLACEHOLDER_PROJECTS: OgProject[] = [
  {
    id: "ph-1",
    title: "시장 리포트",
    tagline:
      "한국/미국 주식 포트폴리오를 관리하고, AI가 매일 시장 마감 리포트를 자동 생성",
    author_display_name: "토이크레인",
    vote_count: 1,
    screenshotUrl: "",
  },
  {
    id: "ph-2",
    title: "포켓몬 마스터 퀴즈",
    tagline:
      "1세대 포켓몬 151종의 실루엣을 보고 4지선다로 이름을 맞추는 퀴즈 게임",
    author_display_name: "토이크레인",
    vote_count: 1,
    screenshotUrl: "",
  },
  {
    id: "ph-3",
    title: "Vocabulary Builder",
    tagline: "영영사전 기반으로 단어를 학습하고 복습 퀴즈로 암기를 관리",
    author_display_name: "토이크레인",
    vote_count: 1,
    screenshotUrl: "",
  },
  {
    id: "ph-4",
    title: "Sky Dodge",
    tagline: "Flappy Bird 스타일의 비행기 장애물 회피 웹 게임",
    author_display_name: "토이크레인",
    vote_count: 0,
    screenshotUrl: "",
  },
  {
    id: "ph-5",
    title: "Rampage",
    tagline: "SSH로 서버 메모리를 실시간 모니터링하는 대시보드",
    author_display_name: "토이크레인",
    vote_count: 0,
    screenshotUrl: "",
  },
  {
    id: "ph-6",
    title: "랜덤채팅 + AI",
    tagline: "상대가 AI인지 사람인지 판별하는 익명 채팅 게임",
    author_display_name: "토이크레인",
    vote_count: 0,
    screenshotUrl: "",
  },
];

const CARD_CLAMP_2: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function Wordmark({
  fontSize,
  letterSpacing,
}: {
  fontSize: number;
  letterSpacing: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontFamily: "Geist Mono",
        fontWeight: 700,
        fontSize,
        lineHeight: 1,
        letterSpacing,
        color: INK,
      }}
    >
      <span style={{ color: TERRACOTTA, marginRight: 4 }}>&gt;</span>
      <span>claude-hunt</span>
      <span style={{ color: TERRACOTTA }}>_</span>
    </div>
  );
}

function TrendRow({ projects }: { projects: OgProject[] }) {
  const top3 = projects.slice(0, 3);
  if (top3.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: "Geist Mono",
      }}
    >
      <div
        style={{
          fontFamily: "Inter",
          fontSize: 11,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        지금 인기 프로젝트
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
          fontSize: 22,
          color: INK,
        }}
      >
        {top3.map((p, i) => (
          <div
            key={p.id}
            style={{ display: "flex", alignItems: "baseline", gap: 8 }}
          >
            <span
              data-og-role="trend-dot"
              style={{ color: RANK_COLORS[i], fontSize: 18 }}
            >
              ●
            </span>
            <span style={{ fontFamily: "Inter, Pretendard", fontWeight: 500 }}>
              {p.title}
            </span>
            {i < top3.length - 1 && (
              <span style={{ color: "rgba(0,0,0,.25)", marginLeft: 6 }}>·</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UrlFooter() {
  return (
    <div
      style={{
        fontFamily: "Geist Mono",
        fontSize: 16,
        color: INK,
        fontWeight: 600,
      }}
    >
      claude-hunt.com
    </div>
  );
}

function ProjectCard({ project, rank }: { project: OgProject; rank: number }) {
  const isTopThree = rank < 3;
  return (
    <div
      data-og-role="card"
      style={{
        width: 260,
        display: "flex",
        flexDirection: "column",
        background: BG_WHITE,
        boxShadow: `inset 0 0 0 1px ${CARD_BORDER}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Thumbnail 16:9 */}
      <div
        style={{
          width: 260,
          height: Math.round((260 * 9) / 16),
          background: MUTED,
          display: "flex",
          position: "relative",
        }}
      >
        {project.screenshotUrl ? (
          // biome-ignore lint/performance/noImgElement: next/og Satori only accepts plain <img>, not next/image
          <img
            alt=""
            height={Math.round((260 * 9) / 16)}
            src={project.screenshotUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            width={260}
          />
        ) : null}
        {isTopThree && (
          <div
            data-og-role="rank-badge"
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "2px 8px",
              borderRadius: 6,
              background: BG_WHITE,
              boxShadow: "0 1px 2px rgba(0,0,0,.2)",
              fontFamily: "Geist Mono",
              fontSize: 12,
              fontWeight: 700,
              color: RANK_COLORS[rank],
              display: "flex",
            }}
          >
            {RANK_LABELS[rank]}
          </div>
        )}
      </div>
      {/* Body */}
      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontWeight: 500,
            fontSize: 14,
            color: INK,
          }}
        >
          {project.title}
        </div>
        <div
          data-og-role="card-desc"
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            lineHeight: 1.5,
            color: MUTED,
            ...CARD_CLAMP_2,
          }}
        >
          {project.tagline ?? ""}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
            fontSize: 12,
            color: MUTED,
            fontFamily: "Inter",
          }}
        >
          <span>{project.author_display_name ?? "익명"} · 작성</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 6,
              boxShadow: `inset 0 0 0 1px ${CARD_BORDER}`,
              fontWeight: 600,
              color: INK,
              fontFamily: "Geist Mono",
              fontSize: 12,
            }}
          >
            ▲ {project.vote_count ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

function RightGrid({ projects }: { projects: OgProject[] }) {
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: BG_RIGHT,
        borderLeft: `1px solid ${BORDER}`,
        position: "relative",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <div
        data-og-role="cards"
        style={{
          position: "absolute",
          top: 44,
          left: 40,
          width: 760,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          transform: "rotate(-7deg)",
          transformOrigin: "0 0",
        }}
      >
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} rank={i} />
        ))}
      </div>
      <div
        data-og-role="fade"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(to right, transparent 35%, rgba(250, 250, 250, 0.3) 70%, rgb(250, 250, 250) 100%)",
        }}
      />
    </div>
  );
}

export function OgElement({
  projects = PLACEHOLDER_PROJECTS,
}: {
  projects?: OgProject[];
} = {}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG_WHITE,
        display: "flex",
        fontFamily: "Inter, Pretendard",
        color: INK,
      }}
    >
      {/* Left half */}
      <div
        style={{
          width: "50%",
          height: "100%",
          padding: "64px 48px 64px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Wordmark fontSize={52} letterSpacing={-1.2} />
          <div
            style={{
              marginTop: 28,
              fontFamily: "Inter, Pretendard",
              fontWeight: 500,
              fontSize: 32,
              lineHeight: 1.3,
              color: INK,
              letterSpacing: "-0.01em",
              maxWidth: 440,
            }}
          >
            함께 배우는 사람들의 프로젝트.
          </div>
          <div
            style={{
              marginTop: 16,
              fontFamily: "Inter, Pretendard",
              fontSize: 18,
              color: MUTED,
              lineHeight: 1.55,
              maxWidth: 420,
            }}
          >
            마음에 드는 프로젝트에 응원을 보내주세요.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <TrendRow projects={projects} />
          <UrlFooter />
        </div>
      </div>
      {/* Right half */}
      <RightGrid projects={projects} />
    </div>
  );
}

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(path.join(process.cwd(), "public/fonts", file));
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

async function fetchProjectsOrEmpty(): Promise<OgProject[]> {
  try {
    return await fetchTopProjects({ limit: 6 });
  } catch {
    // Keep the image generating even when the DB is unreachable (build-time
    // prerender without `supabase start`, transient network hiccup at ISR
    // regeneration, etc.). The wordmark / tagline / subtitle / URL still
    // render — the grid collapses to empty (Scenario 5, N = 0).
    return [];
  }
}

export default async function OpenGraphImage(): Promise<ImageResponse> {
  const [
    projects,
    geistMono700,
    jetbrainsMono500,
    inter400,
    inter500,
    pretendard400,
    pretendard500,
  ] = await Promise.all([
    fetchProjectsOrEmpty(),
    loadFont("GeistMono-Bold.ttf"),
    loadFont("JetBrainsMono-Medium.ttf"),
    loadFont("Inter-Regular.ttf"),
    loadFont("Inter-Medium.ttf"),
    loadFont("Pretendard-Regular.ttf"),
    loadFont("Pretendard-Medium.ttf"),
  ]);

  return new ImageResponse(<OgElement projects={projects} />, {
    ...size,
    fonts: [
      { name: "Geist Mono", data: geistMono700, style: "normal", weight: 700 },
      {
        name: "JetBrains Mono",
        data: jetbrainsMono500,
        style: "normal",
        weight: 500,
      },
      { name: "Inter", data: inter400, style: "normal", weight: 400 },
      { name: "Inter", data: inter500, style: "normal", weight: 500 },
      {
        name: "Pretendard",
        data: pretendard400,
        style: "normal",
        weight: 400,
      },
      {
        name: "Pretendard",
        data: pretendard500,
        style: "normal",
        weight: 500,
      },
    ],
  });
}
