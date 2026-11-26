"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { mainNav } from "@/config/site";
import { cn } from "@/lib/utils";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Buka menu" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[86%] border-white/10 bg-surface p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-white/5 px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-heading">
            <LogoMark className="size-6" /> Payo Billiard
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Navigasi seluler" className="flex flex-col gap-1 px-3 py-2">
          {mainNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center justify-between rounded-md px-3 py-3.5 transition-colors hover:bg-white/[0.04]",
                  active && "bg-white/[0.06]",
                )}
              >
                <span>
                  <span className="block font-heading text-lg font-semibold">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-2 border-t border-white/5 p-4">
          {signedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ size: "xl" }), "w-full")}
            >
              Buka Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: "xl" }), "w-full")}
              >
                Daftar Gratis
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: "xl", variant: "glass" }), "w-full")}
              >
                Masuk
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
