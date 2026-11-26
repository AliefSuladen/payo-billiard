import { Logo } from "@/components/brand/logo";
import { HeroTable } from "@/components/home/hero-table";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="hidden flex-col justify-between bg-cloth p-10 text-white lg:flex">
        <Logo />
        <div className="mx-auto w-full max-w-lg">
          <HeroTable />
        </div>
        <div>
          <p className="display max-w-md text-5xl uppercase">
            Find your table.
            <br />
            Find your rival.
            <br />
            <span className="text-brass">Own your game.</span>
          </p>
          <p className="mt-4 max-w-md text-sm text-white/75">
            Booking meja, cari sparring, ikut turnamen — dalam satu akun.
          </p>
        </div>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
