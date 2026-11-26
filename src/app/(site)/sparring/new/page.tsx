import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SparringForm } from "@/components/sparring/sparring-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";
import { isInIndonesia, PLACE_REF_RE, type Place } from "@/lib/places/types";

export const metadata: Metadata = {
  title: "Buka tantangan",
  robots: { index: false },
};

export default function NewSparringPage({ searchParams }: PageProps<"/sparring/new">) {
  return (
    <>
      <PageHeader
        eyebrow="Open sparring"
        title="Buka tantangan"
        description="Tentukan tempat, jadwal, dan level lawan. Pemain lain bisa langsung mengirim tantangan."
      />
      <div className="container-page max-w-4xl py-10">
        <Suspense fallback={<Skeleton className="h-[40rem] rounded-md" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

/** Optional prefill from the venue map: ?name=&lat=&lng=&ref= */
async function Form({ searchParams }: { searchParams: PageProps<"/sparring/new">["searchParams"] }) {
  await requireUser("/sparring/new");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const lat = Number(one("lat"));
  const lng = Number(one("lng"));
  const name = one("name").slice(0, 120);
  const ref = PLACE_REF_RE.test(one("ref")) ? one("ref") : null;
  const initialPlace: Place | null =
    name.length >= 2 && Number.isFinite(lat) && Number.isFinite(lng) && isInIndonesia(lat, lng)
      ? { ref, name, address: null, city: null, lat, lng }
      : null;

  return <SparringForm initialPlace={initialPlace} />;
}
