import type { ReactNode } from "react";

export function AuthHeading({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="display text-5xl uppercase">{title}</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
