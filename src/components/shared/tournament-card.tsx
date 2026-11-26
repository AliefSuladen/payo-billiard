import { CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  formatIDR,
  gameTypeLabel,
  tournamentFormatLabel,
  tournamentStatusLabel,
} from "@/lib/labels";
import type { TournamentSummary } from "@/types/domain";

export function TournamentCard({ tournament: t }: { tournament: TournamentSummary }) {
  const fill = Math.min(100, Math.round((t.participant_count / Math.max(1, t.max_participants)) * 100));
  return (
    <article className="relative flex flex-col overflow-hidden rounded-md border border-border bg-surface p-5 transition-colors hover:border-brass/40">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Trophy className="size-5 text-brass" aria-hidden />
        <Badge variant="outline" className="border-brass/30 text-brass">
          {tournamentStatusLabel[t.status]}
        </Badge>
      </div>
      <h3 className="font-heading text-lg leading-snug font-semibold">{t.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {gameTypeLabel[t.game_type]} · {tournamentFormatLabel[t.format]}
      </p>
      <dl className="mt-4 grid gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          <dt className="sr-only">Tanggal</dt>
          <dd>{formatDate(t.starts_at)}</dd>
        </div>
        {t.city ? (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" />
            <dt className="sr-only">Kota</dt>
            <dd>{t.city}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3.5" /> {t.participant_count}/{t.max_participants} peserta
          </span>
          <span className="font-semibold">{t.entry_fee > 0 ? formatIDR(t.entry_fee) : "Gratis"}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-brass" style={{ width: `${fill}%` }} />
        </div>
      </div>
    </article>
  );
}
