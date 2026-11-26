"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton } from "@/components/forms/form-fields";
import {
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
} from "@/lib/auth/actions";
import type { FormState } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Mengirim…">Kirim link reset</SubmitButton>
      <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
        Kembali ke halaman masuk
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <Field
        label="Password baru"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint="Min. 8 karakter, huruf & angka"
      />
      <Field
        label="Ulangi password baru"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton pendingText="Menyimpan…">Simpan password</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, action] = useActionState<FormState, FormData>(resendVerificationAction, {});
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Mengirim…">Kirim ulang email verifikasi</SubmitButton>
    </form>
  );
}
