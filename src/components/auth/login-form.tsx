"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Field, FormMessage, SubmitButton } from "@/components/forms/form-fields";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { loginAction } from "@/lib/auth/actions";
import type { FormState } from "@/lib/validation/auth";

const linkErrors: Record<string, string> = {
  link_invalid: "Link verifikasi tidak valid atau sudah kedaluwarsa. Silakan coba lagi.",
  not_configured: "Supabase belum dikonfigurasi.",
  oauth: "Login dengan Google/Apple dibatalkan atau belum diaktifkan. Coba lagi atau gunakan email.",
  rate_limited: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const linkError = linkErrors[params.get("error") ?? ""];
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <div className="grid gap-5">
      <FormMessage ok={state.ok} message={state.message ?? linkError} />
      <OAuthButtons next={next} mode="login" />
      <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
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
      <div className="grid gap-2">
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
        <Link href="/forgot-password" className="justify-self-end text-xs font-medium text-primary hover:underline">
          Lupa password?
        </Link>
      </div>
      <SubmitButton pendingText="Masuk…">Masuk</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Daftar gratis
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Belum menerima email verifikasi?{" "}
        <Link href="/verify-email" className="font-medium text-foreground/80 underline-offset-4 hover:underline">
          Kirim ulang
        </Link>
      </p>
    </form>
    </div>
  );
}
