import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { RegisterForm } from "@/components/auth/register-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun Payo Billiard gratis — untuk pemain dan pemilik venue.",
};

export default function RegisterPage() {
  return (
    <>
      <AuthHeading title="Gabung komunitas." description="Gratis. Satu akun untuk semua fitur Payo Billiard." />
      <Suspense fallback={<Skeleton className="h-[34rem] w-full rounded-md" />}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
