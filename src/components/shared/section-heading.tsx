import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ruled section header: mono index on the left, condensed title, optional link. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Lihat semua",
  className,
  id,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 border-t border-foreground/80 pt-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">{eyebrow}</p>
        {href ? (
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground/80 hover:text-primary"
          >
            {linkLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
      <h2 id={id} className="display mt-3 max-w-3xl text-4xl uppercase sm:text-5xl">
        {title}
      </h2>
      {description ? <p className="mt-3 max-w-xl text-[0.95rem] text-muted-foreground">{description}</p> : null}
    </div>
  );
}
