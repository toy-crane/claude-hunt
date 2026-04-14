import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const TERRACOTTA = "#c15f3c";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

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
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      _
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(IconElement(), size);
}
