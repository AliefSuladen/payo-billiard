import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Selamat datang kembali." description="Masuk untuk booking meja, sparring, dan turnamen." />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-md" />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
