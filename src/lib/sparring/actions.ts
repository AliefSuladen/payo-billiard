"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sparringPostSchema } from "@/lib/validation/sparring";
import type { FormState } from "@/lib/validation/auth";

const FIELDS = [
  "placeName", "placeAddress", "placeRef", "lat", "lng", "city", "date", "time",
  "durationMinutes", "skillLevel", "gameType", "matchFormat", "raceTo", "notes",
];
const uuid = z.string().uuid();

/** DB guard / RPC errors (P0001) carry a user-facing Indonesian message. */
const dbMessage = (error: { code?: string; message: string }, fallback: string) =>
  error.code === "P0001" ? error.message : fallback;

const refresh = (postId: string) => {
  updateTag("sparring");
  updateTag("leaderboard");
  revalidatePath(`/sparring/${postId}`);
  revalidatePath("/dashboard/sparring");
};

function parsePost(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  return { values, parsed: sparringPostSchema.safeParse(values) };
}

const toRow = (d: ReturnType<typeof sparringPostSchema.parse>) => ({
  place_name: d.placeName,
  place_address: d.placeAddress,
  place_ref: d.placeRef,
  location_text: d.placeName,
  latitude: d.lat,
  longitude: d.lng,
  city: d.city,
  scheduled_at: d.scheduledAt,
  duration_minutes: d.durationMinutes,
  skill_level: d.skillLevel,
  game_type: d.gameType,
  match_format: d.matchFormat,
  race_to: d.raceTo,
  notes: d.notes,
});

/* ------------------------------------------------------------- create */
export async function createSparringAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/sparring/new");
  const { values, parsed } = parsePost(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, values };

  const limit = await rateLimit(`sparring:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "Terlalu banyak tantangan dibuat. Coba lagi nanti.", values };

  const supabase = (await createClient())!;
  const { data, error } = await supabase
    .from("sparring_posts")
    .insert({ user_id: user.id, ...toRow(parsed.data) })
    .select("id")
    .single();
  if (error) return { ok: false, message: dbMessage(error, "Gagal membuat tantangan. Coba lagi."), values };

  refresh(data.id);
  redirect(`/sparring/${data.id}?created=1`);
}

/* --------------------------------------------------------------- edit */
export async function updateSparringAction(
  postId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!uuid.safeParse(postId).success) return { ok: false, message: "Tantangan tidak ditemukan." };
  await requireUser(`/sparring/${postId}/edit`);
  const { values, parsed } = parsePost(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, values };

  const supabase = (await createClient())!;
  // RLS limits this to the author; the DB guard blocks edits once matched.
  const { data, error } = await supabase
    .from("sparring_posts")
    .update(toRow(parsed.data))
    .eq("id", postId)
    .select("id");
  if (error) return { ok: false, message: dbMessage(error, "Gagal menyimpan perubahan."), values };
  if (!data?.length) return { ok: false, message: "Anda tidak bisa mengubah tantangan ini.", values };

  refresh(postId);
  redirect(`/sparring/${postId}?updated=1`);
}

/* ------------------------------------------------------------- delete */
export async function deleteSparringAction(postId: string): Promise<FormState> {
  if (!uuid.safeParse(postId).success) return { ok: false, message: "Tantangan tidak ditemukan." };
  await requireUser(`/sparring/${postId}`);
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("sparring_posts").delete().eq("id", postId).select("id");
  if (error) return { ok: false, message: dbMessage(error, "Gagal menghapus tantangan.") };
  if (!data?.length) {
    return { ok: false, message: "Tantangan yang sudah mendapat lawan tidak bisa dihapus." };
  }
  refresh(postId);
  redirect("/dashboard/sparring?deleted=1");
}

/* -------------------------------------------------- send / cancel request */
export async function sendRequestAction(postId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!uuid.safeParse(postId).success) return { ok: false, message: "Tantangan tidak ditemukan." };
  const user = await requireUser(`/sparring/${postId}`);
  const message = String(formData.get("message") ?? "").trim().slice(0, 300) || null;

  const limit = await rateLimit(`request:${user.id}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "Terlalu banyak permintaan. Coba lagi nanti." };

  const supabase = (await createClient())!;
  const { error } = await supabase
    .from("sparring_requests")
    .insert({ post_id: postId, requester_id: user.id, message });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Anda sudah mengirim tantangan ke sini." };
    return { ok: false, message: dbMessage(error, "Gagal mengirim tantangan.") };
  }
  refresh(postId);
  return { ok: true, message: "Tantangan terkirim. Tunggu pembuatnya menerima." };
}

