import { ImageResponse } from "next/og";

export const size = { width: 16, height: 16 };
export const contentType = "image/png";

const TERRACOTTA = "#c15f3c";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

/**
 * At 16x16 the `>` prefix is dropped per the wireframe's "collapse rule".
 * Only the `_` cursor glyph remains on a terracotta square so the mark stays
 * legible in tab strips and bookmark bars.
 */
export function IconElement(): React.ReactElement {
  return (
    <div
      style={{
        background: TERRACOTTA,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: MONO_STACK,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      _
    </div>
  );
}

export default function Icon2() {
  return new ImageResponse(IconElement(), size);
}
