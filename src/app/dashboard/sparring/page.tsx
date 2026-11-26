import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormMessage } from "@/components/forms/form-fields";
import { requireUser } from "@/lib/auth/dal";
import { getMySparring } from "@/lib/sparring/queries";
import { formatDateTime, gameTypeLabel } from "@/lib/labels";

export const metadata = { title: "Sparring saya" };

export default function MySparringPage({ searchParams }: PageProps<"/dashboard/sparring">) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h1 className="display text-4xl uppercase sm:text-5xl">Sparring saya</h1>
        </div>
        <Link href="/sparring/new" className={buttonVariants({ size: "lg" })}>
          <Plus /> Buka tantangan
        </Link>
      </header>
      <Suspense fallback={<Skeleton className="h-96 rounded-md" />}>
        <Lists searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const postStatus: Record<string, string> = {
  open: "Mencari lawan",
  matched: "Lawan didapat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};
const requestStatus: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

function Row({ href, title, meta, badge, highlight }: { href: string; title: string; meta: string; badge: string; highlight?: boolean }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium group-hover:text-primary">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
        <Badge variant="outline" className={highlight ? "border-brass/50 text-brass" : undefined}>
          {badge}
        </Badge>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function Block({ title, empty, children, count }: { title: string; empty: string; children: React.ReactNode; count: number }) {
  return (
    <section>
      <h2 className="mb-3 border-t border-foreground/80 pt-3 font-heading text-2xl uppercase">{title}</h2>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">{children}</ul>
      )}
    </section>
  );
}

async function Lists({ searchParams }: { searchParams: PageProps<"/dashboard/sparring">["searchParams"] }) {
  const user = await requireUser("/dashboard/sparring");
  const [{ posts, requests, matches }, sp] = await Promise.all([getMySparring(user.id), searchParams]);

  return (
    <div className="space-y-10">
      {sp.deleted ? <FormMessage ok message="Tantangan dihapus." /> : null}

      <Block title="Pertandingan" empty="Belum ada pertandingan. Terima atau kirim tantangan dulu." count={matches.length}>
        {matches.map((m) => {
          const meA = m.team_a_player1 === user.id;
          const opp = meA ? m.player_b : m.player_a;
          const r = m.result;
          const needsMe = !!r && !r.confirmed_at && r.reported_by !== user.id;
          const canReport = !r && m.status !== "completed" && m.started;
          const badge =
            m.status === "completed" && r
              ? (r.winner_team === "a") === meA ? "Menang" : "Kalah"
              : needsMe ? "Konfirmasi hasil" : r ? "Menunggu lawan" : canReport ? "Ajukan hasil" : "Terjadwal";
          return (
            <Row
              key={m.id}
              href={m.sparring_post_id ? `/sparring/${m.sparring_post_id}` : "/dashboard/sparring"}
              title={`vs ${opp?.full_name || opp?.username || "Pemain"}`}
              meta={m.scheduled_at ? `${formatDateTime(m.scheduled_at)} WIB` : ""}
              badge={badge}
              highlight={needsMe || canReport}
            />
          );
        })}
      </Block>

      <Block title="Tantangan yang saya buka" empty="Belum ada. Buka tantangan pertamamu dari peta." count={posts.length}>
        {posts.map((p) => {
          const incoming = p.sparring_requests.filter((r) => r.status === "pending").length;
          return (
            <Row
              key={p.id}
              href={`/sparring/${p.id}`}
              title={p.place_name ?? p.city}
              meta={`${gameTypeLabel[p.game_type]} · ${formatDateTime(p.scheduled_at)} WIB`}
              badge={p.status === "open" && incoming > 0 ? `${incoming} penantang` : postStatus[p.status]}
              highlight={p.status === "open" && incoming > 0}
            />
          );
        })}
      </Block>

      <Block title="Tantangan yang saya kirim" empty="Belum mengirim tantangan." count={requests.length}>
        {requests.map((r) =>
          r.post ? (
            <Row
              key={r.id}
              href={`/sparring/${r.post.id}`}
              title={r.post.place_name ?? r.post.city}
              meta={`${gameTypeLabel[r.post.game_type]} · ${formatDateTime(r.post.scheduled_at)} WIB`}
              badge={requestStatus[r.status]}
              highlight={r.status === "accepted"}
            />
          ) : null,
        )}
      </Block>
    </div>
  );
}
