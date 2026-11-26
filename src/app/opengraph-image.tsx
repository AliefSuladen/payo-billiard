import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(circle at 80% 20%, rgba(47,140,255,0.45), transparent 55%), radial-gradient(circle at 10% 100%, rgba(240,179,65,0.18), transparent 45%), #06080c",
          color: "#f3f0e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", position: "relative", width: 72, height: 72 }}>
            <div style={{ position: "absolute", right: 0, top: 0, width: 56, height: 56, borderRadius: 999, background: "#2f8cff" }} />
            <div style={{ position: "absolute", left: 0, bottom: 0, width: 38, height: 38, borderRadius: 999, background: "#f3f0e8" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>PAYO</span>
            <span style={{ fontSize: 16, letterSpacing: 10, color: "#8b95a6" }}>BILLIARD</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
            Your Billiards Community Starts Here.
          </span>
          <span style={{ fontSize: 28, color: "#f0b341", fontWeight: 600 }}>{siteConfig.tagline}</span>
        </div>
      </div>
    ),
    size,
  );
}
