"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton } from "@/components/forms/form-fields";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { registerAction } from "@/lib/auth/actions";
import type { FormState } from "@/lib/validation/auth";

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});

  return (
    <div className="grid gap-5">
      <FormMessage ok={state.ok} message={state.message} />
      <OAuthButtons mode="register" />

      <form action={action} className="grid gap-5" noValidate>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nama lengkap"
          name="fullName"
          autoComplete="name"
          required
          defaultValue={state.values?.fullName}
          error={state.fieldErrors?.fullName}
        />
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.username}
          error={state.fieldErrors?.username}
          hint="3–24 karakter: a-z, 0-9, _"
        />
      </div>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.password}
          hint="Min. 8 karakter, huruf & angka"
        />
        <Field
          label="Ulangi password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.confirmPassword}
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="terms"
          required
          className="mt-0.5 size-4 shrink-0 rounded border-white/20 accent-[var(--primary)]"
        />
        <span>
          Saya menyetujui ketentuan layanan dan kebijakan privasi Payo Billiard.
          {state.fieldErrors?.terms ? (
            <span className="mt-1 block text-xs text-destructive">{state.fieldErrors.terms[0]}</span>
          ) : null}
        </span>
      </label>

      <SubmitButton pendingText="Membuat akun…">Buat akun</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </form>
    </div>
  );
}
