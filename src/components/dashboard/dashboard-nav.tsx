"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  overview: LayoutDashboard,
  settings: Settings,
  venue: Building2,
  admin: ShieldCheck,
  sparring: Swords,
} satisfies Record<string, LucideIcon>;

export type DashNavItem = { title: string; href: string; icon: keyof typeof icons };

/** Horizontal scroller on phones, vertical list on desktop. */
export function DashboardNav({ items }: { items: DashNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi dashboard" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1.5 lg:flex-col">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground",
                  active && "bg-primary/12 text-foreground ring-1 ring-primary/30",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
