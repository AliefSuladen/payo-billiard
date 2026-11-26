import { Suspense } from "react";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataError, EmptyState } from "@/components/shared/empty-state";
import { TournamentCard } from "@/components/shared/tournament-card";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { getUpcomingTournaments } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Turnamen",
  description: "Daftar turnamen billiard di Indonesia: jadwal, lokasi, biaya pendaftaran, dan kuota peserta.",
  alternates: { canonical: "/tournaments" },
};

export default function TournamentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Turnamen"
        title="Own your game."
        description="Turnamen yang sedang membuka pendaftaran atau sedang berlangsung."
      />
      <div className="container-page py-12">
        <Suspense fallback={<CardGridSkeleton count={4} cols="lg:grid-cols-4" />}>
          <TournamentList />
        </Suspense>
      </div>
    </>
  );
}

async function TournamentList() {
  const { items, error } = await getUpcomingTournaments(24);
  if (error) return <DataError message={error} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Belum ada turnamen terjadwal"
        description="Turnamen yang dipublikasikan penyelenggara akan tampil di sini."
      />
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((t) => (
        <TournamentCard key={t.id} tournament={t} />
      ))}
    </div>
  );
}
