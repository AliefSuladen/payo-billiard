import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/email-forms";

export const metadata: Metadata = { title: "Atur ulang password", robots: { index: false } };

/** Reached from the recovery email via /auth/callback (session already set). */
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Buat password baru." description="Gunakan password yang kuat dan belum pernah dipakai." />
      <ResetPasswordForm />
    </>
  );
}
