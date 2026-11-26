import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <LogoMark className="mx-auto mb-6 size-14" />
        <p className="eyebrow mb-3">404 · Scratch!</p>
        <h1 className="display text-4xl font-extrabold sm:text-5xl">Halaman tidak ditemukan.</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
          Bola ini meleset dari kantong. Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <Link href="/" className={`${buttonVariants({ size: "xl" })} mt-8`}>
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
