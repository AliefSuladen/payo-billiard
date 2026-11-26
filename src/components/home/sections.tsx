import Link from "next/link";
import { Medal, Plus, Swords, Trophy } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { DataError, EmptyState } from "@/components/shared/empty-state";
import { SparringCard } from "@/components/shared/sparring-card";
import { TournamentCard } from "@/components/shared/tournament-card";
import { LeaderboardTable } from "@/components/shared/leaderboard-table";
import { VenueMap } from "@/components/maps/venue-map";
import { buttonVariants } from "@/components/ui/button";
import {
  getOpenSparring,
  getTopPlayers,
  getUpcomingTournaments,
} from "@/lib/data/public";

export function VenueMapSection() {
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="map-title">
      <SectionHeading
        eyebrow="02 / Tempat billiard"
        title="Cari tempat di peta"
        description="Data tempat dari OpenStreetMap. Pilih satu tempat lalu buka tantangan di sana."
        href="/venues"
        linkLabel="Peta penuh"
        id="map-title"
      />
      <VenueMap />
    </section>
  );
}

export async function OpenSparringSection() {
  const { items, error } = await getOpenSparring(6);
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          eyebrow="01 / Open sparring"
          title="Sedang mencari lawan"
          description="Pilih level, jenis permainan, dan jadwal yang cocok — atau buka tantanganmu sendiri."
          href="/sparring"
        />
        <Link href="/sparring/new" className={`${buttonVariants({ size: "lg" })} mb-6`}>
          <Plus /> Buka tantangan
        </Link>
        {error ? <DataError message={error} /> : null}
        {items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <SparringCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Swords}
            title="Belum ada open sparring"
            description="Jadilah yang pertama membuka tantangan di kotamu: pilih tempat di peta, tentukan jadwal dan level lawan."
          />
        )}
      </div>
    </section>
  );
}

export async function UpcomingTournamentsSection() {
  const { items, error } = await getUpcomingTournaments(4);
  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="03 / Turnamen"
        title="Kompetisi yang akan datang"
        description="Single elimination, double elimination, hingga round robin."
        href="/tournaments"
      />
      {error ? <DataError message={error} /> : null}
      {items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Belum ada turnamen terjadwal"
          description="Turnamen yang dibuka penyelenggara akan muncul di sini lengkap dengan kuota dan biaya pendaftaran."
        />
      )}
    </section>
  );
}

export async function TopPlayersSection() {
  const { items, error } = await getTopPlayers(10);
  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="04 / Leaderboard · 8 Ball"
        title="Rating tertinggi"
        description="Rating dihitung dari hasil pertandingan yang terverifikasi."
        href="/leaderboard"
      />
      {error ? <DataError message={error} /> : null}
      {items.length > 0 ? (
        <LeaderboardTable entries={items} />
      ) : (
        <EmptyState
          icon={Medal}
          title="Leaderboard masih kosong"
          description="Ranking akan terisi setelah pertandingan pertama dilaporkan dan dikonfirmasi."
        />
      )}
    </section>
  );
}
