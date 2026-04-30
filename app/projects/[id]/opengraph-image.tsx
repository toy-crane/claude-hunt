import { fetchProjectDetail } from "@widgets/project-detail";
import { ImageResponse } from "next/og";

export const alt = "claude-hunt — 프로젝트 상세";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const BG = "#ffffff";
const INK = "#252525";
const MUTED = "#8c8c8c";
const ACCENT = "#c15f3c";
const BORDER = "rgba(0,0,0,.1)";

interface PageProps {
  params: { id: string };
}

export default async function Image({ params }: PageProps) {
  const project = await fetchProjectDetail(params.id, null);
  const title = project?.title ?? "claude-hunt";
  const tagline = project?.tagline ?? "";
  const cohort = project?.cohort_name ?? "";
  const author = project?.author_display_name ?? "익명";
  const primary = project?.primaryImageUrl ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          background: BG,
          width: "100%",
          height: "100%",
          display: "flex",
          color: INK,
          fontFamily: "system-ui, sans-serif",
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
                  display: "inline-flex",
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
                fontWeight: 700,
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
      </div>
    ),
    size
  );
}
