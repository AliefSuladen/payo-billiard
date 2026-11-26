import type { GameType, MatchFormat, SkillLevel, TournamentFormat, TournamentStatus } from "@/types/domain";

export const skillLevelLabel: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  professional: "Professional",
};

export const gameTypeLabel: Record<GameType, string> = {
  eight_ball: "8 Ball",
  nine_ball: "9 Ball",
  ten_ball: "10 Ball",
  straight_pool: "Straight Pool",
};

export const matchFormatLabel: Record<MatchFormat, string> = {
  singles: "1 vs 1",
  doubles: "2 vs 2",
};

export const tournamentFormatLabel: Record<TournamentFormat, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
};

export const tournamentStatusLabel: Record<TournamentStatus, string> = {
  draft: "Draft",
  registration_open: "Pendaftaran dibuka",
  registration_closed: "Pendaftaran ditutup",
  ongoing: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const roleLabel = {
  player: "Pemain",
  venue_owner: "Pemilik Venue",
  admin: "Admin",
} as const;

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
export const formatIDR = (value: number) => idr.format(value);

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});
export const formatDateTime = (iso: string) => dateFmt.format(new Date(iso));

const dayFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
export const formatDate = (iso: string) => dayFmt.format(new Date(iso));

export const initials = (name: string | null | undefined) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
