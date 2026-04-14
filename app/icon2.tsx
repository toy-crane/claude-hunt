import { ImageResponse } from "next/og";

export const size = { width: 16, height: 16 };
export const contentType = "image/png";

const INK = "#1a1512";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

/**
 * 16×16 favicon uses the monochrome "terminal prompt" mark — white `>` on
 * near-black — so the glyph stays legible at the smallest size and the brand
 * reads as a CLI signature rather than a colored block.
 */
export function IconElement(): React.ReactElement {
  return (
    <div
      style={{
        background: INK,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: MONO_STACK,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      &gt;
    </div>
  );
}

export default function Icon2() {
  return new ImageResponse(IconElement(), size);
}
