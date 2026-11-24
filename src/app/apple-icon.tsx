import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <svg width="150" height="150" viewBox="0 0 32 32">
        <path
          d="M9 4h10.4a6.4 6.4 0 0 0 7.4 5.6A6.5 6.5 0 0 0 30 10.8V23a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
          fill="#c2410c"
        />
        <rect x="7" y="16" width="18" height="3.2" rx="1.6" fill="#ffffff" />
      </svg>
    </div>,
    size,
  );
}
