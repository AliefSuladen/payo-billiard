import { ImageResponse } from "next/og";
import { getSparringShare } from "@/lib/data/public";
import { formatDateTime, gameTypeLabel, matchFormatLabel, skillLevelLabel } from "@/lib/labels";

export const alt = "Tantangan sparring di Payo Billiard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = { bg: "#0a0b0b", surface: "#121414", line: "#2a2d2d", text: "#efebe2", muted: "#9a978f", blue: "#3a7fd5", brass: "#d9a441" };

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getSparringShare(id);
  const place = post?.place_name ?? post?.city ?? "Payo Billiard";
  const who = post?.author?.full_name || post?.author?.username || "Pemain";
  const chips = post
    ? [gameTypeLabel[post.game_type], matchFormatLabel[post.match_format], skillLevelLabel[post.skill_level], post.race_to ? `Race to ${post.race_to}` : null].filter(
        (v): v is string => !!v,
      )
    : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: C.bg, color: C.text, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: C.blue, display: "flex" }} />
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>PAYO BILLIARD</span>
          </div>
          <span style={{ fontSize: 24, color: C.brass, letterSpacing: 6, fontWeight: 700 }}>
            {post?.status === "open" ? "MENCARI LAWAN" : "TANTANGAN SPARRING"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: place.length > 28 ? 64 : 84, fontWeight: 800, lineHeight: 1, textTransform: "uppercase", letterSpacing: -2 }}>
            {place.slice(0, 60)}
          </span>
          {post ? (
            <span style={{ fontSize: 34, color: C.text }}>
              {formatDateTime(post.scheduled_at)} WIB · {post.city}
            </span>
          ) : null}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {chips.map((c) => (
              <span key={c} style={{ fontSize: 24, padding: "8px 18px", border: `2px solid ${C.line}`, borderRadius: 6, background: C.surface }}>
                {c}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${C.line}`, paddingTop: 24, fontSize: 26, color: C.muted }}>
          <span>Dibuka oleh {who}</span>
          <span style={{ color: C.text, fontWeight: 700 }}>Berani terima tantangan?</span>
        </div>
      </div>
    ),
    size,
  );
}
