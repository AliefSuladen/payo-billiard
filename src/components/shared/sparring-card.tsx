import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  formatDateTime,
  gameTypeLabel,
  initials,
  matchFormatLabel,
  skillLevelLabel,
} from "@/lib/labels";
import type { SparringSummary } from "@/types/domain";

export function SparringCard({ post }: { post: SparringSummary }) {
  const name = post.author?.full_name || post.author?.username || "Pemain";
  const placeName = post.place_name ?? post.venue?.name ?? post.location_text ?? post.city;

  return (
    <Link href={`/sparring/${post.id}`} className="group flex flex-col gap-4 rounded-md border border-border bg-surface p-5 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <Avatar className="size-10 border border-border">
          {post.author?.avatar_url ? <AvatarImage src={post.author.avatar_url} alt="" /> : null}
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          {post.author?.username ? (
            <p className="truncate text-xs text-muted-foreground">@{post.author.username}</p>
          ) : null}
        </div>
        <Badge className="ml-auto bg-success/15 text-success">Open</Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{gameTypeLabel[post.game_type]}</Badge>
        <Badge variant="outline">{matchFormatLabel[post.match_format]}</Badge>
        <Badge variant="outline">{skillLevelLabel[post.skill_level]}</Badge>
      </div>

      <dl className="grid gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 shrink-0" />
          <dt className="sr-only">Waktu</dt>
          <dd>{formatDateTime(post.scheduled_at)} WIB</dd>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <dt className="sr-only">Lokasi</dt>
          <dd className="min-w-0">
            <span className="block truncate text-foreground/90">{placeName}</span>
            <span className="block truncate text-xs">{post.city}</span>
          </dd>
        </div>
      </dl>

      {post.notes ? <p className="line-clamp-2 text-sm text-foreground/80">“{post.notes}”</p> : null}

      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        Lihat & tantang <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
