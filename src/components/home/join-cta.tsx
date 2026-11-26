import Link from "next/link";
import { ArrowRight } from "lucide-react";

const paths = [
  {
    label: "Pemain",
    body: "Cari sparring, ikut turnamen, bangun rating. Gratis.",
    href: "/register",
    cta: "Daftar sebagai pemain",
  },
  {
    label: "Buka tantangan",
    body: "Pilih tempat billiard di peta, tentukan jadwal, tunggu lawan datang.",
    href: "/sparring/new",
    cta: "Buka tantangan",
  },
];

/** Solid cloth-blue block — the one loud colour moment on the page. */
export function JoinCommunity() {
  return (
    <section className="bg-cloth text-white">
      <div className="container-page grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-white/70 uppercase">06 / Join the community</p>
          <h2 className="display mt-3 text-5xl uppercase sm:text-7xl">
            Satu meja.
            <br />
            Satu komunitas.
          </h2>
        </div>
        <ul className="divide-y divide-white/20 border-y border-white/20">
          {paths.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="group flex items-center justify-between gap-6 py-5">
                <span>
                  <span className="display block text-2xl uppercase">{p.label}</span>
                  <span className="mt-1 block text-sm text-white/75">{p.body}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap underline-offset-4 group-hover:underline">
                  <span className="hidden sm:inline">{p.cta}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
