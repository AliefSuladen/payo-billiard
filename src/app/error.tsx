"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-3 text-destructive">Terjadi kesalahan</p>
        <h1 className="display text-4xl uppercase sm:text-5xl">Ada yang tidak beres.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Kami gagal memuat halaman ini. Coba lagi, atau kembali ke beranda.
          {error.digest ? <span className="mt-2 block font-mono text-xs">Kode: {error.digest}</span> : null}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="xl" onClick={reset}>
            <RotateCcw /> Coba lagi
          </Button>
          <Link href="/" className={buttonVariants({ size: "xl", variant: "glass" })}>
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
