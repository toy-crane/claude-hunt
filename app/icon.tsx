import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const INK = "#1a1512";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export function IconElement(): React.ReactElement {
  return (
    <div
      style={{
        background: INK,
        width: "100%",
        height: "100%",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: MONO_STACK,
        fontSize: 22,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      &gt;
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(IconElement(), size);
}
