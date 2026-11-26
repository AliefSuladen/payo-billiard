import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { mainNav, siteConfig } from "@/config/site";

const accountLinks = [
  { title: "Daftar", href: "/register" },
  { title: "Masuk", href: "/login" },
  { title: "Dashboard", href: "/dashboard" },
  { title: "Buka Tantangan", href: "/sparring/new" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">{siteConfig.description}</p>
          <p className="font-heading text-sm font-semibold text-brass">{siteConfig.tagline}</p>
        </div>
        <FooterColumn title="Jelajahi" links={mainNav} />
        <FooterColumn title="Akun" links={accountLinks} />
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {siteConfig.name}. Dibuat untuk komunitas billiard Indonesia.</p>
          <p>Indonesia · WIB</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { title: string; href: string }[] }) {
  return (
    <div>
      <h2 className="eyebrow mb-4">{title}</h2>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
