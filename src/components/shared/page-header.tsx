import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <div className="container-page py-10 sm:py-14">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 max-w-4xl text-5xl uppercase sm:text-7xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
