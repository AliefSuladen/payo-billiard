import { formatDateTime, gameTypeLabel, matchFormatLabel, skillLevelLabel } from "@/lib/labels";
import type { GameType, MatchFormat, SkillLevel } from "@/types/domain";

type ShareSource = {
  city: string;
  place_name: string | null;
  scheduled_at: string;
  skill_level: SkillLevel;
  game_type: GameType;
  match_format: MatchFormat;
  race_to: number | null;
};

export const shareTitle = (p: ShareSource) =>
  `Cari lawan ${gameTypeLabel[p.game_type]} di ${p.place_name ?? p.city}`;

export const shareSummary = (p: ShareSource) =>
  [
    `${formatDateTime(p.scheduled_at)} WIB`,
    p.city,
    matchFormatLabel[p.match_format],
    skillLevelLabel[p.skill_level],
    p.race_to ? `Race to ${p.race_to}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** WhatsApp message; the page URL is appended last so WhatsApp builds a preview card. */
export const shareMessage = (p: ShareSource) =>
  `🎱 *${shareTitle(p)}*
${shareSummary(p)}

Berani terima tantangan? Gabung di Payo Billiard:`;
