import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataError, EmptyState } from "@/components/shared/empty-state";
import { SparringCard } from "@/components/shared/sparring-card";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { FormMessage } from "@/components/forms/form-fields";
import { buttonVariants } from "@/components/ui/button";
import { getOpenSparring } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Open Sparring",
  description: "Cari lawan sparring billiard sesuai level, jenis permainan, kota, dan jadwal.",
  alternates: { canonical: "/sparring" },
};

export default function SparringPage({ searchParams }: PageProps<"/sparring">) {
  return (
    <>
      <PageHeader
        eyebrow="Open sparring"
        title="Find your rival"
        description="Pemain yang sedang mencari lawan — 8 Ball, 9 Ball, 10 Ball, dan Straight Pool."
      >
        <Link href="/sparring/new" className={buttonVariants({ size: "xl" })}>
          <Plus /> Buka tantangan
        </Link>
      </PageHeader>
      <div className="container-page space-y-6 py-12">
        <Suspense fallback={null}>
          <CreatedNotice searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <SparringList />
        </Suspense>
      </div>
    </>
  );
}

async function CreatedNotice({ searchParams }: { searchParams: PageProps<"/sparring">["searchParams"] }) {
  const sp = await searchParams;
  return sp.created ? <FormMessage ok message="Tantangan berhasil dibuka. Pemain lain sekarang bisa melihatnya." /> : null;
}

async function SparringList() {
  const { items, error } = await getOpenSparring(30);
  if (error) return <DataError message={error} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Swords}
        title="Belum ada open sparring"
        description="Jadilah yang pertama membuka tantangan: pilih tempat di peta, tentukan jadwal dan level lawan."
        action={
          <Link href="/sparring/new" className={buttonVariants({ size: "lg" })}>
            Buka tantangan
          </Link>
        }
      />
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <SparringCard key={p.id} post={p} />
      ))}
    </div>
  );
}
