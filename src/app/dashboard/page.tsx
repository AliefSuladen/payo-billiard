import { Suspense } from "react";
import Link from "next/link";
import { Bell, CalendarCheck2, MailWarning, Swords, Trophy, UserRoundPen } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { FormMessage } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { gameTypeLabel, roleLabel, skillLevelLabel } from "@/lib/labels";

export const metadata = { title: "Overview" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

const notices: Record<string, { ok: boolean; message: string }> = {
  welcome: { ok: true, message: "Akun berhasil dibuat. Selamat datang di Payo Billiard!" },
  password: { ok: true, message: "Password berhasil diperbarui." },
  forbidden: { ok: false, message: "Anda tidak memiliki akses ke halaman tersebut." },
};

async function Overview({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const notice =
    sp.welcome ? notices.welcome : sp.password === "updated" ? notices.password : sp.error === "forbidden" ? notices.forbidden : null;

  const supabase = (await createClient())!;
  const nowIso = new Date().toISOString();
  const head = { count: "exact" as const, head: true };
  const [bookings, sparring, tournaments, unread] = await Promise.all([
    supabase.from("bookings").select("id", head).eq("user_id", user.id).in("status", ["pending", "confirmed"]).gte("ends_at", nowIso),
    supabase.from("sparring_posts").select("id", head).eq("user_id", user.id).eq("status", "open"),
    supabase.from("tournament_participants").select("id", head).eq("user_id", user.id).in("status", ["registered", "confirmed"]),
    supabase.from("notifications").select("id", head).eq("user_id", user.id).is("read_at", null),
  ]);

  const p = user.profile;
  const name = p?.full_name || p?.username || "Pemain";
  const missing = [
    !p?.city && "kota",
    !p?.skill_level && "level",
    !p?.preferred_game && "permainan favorit",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      {notice ? <FormMessage ok={notice.ok} message={notice.message} /> : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Overview</p>
          <h1 className="display text-4xl uppercase sm:text-5xl">Halo, {name}.</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.roles.map((r) => (
              <Badge key={r} variant="outline">{roleLabel[r]}</Badge>
            ))}
            {p?.skill_level ? <Badge variant="outline">{skillLevelLabel[p.skill_level]}</Badge> : null}
            {p?.preferred_game ? <Badge variant="outline">{gameTypeLabel[p.preferred_game]}</Badge> : null}
          </div>
        </div>
        <Link href="/dashboard/settings" className={buttonVariants({ variant: "glass", size: "lg" })}>
          <UserRoundPen /> Edit profil
        </Link>
      </header>

      {!user.emailVerified ? (
        <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            Email Anda belum diverifikasi.{" "}
            <Link href="/verify-email" className="font-semibold text-warning underline-offset-4 hover:underline">
              Kirim ulang link verifikasi
            </Link>
          </p>
        </div>
      ) : null}

      <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarCheck2} label="Booking aktif" value={bookings.count ?? 0} />
        <StatCard icon={Swords} label="Open sparring saya" value={sparring.count ?? 0} />
        <StatCard icon={Trophy} label="Turnamen diikuti" value={tournaments.count ?? 0} />
        <StatCard icon={Bell} label="Notifikasi belum dibaca" value={unread.count ?? 0} />
      </section>

      {missing.length > 0 ? (
        <section className="rounded-md border border-primary/25 bg-primary/[0.06] p-6">
          <h2 className="font-heading text-lg font-semibold">Lengkapi profil pemain</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan {missing.join(", ")} agar lawan sparring dan leaderboard kota bisa menemukan Anda.
          </p>
          <Link href="/dashboard/settings" className={`${buttonVariants({ size: "lg" })} mt-4`}>
            Lengkapi sekarang
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-16 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-md" />
        ))}
      </div>
    </div>
  );
}
