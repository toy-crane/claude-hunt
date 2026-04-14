import { ImageResponse } from "next/og";

export const alt = "claude-hunt — discover what the cohort is building";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TERRACOTTA = "#c15f3c";
const BG = "#fdf6ee";
const INK = "#1a1512";
const MUTED = "#6b5f54";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export function OgElement(): React.ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "96px 96px 72px",
        fontFamily: MONO_STACK,
        color: INK,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontSize: 140,
          fontWeight: 700,
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        <span style={{ color: TERRACOTTA, marginRight: 8 }}>&gt;</span>
        <span>claude-hunt</span>
        <span style={{ color: TERRACOTTA }}>_</span>
      </div>
      <div
        style={{
          marginTop: 32,
          fontSize: 36,
          color: INK,
          maxWidth: "80%",
        }}
      >
        Discover what the cohort is building.
      </div>
      <div
        style={{
          marginTop: "auto",
          fontSize: 22,
          color: MUTED,
        }}
      >
        claude-hunt.app
      </div>
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(OgElement(), size);
}
