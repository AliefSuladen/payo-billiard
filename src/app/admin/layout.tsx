import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Payo Billiard" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <DashboardShell title="Admin" items={[{ title: "Platform overview", href: "/admin", icon: "admin" }]}>
      {children}
    </DashboardShell>
  );
}
