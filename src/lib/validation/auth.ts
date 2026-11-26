import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Format email tidak valid").max(254);
const password = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf")
  .regex(/[0-9]/, "Password harus mengandung angka");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username minimal 3 karakter")
  .max(24, "Username maksimal 24 karakter")
  .regex(/^[a-z0-9_]+$/, "Hanya huruf kecil, angka, dan underscore");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi").max(72),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
    username: usernameSchema,
    email,
    password,
    confirmPassword: z.string(),
    terms: z.literal("on", { error: "Anda harus menyetujui ketentuan layanan" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama",
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  username: usernameSchema,
  bio: optionalText(280),
  city: optionalText(80),
  province: optionalText(80),
  phone: z
    .string()
    .trim()
    .regex(/^$|^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP Indonesia tidak valid")
    .transform((v) => (v === "" ? null : v)),
  skillLevel: z
    .enum(["", "beginner", "intermediate", "advanced", "professional"])
    .transform((v) => (v === "" ? null : v)),
  preferredGame: z
    .enum(["", "eight_ball", "nine_ball", "ten_ball", "straight_pool"])
    .transform((v) => (v === "" ? null : v)),
});

/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeNext(next: unknown, fallback = "/dashboard") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export type FieldErrors = Record<string, string[] | undefined>;
export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};
