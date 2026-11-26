import { Suspense } from "react";
import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataError, EmptyState } from "@/components/shared/empty-state";
import { LeaderboardTable } from "@/components/shared/leaderboard-table";
import { Skeleton } from "@/components/ui/skeleton";
import { getTopPlayers } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Ranking pemain billiard Indonesia berdasarkan rating pertandingan.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Leaderboard · Nasional · 8 Ball"
        title="Siapa yang terbaik?"
        description="Rating dihitung dari hasil pertandingan yang sudah dikonfirmasi kedua pihak."
      />
      <div className="container-page py-12">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-md" />}>
          <Board />
        </Suspense>
      </div>
    </>
  );
}

async function Board() {
  const { items, error } = await getTopPlayers(50);
  if (error) return <DataError message={error} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Medal}
        title="Leaderboard masih kosong"
        description="Ranking akan terisi setelah pertandingan pertama dilaporkan dan dikonfirmasi."
      />
    );
  }
  return <LeaderboardTable entries={items} />;
}
