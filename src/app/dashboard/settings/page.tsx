import { Suspense } from "react";
import Link from "next/link";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";

export const metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow mb-2">Pengaturan</p>
        <h1 className="display text-4xl uppercase sm:text-5xl">Profil pemain</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nama, username, kota, dan level tampil di profil publik serta leaderboard.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[28rem] rounded-md" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const user = await requireUser("/dashboard/settings");
  if (!user.profile) {
    return <p className="text-sm text-destructive">Profil tidak ditemukan. Hubungi admin.</p>;
  }
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-surface p-5 sm:p-7">
        <ProfileForm profile={user.profile} />
      </section>
      <section className="rounded-md border border-border bg-surface p-5 sm:p-7">
        <h2 className="font-heading text-lg font-semibold">Keamanan akun</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Email: <span className="text-foreground">{user.email}</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Untuk mengganti password, gunakan{" "}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            reset password
          </Link>
          . Link akan dikirim ke email Anda.
        </p>
      </section>
    </div>
  );
}