export async function cancelRequestAction(requestId: string, postId: string): Promise<FormState> {
  if (!uuid.safeParse(requestId).success) return { ok: false, message: "Permintaan tidak ditemukan." };
  await requireUser(`/sparring/${postId}`);
  const supabase = (await createClient())!;
  const { error } = await supabase
    .from("sparring_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) return { ok: false, message: dbMessage(error, "Gagal membatalkan.") };
  refresh(postId);
  return { ok: true, message: "Permintaan dibatalkan." };
}

/* -------------------------------------------------- accept / reject request */
export async function respondRequestAction(requestId: string, postId: string, accept: boolean): Promise<FormState> {
  if (!uuid.safeParse(requestId).success) return { ok: false, message: "Permintaan tidak ditemukan." };
  await requireUser(`/sparring/${postId}`);
  const supabase = (await createClient())!;
  const { error } = await supabase.rpc("respond_sparring_request", { p_request: requestId, p_accept: accept });
  if (error) return { ok: false, message: dbMessage(error, "Gagal merespons tantangan.") };
  refresh(postId);
  return { ok: true, message: accept ? "Lawan diterima! Pertandingan sudah dijadwalkan." : "Tantangan ditolak." };
}

/* ------------------------------------------------------ report a result */
const scoreSchema = z.object({
  myScore: z.coerce.number().int().min(0).max(99),
  opponentScore: z.coerce.number().int().min(0).max(99),
});

export async function reportResultAction(
  matchId: string,
  postId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!uuid.safeParse(matchId).success) return { ok: false, message: "Pertandingan tidak ditemukan." };
  await requireUser(`/sparring/${postId}`);
  const parsed = scoreSchema.safeParse({
    myScore: formData.get("myScore"),
    opponentScore: formData.get("opponentScore"),
  });
  if (!parsed.success) return { ok: false, message: "Isi kedua skor dengan angka 0–99." };
  if (parsed.data.myScore === parsed.data.opponentScore) {
    return { ok: false, message: "Skor tidak boleh seri." };
  }

  const supabase = (await createClient())!;
  const { error } = await supabase.rpc("report_match_result", {
    p_match: matchId,
    p_my_score: parsed.data.myScore,
    p_opponent_score: parsed.data.opponentScore,
  });
  if (error) return { ok: false, message: dbMessage(error, "Gagal melaporkan hasil.") };
  refresh(postId);
  return { ok: true, message: "Hasil dikirim. Menunggu lawan mengonfirmasi." };
}

/* ---------------------------------------------- accept / reject a result */
export async function respondResultAction(matchId: string, postId: string, accept: boolean): Promise<FormState> {
  if (!uuid.safeParse(matchId).success) return { ok: false, message: "Pertandingan tidak ditemukan." };
  await requireUser(`/sparring/${postId}`);
  const supabase = (await createClient())!;
  const { error } = await supabase.rpc("respond_match_result", { p_match: matchId, p_accept: accept });
  if (error) return { ok: false, message: dbMessage(error, "Gagal mengonfirmasi hasil.") };
  refresh(postId);
  return {
    ok: true,
    message: accept ? "Hasil dikonfirmasi. Rating sudah diperbarui." : "Hasil ditolak. Lawan bisa melaporkan ulang.",
  };
}

/* ------------------------------------------------ chat: share WhatsApp */
/** Normalise an Indonesian mobile number to 62xxxxxxxxxx, or null. */
const toWhatsapp = (raw: string) => {
  const d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const n = d.startsWith("62") ? d : d.startsWith("0") ? `62${d.slice(1)}` : d.startsWith("8") ? `62${d}` : d;
  return /^628[0-9]{7,12}$/.test(n) ? n : null;
};

export async function shareWhatsappAction(
  matchId: string,
  postId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!uuid.safeParse(matchId).success) return { ok: false, message: "Pertandingan tidak ditemukan." };
  const user = await requireUser(`/sparring/${postId}`);
  const raw = String(formData.get("whatsapp") ?? "");
  const whatsapp = toWhatsapp(raw);
  if (!whatsapp) return { ok: false, message: "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890", values: { whatsapp: raw } };

  const supabase = (await createClient())!;
  const { error } = await supabase
    .from("match_contacts")
    .upsert({ match_id: matchId, user_id: user.id, whatsapp }, { onConflict: "match_id,user_id" });
  if (error) return { ok: false, message: "Gagal membagikan nomor.", values: { whatsapp: raw } };
  revalidatePath(`/sparring/${postId}`);
  return { ok: true, message: "Nomor WhatsApp dibagikan ke lawan." };
}

export async function unshareWhatsappAction(matchId: string, postId: string): Promise<FormState> {
  if (!uuid.safeParse(matchId).success) return { ok: false, message: "Pertandingan tidak ditemukan." };
  const user = await requireUser(`/sparring/${postId}`);
  const supabase = (await createClient())!;
  const { error } = await supabase.from("match_contacts").delete().eq("match_id", matchId).eq("user_id", user.id);
  if (error) return { ok: false, message: "Gagal menyembunyikan nomor." };
  revalidatePath(`/sparring/${postId}`);
  return { ok: true, message: "Nomor WhatsApp tidak lagi dibagikan." };
}
