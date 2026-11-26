import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroTable } from "@/components/home/hero-table";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const pillars = [
  { no: "01", title: "Sparring", body: "Temukan lawan sesuai level", href: "/sparring" },
  { no: "02", title: "Venue", body: "Cari tempat billiard di peta", href: "/venues" },
  { no: "03", title: "Turnamen", body: "Daftar & pantau bracket", href: "/tournaments" },
  { no: "04", title: "Leaderboard", body: "Rating dari hasil pertandingan", href: "/leaderboard" },
];

export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="container-page">
        <div className="flex items-center justify-between border-b border-border py-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          <span>Platform billiard Indonesia</span>
          <span className="hidden sm:inline">8-ball · 9-ball · 10-ball · straight pool</span>
        </div>

        <div className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:py-20">
          <div>
            <h1 className="rise display text-[3.4rem] uppercase sm:text-7xl lg:text-[6.2rem]">
              Your billiards community <span className="text-primary">starts here.</span>
            </h1>
            <p
              className="rise mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "0.08s" }}
            >
              Find a billiard spot on the map, open a challenge, and compete with players across
              Indonesia.
            </p>
            <div className="rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.14s" }}>
              <Link href="/sparring" className={cn(buttonVariants({ size: "xl" }), "group")}>
                Find Sparring
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/venues" className={buttonVariants({ size: "xl", variant: "outline" })}>
                Explore Venues
              </Link>
            </div>
          </div>

          <figure className="rise" style={{ animationDelay: "0.1s" }}>
            <div className="rounded-md bg-surface p-3 ring-1 ring-border sm:p-4">
              <HeroTable />
            </div>
            <figcaption className="mt-3 flex justify-between font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
              <span>{siteConfig.tagline}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <nav aria-label="Fitur utama" className="border-t border-border">
        <ul className="container-page grid grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <li
              key={p.href}
              className={cn(
                "border-border",
                i % 2 === 0 && "border-r",
                i < 2 && "border-b lg:border-b-0",
                i === 1 && "lg:border-r",
                i === 2 && "lg:border-r",
              )}
            >
              <Link href={p.href} className="group flex h-full flex-col gap-1 px-1 py-5 sm:px-5 lg:py-6">
                <span className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                  {p.no}
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </span>
                <span className="display text-2xl uppercase group-hover:text-primary">{p.title}</span>
                <span className="text-sm text-muted-foreground">{p.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
