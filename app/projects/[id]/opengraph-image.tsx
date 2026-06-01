import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchProjectDetail } from "@widgets/project-detail";
import { ImageResponse } from "next/og";

export const alt = "claude-hunt — 프로젝트 상세";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#ffffff";
const INK = "#252525";
const MUTED = "#8c8c8c";
const ACCENT = "#c15f3c";
const BORDER = "rgba(0,0,0,.1)";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(path.join(process.cwd(), "public/fonts", file));
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

export default async function Image({ params }: PageProps) {
  const { id } = await params;
  const [project, pretendard400, pretendard500] = await Promise.all([
    fetchProjectDetail(id, null),
    loadFont("Pretendard-Regular.ttf"),
    loadFont("Pretendard-Medium.ttf"),
  ]);
  const title = project?.title ?? "claude-hunt";
  const tagline = project?.tagline ?? "";
  const cohort = project?.cohort_label ?? "";
  const author = project?.author_display_name ?? "익명";
  const primary = project?.primaryImageUrl ?? "";

  return new ImageResponse(
    <div
      style={{
        background: BG,
        width: "100%",
        height: "100%",
        display: "flex",
        color: INK,
        fontFamily: "Pretendard, system-ui, sans-serif",
      }}
    >
      {primary ? (
        <div
          style={{
            width: "55%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          {/* biome-ignore lint/correctness/useImageSize: ImageResponse renders via satori, not in the DOM */}
          {/* biome-ignore lint/performance/noImgElement: next/og ImageResponse does not support next/image */}
          <img
            alt=""
            src={primary}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {cohort ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 22,
                color: ACCENT,
                border: `1px solid ${ACCENT}`,
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              {cohort}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 500,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.4,
              color: MUTED,
            }}
          >
            {tagline}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: MUTED,
            gap: 12,
            alignItems: "center",
          }}
        >
          <span>by {author}</span>
          <span>·</span>
          <span>claude-hunt</span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
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
    }
  );
}
