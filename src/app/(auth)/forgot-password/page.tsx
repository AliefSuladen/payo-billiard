import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/email-forms";

export const metadata: Metadata = { title: "Lupa password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Lupa password?"
        description="Masukkan email akun Anda. Kami akan mengirim link untuk membuat password baru."
      />
      <ForgotPasswordForm />
    </>
  );
}
