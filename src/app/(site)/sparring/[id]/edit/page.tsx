import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SparringForm } from "@/components/sparring/sparring-form";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { getSparringDetail } from "@/lib/sparring/queries";
import { updateSparringAction } from "@/lib/sparring/actions";

export const metadata: Metadata = { title: "Edit tantangan", robots: { index: false } };

export default function EditSparringPage({ params }: PageProps<"/sparring/[id]/edit">) {
  return (
    <>
      <PageHeader eyebrow="Open sparring" title="Edit tantangan" description="Tantangan hanya bisa diubah selama belum ada lawan yang diterima." />
      <div className="container-page max-w-4xl py-10">
        <Suspense fallback={<Skeleton className="h-[40rem] rounded-md" />}>
          <Edit params={params} />
        </Suspense>
      </div>
    </>
  );
}

const jakarta = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
    time: d.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }),
  };
};

async function Edit({ params }: { params: PageProps<"/sparring/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser(`/sparring/${id}/edit`);
  const detail = await getSparringDetail(id);
  if (!detail) notFound();
  const p = detail.post;

  if (p.user_id !== user.id || p.status !== "open") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          {p.user_id !== user.id
            ? "Anda hanya bisa mengedit tantangan milik sendiri."
            : "Tantangan ini sudah mendapat lawan, jadi tidak bisa diubah lagi."}
        </p>
        <Link href={`/sparring/${id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          Kembali ke tantangan
        </Link>
      </div>
    );
  }

  const { date, time } = jakarta(p.scheduled_at);
  const initialValues: Record<string, string> = {
    placeName: p.place_name ?? "",
    placeAddress: p.place_address ?? "",
    placeRef: p.place_ref ?? "",
    lat: p.latitude != null ? String(p.latitude) : "",
    lng: p.longitude != null ? String(p.longitude) : "",
    city: p.city,
    date,
    time,
    durationMinutes: String(p.duration_minutes),
    skillLevel: p.skill_level,
    gameType: p.game_type,
    matchFormat: p.match_format,
    raceTo: p.race_to != null ? String(p.race_to) : "",
    notes: p.notes ?? "",
  };

  return (
    <SparringForm
      initialPlace={null}
      initialValues={initialValues}
      action={updateSparringAction.bind(null, id)}
      submitLabel="Simpan perubahan"
    />
  );
}
