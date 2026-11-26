"use client";

import Link from "next/link";
import { ExternalLink, Swords } from "lucide-react";
import { PlaceExplorer } from "@/components/maps/place-explorer";
import { buttonVariants } from "@/components/ui/button";
import { googleMapsUrl, type Place } from "@/lib/places/types";

const challengeHref = (p: Place) => {
  const q = new URLSearchParams({ name: p.name, lat: String(p.lat), lng: String(p.lng) });
  if (p.ref) q.set("ref", p.ref);
  return `/sparring/new?${q}`;
};

/** Browse billiard places on the map; open a challenge at the selected one. */
export function VenueMap({ className }: { className?: string }) {
  return (
    <PlaceExplorer
      mode="browse"
      className={className}
      renderActions={(p) => (
        <>
          <Link href={challengeHref(p)} className={buttonVariants({ size: "sm" })}>
            <Swords /> Buka tantangan di sini
          </Link>
          <a
            href={googleMapsUrl(p)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Google Maps <ExternalLink />
          </a>
        </>
      )}
    />
  );
}
