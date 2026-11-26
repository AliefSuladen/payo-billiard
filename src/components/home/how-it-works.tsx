import { SectionHeading } from "@/components/shared/section-heading";

const steps = [
  {
    title: "Pilih tempat di peta",
    body: "Cari tempat billiard di sekitarmu dari peta, atau tandai sendiri lokasinya.",
  },
  {
    title: "Buka tantangan",
    body: "Tentukan tanggal, jam, jenis permainan, format, dan level lawan yang kamu cari.",
  },
  {
    title: "Ketemu lawan",
    body: "Pemain lain mengirim tantangan, kamu yang memilih siapa yang diterima.",
  },
  {
    title: "Bertanding & naik ranking",
    body: "Ikuti turnamen, laporkan hasil pertandingan, dan pantau posisimu di leaderboard.",
  },
];

export function HowItWorks() {
  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading eyebrow="05 / Cara kerja" title="Dari cari meja sampai angkat trofi" />
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="border-b border-border py-6 sm:pr-6 lg:border-b-0 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0"
          >
            <span className="display text-5xl text-primary">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 font-sans text-base font-semibold tracking-normal">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
