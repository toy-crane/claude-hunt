import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const TERRACOTTA = "#c15f3c";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export function IconElement(): React.ReactElement {
  return (
    <div
      style={{
        background: "#fdf6ee",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        color: "#1a1512",
        fontFamily: MONO_STACK,
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: -0.4,
      }}
    >
      <span style={{ color: TERRACOTTA }}>&gt;</span>
      <span>claude-hunt</span>
      <span style={{ color: TERRACOTTA }}>_</span>
    </div>
  );
}

export default function AppleIcon() {
  return new ImageResponse(IconElement(), size);
}
