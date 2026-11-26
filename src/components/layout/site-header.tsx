import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { mainNav } from "@/config/site";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl supports-backdrop-filter:bg-background/55">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <Suspense fallback={<NavLinksStatic />}>
            <NavLinks />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          {/* Session-dependent UI streams in; the rest of the header is static. */}
          <Suspense fallback={<HeaderActionsSkeleton />}>
            <HeaderActions />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function HeaderActions() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "hidden px-3.5 sm:inline-flex")}
        >
          Masuk
        </Link>
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "hidden px-4 sm:inline-flex")}>
          Daftar
        </Link>
        <MobileNav signedIn={false} />
      </>
    );
  }

  const name = user.profile?.full_name || user.profile?.username || user.email || "Pemain";
  return (
    <>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "hidden px-3.5 sm:inline-flex")}
      >
        Dashboard
      </Link>
      <UserMenu
        name={name}
        username={user.profile?.username ?? null}
        avatarUrl={user.profile?.avatar_url ?? null}
        roles={user.roles}
      />
      <MobileNav signedIn />
    </>
  );
}

function HeaderActionsSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="hidden h-9 w-20 rounded-lg sm:block" />
      <Skeleton className="size-9 rounded-full" />
    </div>
  );
}

function NavLinksStatic() {
  return (
    <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
      {mainNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
