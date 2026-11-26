import { z } from "zod";
import { isInIndonesia, PLACE_REF_RE } from "@/lib/places/types";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const sparringPostSchema = z
  .object({
    placeName: z.string().trim().min(2, "Pilih lokasi di peta").max(120),
    placeAddress: optional(300),
    placeRef: z
      .string()
      .trim()
      .refine((v) => v === "" || PLACE_REF_RE.test(v), "Referensi tempat tidak valid")
      .transform((v) => (v === "" ? null : v)),
    lat: z.coerce.number({ error: "Pilih lokasi di peta" }),
    lng: z.coerce.number({ error: "Pilih lokasi di peta" }),
    city: z.string().trim().min(2, "Kota wajib diisi").max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Jam wajib diisi"),
    durationMinutes: z.coerce.number().int().min(30).max(600),
    skillLevel: z.enum(["beginner", "intermediate", "advanced", "professional"], { error: "Pilih level" }),
    gameType: z.enum(["eight_ball", "nine_ball", "ten_ball", "straight_pool"], { error: "Pilih jenis permainan" }),
    matchFormat: z.enum(["singles", "doubles"]),
    raceTo: z
      .string()
      .trim()
      .regex(/^$|^\d{1,2}$/, "Race to harus angka")
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (v >= 1 && v <= 50), "Race to 1–50"),
    notes: optional(500),
  })
  .superRefine((d, ctx) => {
    if (!isInIndonesia(d.lat, d.lng)) {
      ctx.addIssue({ code: "custom", path: ["placeName"], message: "Lokasi harus di Indonesia" });
    }
    const at = new Date(`${d.date}T${d.time}:00+07:00`);
    const now = Date.now();
    if (Number.isNaN(at.getTime()) || at.getTime() < now + 15 * 60_000) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Jadwal minimal 15 menit dari sekarang" });
    } else if (at.getTime() > now + 60 * 86_400_000) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Maksimal 60 hari ke depan" });
    }
  })
  .transform((d) => ({ ...d, scheduledAt: new Date(`${d.date}T${d.time}:00+07:00`).toISOString() }));
