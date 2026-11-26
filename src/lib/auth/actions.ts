"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth/dal";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  safeNext,
  type FormState,
} from "@/lib/validation/auth";

const NOT_CONFIGURED: FormState = {
  ok: false,
  message: "Supabase belum dikonfigurasi. Isi variabel environment di .env.local terlebih dahulu.",
};

const tooMany = (sec: number): FormState => ({
  ok: false,
  message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(sec / 60)} menit.`,
});

const pick = (fd: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));

/* ------------------------------------------------------------------ Login */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pick(formData, ["email"]);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  const limit = await rateLimit("login", { limit: 10, windowMs: 10 * 60_000 });
  if (!limit.ok) return { ...tooMany(limit.retryAfterSec), values };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        message: "Email belum diverifikasi. Cek inbox Anda atau kirim ulang link verifikasi.",
        values,
      };
    }
    return { ok: false, message: "Email atau password salah.", values };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

/* --------------------------------------------------------------- Register */
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pick(formData, ["fullName", "username", "email"]);
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  const limit = await rateLimit("register", { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ...tooMany(limit.retryAfterSec), values };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { fullName, username, email, password } = parsed.data;

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) {
    return { ok: false, fieldErrors: { username: ["Username sudah dipakai"] }, values };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
      data: { full_name: fullName, username },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { ok: false, fieldErrors: { password: [error.message] }, values };
    }
    if (error.message.toLowerCase().includes("database error")) {
      return { ok: false, fieldErrors: { username: ["Username sudah dipakai"] }, values };
    }
    return { ok: false, message: "Pendaftaran gagal. Silakan coba lagi.", values };
  }

  // Email confirmation disabled in Supabase → a session exists already.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard?welcome=1");
  }

  // Do not reveal whether the email was already registered.
  redirect("/verify-email");
}

/* -------------------------------------------------- Resend verification */
export async function resendVerificationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await rateLimit("resend", { limit: 3, windowMs: 15 * 60_000 });
  if (!limit.ok) return tooMany(limit.retryAfterSec);

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard` },
  });
  return { ok: true, message: "Jika email terdaftar dan belum diverifikasi, link baru sudah dikirim." };
}

/* -------------------------------------------------------- Forgot password */
export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = pick(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  const limit = await rateLimit("forgot", { limit: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return { ...tooMany(limit.retryAfterSec), values };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  // Same response whether or not the account exists (no user enumeration).
  return {
    ok: true,
    message: "Jika email terdaftar, kami telah mengirim link untuk mengatur ulang password.",
  };
}

/* --------------------------------------------------------- Reset password */
export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sesi reset sudah kedaluwarsa. Minta link baru." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, fieldErrors: { password: ["Gunakan password yang berbeda dari sebelumnya"] } };
    }
    return { ok: false, message: "Gagal memperbarui password. Coba lagi." };
  }

  redirect("/dashboard?password=updated");
}

/* ---------------------------------------------------------------- Sign out */
export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/* --------------------------------------------------------- Update profile */
export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/dashboard/settings");
  const keys = ["fullName", "username", "bio", "city", "province", "phone", "skillLevel", "preferredGame"];
  const values = pick(formData, keys);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.fullName,
      username: d.username,
      bio: d.bio,
      city: d.city,
      province: d.province,
      phone: d.phone,
      skill_level: d.skillLevel,
      preferred_game: d.preferredGame,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, fieldErrors: { username: ["Username sudah dipakai"] }, values };
    }
    return { ok: false, message: "Gagal menyimpan profil.", values };
  }

  updateTag("leaderboard");
  updateTag("sparring");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil berhasil disimpan.", values };
}

/* ------------------------------------------------ OAuth (Google / Apple) */
const OAUTH_PROVIDERS = ["google", "apple"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/**
 * Starts the PKCE OAuth flow server-side (the code verifier is stored in a
 * cookie) and sends the browser to the provider. The provider returns to
 * /auth/callback, which exchanges the code for a session.
 * "Apple" covers Apple ID / iCloud accounts (Sign in with Apple).
 */
export async function oauthSignInAction(formData: FormData) {
  const provider = String(formData.get("provider")) as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) redirect("/login?error=oauth");

  const limit = await rateLimit("oauth", { limit: 20, windowMs: 10 * 60_000 });
  if (!limit.ok) redirect("/login?error=rate_limited");

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=not_configured");

  const next = safeNext(formData.get("next"));
  const callback = new URL("/auth/callback", getSiteUrl());
  callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback.toString(),
      ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
