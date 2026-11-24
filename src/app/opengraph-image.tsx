import { ImageResponse } from "next/og";

export const alt = "Bitebox: find a recipe, fix what's missing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const tapes = ["No cream? Greek yogurt", "No buttermilk? Milk + lemon", "Make it spicier"];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#edf0ea",
        color: "#25142c",
        padding: "64px 72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="64" height="64" viewBox="0 0 32 32">
          <path
            d="M9 4h10.4a6.4 6.4 0 0 0 7.4 5.6A6.5 6.5 0 0 0 30 10.8V23a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
            fill="#c4122f"
          />
          <rect x="7" y="16" width="18" height="3.2" rx="1.6" fill="#ffffff" />
        </svg>
        <div style={{ fontSize: 48, fontWeight: 800 }}>Bitebox</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3 }}>
          What&apos;s for dinner?
        </div>
        <div style={{ fontSize: 34, marginTop: 22, color: "#5d5364" }}>
          Search recipes, cook with what you have, and ask AI for swaps.
        </div>
      </div>
      <div style={{ display: "flex", gap: 18 }}>
        {tapes.map((t, i) => (
          <div
            key={t}
            style={{
              background: "#f3c83f",
              color: "#2a1e05",
              fontSize: 28,
              fontWeight: 700,
              padding: "10px 22px",
              transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)`,
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
