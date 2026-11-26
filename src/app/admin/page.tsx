import { Suspense } from "react";
import { Building2, CalendarCheck2, Flag, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Overview" };

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow mb-2">Admin</p>
        <h1 className="display text-4xl uppercase sm:text-5xl">Platform overview</h1>
      </header>
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-md" />
            ))}
          </div>
        }
      >
        <Stats />
      </Suspense>
    </div>
  );
}

async function Stats() {
  await requireRole(["admin"], "/admin");
  const supabase = (await createClient())!;
  const head = { count: "exact" as const, head: true };
  // RLS grants admins read access to these tables.
  const [users, pendingVenues, bookings, reports] = await Promise.all([
    supabase.from("profiles").select("id", head),
    supabase.from("venues").select("id", head).eq("status", "pending"),
    supabase.from("bookings").select("id", head),
    supabase.from("reports").select("id", head).eq("status", "open"),
  ]);
  return (
    <section aria-label="Statistik platform" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Total pengguna" value={users.count ?? 0} />
      <StatCard icon={Building2} label="Venue menunggu verifikasi" value={pendingVenues.count ?? 0} />
      <StatCard icon={CalendarCheck2} label="Total booking" value={bookings.count ?? 0} />
      <StatCard icon={Flag} label="Laporan terbuka" value={reports.count ?? 0} />
    </section>
  );
}
