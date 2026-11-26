import Link from "next/link";
import { cn } from "@/lib/utils";

/** Brand mark: cue ball meeting an object ball at the moment of contact. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <circle cx="19.5" cy="13" r="9.5" fill="var(--primary)" />
      <circle cx="19.5" cy="13" r="4.2" fill="var(--background)" opacity="0.92" />
      <path
        d="M18.1 15.6v-5.2h2.1a1.7 1.7 0 0 1 0 3.4h-2.1"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="23" r="6.5" fill="var(--foreground)" />
      <circle cx="7.2" cy="21.1" r="1.6" fill="white" opacity="0.7" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Payo Billiard — beranda"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-12" />
      <span className="flex flex-col leading-none">
        <span className="display text-[1.15rem] font-extrabold">PAYO</span>
        <span className="text-[9px] font-semibold tracking-[0.42em] text-muted-foreground">
          BILLIARD
        </span>
      </span>
    </Link>
  );
}
