import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { VenueMap } from "@/components/maps/venue-map";

export const metadata: Metadata = {
  title: "Explore Venues",
  description: "Temukan tempat billiard di peta seluruh Indonesia dan buka tantangan sparring di sana.",
  alternates: { canonical: "/venues" },
};

export default function VenuesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Explore venues"
        title="Tempat billiard di peta"
        description="Cari tempat billiard di sekitarmu atau di kota lain, lalu buka tantangan sparring langsung di tempat itu."
      />
      <div className="container-page py-10">
        <VenueMap />
      </div>
    </>
  );
}
