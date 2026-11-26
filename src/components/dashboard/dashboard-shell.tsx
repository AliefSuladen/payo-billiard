import type { ReactNode } from "react";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { DashboardNav, type DashNavItem } from "@/components/dashboard/dashboard-nav";

export function DashboardShell({
  title,
  items,
  children,
}: {
  title: string;
  items: DashNavItem[];
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <div className="container-page grid flex-1 gap-6 py-6 lg:grid-cols-[230px_1fr] lg:gap-10 lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow mb-3 hidden lg:block">{title}</p>
          <Suspense fallback={null}>
            <DashboardNav items={items} />
          </Suspense>
        </aside>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </>
  );
}
