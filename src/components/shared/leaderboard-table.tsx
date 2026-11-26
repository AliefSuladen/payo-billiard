import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/domain";

const medal = (rank: number) =>
  rank === 1
    ? "bg-brass text-brass-foreground"
    : rank === 2
      ? "bg-slate-300 text-slate-900"
      : rank === 3
        ? "bg-amber-700 text-amber-50"
        : "bg-white/[0.06] text-muted-foreground";

function PlayerCell({ p }: { p: LeaderboardEntry }) {
  const name = p.full_name || p.username;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 border border-white/10">
        {p.avatar_url ? <AvatarImage src={p.avatar_url} alt="" /> : null}
        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
      </div>
    </div>
  );
}

/** Responsive leaderboard: a real table on md+, stacked rows on phones. */
export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">Peringkat pemain</caption>
        <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Rank</th>
            <th scope="col" className="px-5 py-3 font-medium">Pemain</th>
            <th scope="col" className="px-5 py-3 font-medium">Kota</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Main</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Win rate</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((p) => (
            <tr key={p.user_id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
              <td className="px-5 py-3">
                <span className={cn("grid size-7 place-items-center rounded-full text-xs font-bold", medal(p.rank))}>
                  {p.rank}
                </span>
              </td>
              <td className="px-5 py-3"><PlayerCell p={p} /></td>
              <td className="px-5 py-3 text-muted-foreground">{p.city ?? "—"}</td>
              <td className="px-5 py-3 text-right tabular-nums">{p.matches_played}</td>
              <td className="px-5 py-3 text-right tabular-nums">{Number(p.win_rate).toFixed(0)}%</td>
              <td className="px-5 py-3 text-right font-heading font-bold tabular-nums text-primary">{p.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol className="divide-y divide-white/[0.05] md:hidden">
        {entries.map((p) => (
          <li key={p.user_id} className="flex items-center gap-3 px-4 py-3">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", medal(p.rank))}>
              {p.rank}
            </span>
            <div className="min-w-0 flex-1"><PlayerCell p={p} /></div>
            <div className="text-right">
              <p className="font-heading font-bold tabular-nums text-primary">{p.rating}</p>
              <p className="text-[11px] text-muted-foreground">{Number(p.win_rate).toFixed(0)}% · {p.matches_played} main</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
