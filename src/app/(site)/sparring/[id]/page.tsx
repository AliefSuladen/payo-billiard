import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Clock, ExternalLink, MapPin, Pencil, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormMessage } from "@/components/forms/form-fields";
import { ActionButton, RequestForm, ResultForm } from "@/components/sparring/action-controls";
import { getSessionUser } from "@/lib/auth/dal";
import { getSparringDetail, type MatchRow, type SparringDetail, type SparringRequestRow } from "@/lib/sparring/queries";
import {
  cancelRequestAction,
  deleteSparringAction,
  reportResultAction,
  respondRequestAction,
  respondResultAction,
  sendRequestAction,
  shareWhatsappAction,
  unshareWhatsappAction,
} from "@/lib/sparring/actions";
import { MatchChat } from "@/components/sparring/match-chat";
import { formatDateTime, gameTypeLabel, initials, matchFormatLabel, skillLevelLabel } from "@/lib/labels";
import { googleMapsUrl } from "@/lib/places/types";
import { getSparringShare } from "@/lib/data/public";
import { shareMessage, shareSummary, shareTitle } from "@/lib/sparring/share";
import { ShareButtons } from "@/components/sparring/share-buttons";

export async function generateMetadata({ params }: PageProps<"/sparring/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = await getSparringShare(id);
  if (!post) return { title: "Tantangan sparring" };
  const title = shareTitle(post);
  const description = `${shareSummary(post)}. Dibuka oleh ${post.author?.full_name || post.author?.username || "pemain"} di Payo Billiard.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `/sparring/${id}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const statusLabel: Record<SparringDetail["status"], string> = {
  open: "Mencari lawan",
  matched: "Lawan didapat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export default function SparringDetailPage({ params, searchParams }: PageProps<"/sparring/[id]">) {
  return (
    <div className="container-page max-w-5xl py-10">
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-md" />}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Person = SparringRequestRow["requester"];
const nameOf = (p: Person | null | undefined) => p?.full_name || p?.username || "Pemain";
const toChatPerson = (p: Person | null | undefined, id: string) => ({
  id,
  name: nameOf(p),
  avatar: p?.avatar_url ?? null,
});

function PersonChip({ person, label }: { person: Person | null | undefined; label?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10 border border-border">
        {person?.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials(nameOf(person))}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        {label ? <p className="eyebrow">{label}</p> : null}
        <p className="truncate font-semibold">{nameOf(person)}</p>
        {person?.username ? <p className="truncate text-xs text-muted-foreground">@{person.username}</p> : null}
      </div>
    </div>
  );
}

async function Detail({
  params,
  searchParams,
}: {
  params: PageProps<"/sparring/[id]">["params"];
  searchParams: PageProps<"/sparring/[id]">["searchParams"];
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [detail, viewer, sp] = await Promise.all([getSparringDetail(id), getSessionUser(), searchParams]);
  if (!detail) notFound();
  const { post, requests, match, messages, contacts } = detail;

  const isOwner = viewer?.id === post.user_id;
  const myRequest = viewer ? requests.find((r) => r.requester_id === viewer.id) : undefined;
  const pending = requests.filter((r) => r.status === "pending");
  const notice = sp.created ? "Tantangan berhasil dibuka." : sp.updated ? "Perubahan disimpan." : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        {notice ? <FormMessage ok message={notice} /> : null}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={post.status === "open" ? "bg-success/15 text-success" : "bg-surface-2 text-foreground"}>
              {statusLabel[post.status]}
            </Badge>
            <Badge variant="outline">{gameTypeLabel[post.game_type]}</Badge>
            <Badge variant="outline">{matchFormatLabel[post.match_format]}</Badge>
            <Badge variant="outline">{skillLevelLabel[post.skill_level]}</Badge>
            {post.race_to ? <Badge variant="outline">Race to {post.race_to}</Badge> : null}
          </div>
          <h1 className="display mt-4 text-5xl uppercase">{post.place_name ?? post.city}</h1>
          {post.place_address ? <p className="mt-2 text-sm text-muted-foreground">{post.place_address}</p> : null}
        </div>

        <dl className="grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <dt className="sr-only">Waktu</dt>
            <dd>{formatDateTime(post.scheduled_at)} WIB</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <dt className="sr-only">Durasi</dt>
            <dd>{post.duration_minutes / 60} jam</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <dt className="sr-only">Kota</dt>
            <dd>{post.city}</dd>
          </div>
        </dl>

        <PersonChip person={post.author} label="Dibuka oleh" />
        {post.notes ? <p className="rounded-md border border-border bg-surface p-4 text-sm">“{post.notes}”</p> : null}

        {post.latitude != null && post.longitude != null ? (
          <a
            href={googleMapsUrl({ lat: post.latitude, lng: post.longitude, name: post.place_name })}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Buka lokasi di Google Maps <ExternalLink />
          </a>
        ) : null}

        {post.status === "open" || post.status === "matched" ? (
          <section className="space-y-3 border-t border-border pt-5">
            <p className="eyebrow">Ajak lawan</p>
            <ShareButtons path={`/sparring/${post.id}`} text={shareMessage(post)} />
          </section>
        ) : null}
      </div>

      <aside className="space-y-6">
        {match ? (
          <MatchPanel match={match} viewerId={viewer?.id ?? null} postId={post.id} raceTo={post.race_to} />
        ) : null}

        {match && viewer && (viewer.id === match.team_a_player1 || viewer.id === match.team_b_player1) ? (
          <MatchChat
            key={match.id}
            matchId={match.id}
            me={toChatPerson(viewer.id === match.team_a_player1 ? match.player_a : match.player_b, viewer.id)}
            opponent={toChatPerson(
              viewer.id === match.team_a_player1 ? match.player_b : match.player_a,
              viewer.id === match.team_a_player1 ? match.team_b_player1 : match.team_a_player1,
            )}
            initialMessages={messages}
            contacts={contacts}
            myPhone={viewer.profile?.phone ?? null}
            closed={match.status === "cancelled"}
            shareAction={shareWhatsappAction.bind(null, match.id, post.id)}
            unshareAction={unshareWhatsappAction.bind(null, match.id, post.id)}
          />
        ) : null}

        {post.status === "open" ? (
          <section className="rounded-md border border-border bg-surface p-5">
            {!viewer ? (
              <>
                <h2 className="display text-2xl uppercase">Mau jadi lawannya?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengirim tantangan.</p>
                <Link href={`/login?next=/sparring/${post.id}`} className={`${buttonVariants({ size: "lg" })} mt-4`}>
                  Masuk
                </Link>
              </>
            ) : isOwner ? (
              <OwnerPanel postId={post.id} pending={pending} />
            ) : myRequest && myRequest.status === "pending" ? (
              <>
                <h2 className="display text-2xl uppercase">Tantangan terkirim</h2>
                <p className="mt-1 text-sm text-muted-foreground">Menunggu {nameOf(post.author)} menerima.</p>
                <div className="mt-4">
                  <ActionButton
                    variant="outline"
                    action={cancelRequestAction.bind(null, myRequest.id, post.id)}
                    confirmText="Batalkan tantangan ini?"
                  >
                    Batalkan tantangan
                  </ActionButton>
                </div>
              </>
            ) : myRequest && myRequest.status === "rejected" ? (
              <p className="text-sm text-muted-foreground">Tantangan Anda tidak diterima untuk sesi ini.</p>
            ) : (
              <>
                <h2 className="display mb-3 text-2xl uppercase">Tantang {nameOf(post.author)}</h2>
                <RequestForm action={sendRequestAction.bind(null, post.id)} />
              </>
            )}
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function OwnerPanel({ postId, pending }: { postId: string; pending: SparringRequestRow[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="display text-2xl uppercase">Tantangan masuk ({pending.length})</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih satu lawan. Setelah diterima, tantangan lain otomatis ditolak.
        </p>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada yang menantang. Bagikan ke grup WhatsApp biar cepat dapat lawan.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {pending.map((r) => (
            <li key={r.id} className="space-y-3 py-4">
              <PersonChip person={r.requester} />
              {r.message ? <p className="text-sm text-foreground/85">“{r.message}”</p> : null}
              <div className="flex gap-2">
                <ActionButton size="sm" action={respondRequestAction.bind(null, r.id, postId, true)} confirmText={`Terima ${nameOf(r.requester)} sebagai lawan?`}>
                  Terima
                </ActionButton>
                <ActionButton size="sm" variant="outline" action={respondRequestAction.bind(null, r.id, postId, false)}>
                  Tolak
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Link href={`/sparring/${postId}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <Pencil /> Edit
        </Link>
        <ActionButton
          variant="destructive"
          action={deleteSparringAction.bind(null, postId)}
          confirmText="Hapus tantangan ini? Semua permintaan yang masuk ikut terhapus."
        >
          Hapus
        </ActionButton>
      </div>
    </div>
  );
}

function MatchPanel({
  match,
  viewerId,
  postId,
  raceTo,
}: {
  match: MatchRow;
  viewerId: string | null;
  postId: string;
  raceTo: number | null;
}) {
  const isA = viewerId === match.team_a_player1;
  const isB = viewerId === match.team_b_player1;
  const isPlayer = isA || isB;
  const opponent = isA ? match.player_b : match.player_a;
  const r = match.result;
  const started = match.started;
  const winner = r ? (r.winner_team === "a" ? match.player_a : match.player_b) : null;

  return (
    <section className="rounded-md border border-primary/40 bg-surface p-5">
      <p className="eyebrow">Pertandingan</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PersonChip person={match.player_a} />
        <span className="display text-3xl tabular-nums">
          {r ? `${r.team_a_score}–${r.team_b_score}` : "vs"}
        </span>
        <div className="justify-self-end">
          <PersonChip person={match.player_b} />
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4 text-sm">
        {match.status === "completed" && r ? (
          <p className="flex items-center gap-2 font-semibold text-brass">
            <Trophy className="size-4" /> {nameOf(winner)} menang · hasil dikonfirmasi
            {match.is_rated ? " · rating diperbarui" : ""}
          </p>
        ) : r && !r.confirmed_at ? (
          viewerId && isPlayer && r.reported_by !== viewerId ? (
            <div className="space-y-3">
              <p>
                {nameOf(opponent)} mengajukan hasil: <strong>{nameOf(winner)} menang</strong>. Apakah benar?
              </p>
              <div className="flex gap-2">
                <ActionButton action={respondResultAction.bind(null, match.id, postId, true)} confirmText="Terima hasil ini? Hasil yang diterima bersifat final.">
                  Terima hasil
                </ActionButton>
                <ActionButton variant="outline" action={respondResultAction.bind(null, match.id, postId, false)}>
                  Tolak
                </ActionButton>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Menunggu {isPlayer ? nameOf(opponent) : "lawan"} mengonfirmasi hasil.</p>
          )
        ) : isPlayer ? (
          started ? (
            <div className="space-y-3">
              {match.status === "disputed" ? (
                <p className="text-warning">Hasil sebelumnya ditolak. Ajukan skor yang benar.</p>
              ) : (
                <p className="text-muted-foreground">Sudah selesai bermain? Ajukan hasilnya.</p>
              )}
              <ResultForm action={reportResultAction.bind(null, match.id, postId)} opponentName={nameOf(opponent)} raceTo={raceTo} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Hasil bisa diajukan setelah jadwal mulai ({formatDateTime(match.scheduled_at!)} WIB).
            </p>
          )
        ) : (
          <p className="text-muted-foreground">Pertandingan dijadwalkan.</p>
        )}
      </div>
    </section>
  );
}
