import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import {
  OpenSparringSection,
  TopPlayersSection,
  UpcomingTournamentsSection,
  VenueMapSection,
} from "@/components/home/sections";
import { HowItWorks } from "@/components/home/how-it-works";
import { JoinCommunity } from "@/components/home/join-cta";
import { SectionSkeleton } from "@/components/shared/skeletons";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — Sparring, Tempat & Turnamen Billiard` },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* Players looking for an opponent come first: the most time-sensitive list. */}
      <Suspense fallback={<SectionSkeleton />}>
        <OpenSparringSection />
      </Suspense>
      <VenueMapSection />
      <Suspense fallback={<SectionSkeleton />}>
        <UpcomingTournamentsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <TopPlayersSection />
      </Suspense>
      <HowItWorks />
      <JoinCommunity />
    </>
  );
}
