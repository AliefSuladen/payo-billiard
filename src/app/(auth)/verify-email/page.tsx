import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/auth/email-forms";

export const metadata: Metadata = { title: "Verifikasi email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <div>
      <div className="mb-6 grid size-14 place-items-center rounded-md bg-primary/15 text-primary">
        <MailCheck className="size-7" />
      </div>
      <h1 className="display text-4xl uppercase sm:text-5xl">Cek inbox Anda.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Jika pendaftaran berhasil, kami telah mengirim link verifikasi ke email Anda. Klik link
        tersebut untuk mengaktifkan akun. Periksa juga folder spam / promosi.
      </p>
      <div className="mt-8 rounded-md border border-border bg-surface p-5">
        <p className="mb-4 text-sm font-medium">Tidak menerima email?</p>
        <ResendVerificationForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah verifikasi?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
