import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  LeaderboardEntry,
  SparringSummary,
  TournamentSummary,
} from "@/types/domain";

/**
 * Public, cookie-less reads. Each function is cached for a few minutes and
 * tagged so mutations can refresh it with `updateTag`/`revalidateTag`.
 * When Supabase is not configured, they return an empty list and the UI shows
 * an empty state — no fabricated data.
 */

export type ListResult<T> = { items: T[]; error: string | null };

export async function getOpenSparring(limit = 6): Promise<ListResult<SparringSummary>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("sparring");

  const supabase = createPublicClient();
  if (!supabase) return { items: [], error: null };
  const { data, error } = await supabase
    .from("sparring_posts")
    .select(
      "id, city, location_text, place_name, place_address, latitude, longitude, notes, scheduled_at, skill_level, game_type, match_format, author:profiles!sparring_posts_user_id_fkey(username, full_name, avatar_url), venue:venues(name, slug)",
    )
    .eq("status", "open")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  return {
    items: (data as unknown as SparringSummary[] | null) ?? [],
    error: error?.message ?? null,
  };
}

export async function getUpcomingTournaments(limit = 4): Promise<ListResult<TournamentSummary>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("tournaments");

  const supabase = createPublicClient();
  if (!supabase) return { items: [], error: null };
  const { data, error } = await supabase
    .from("tournament_cards")
    .select(
      "id, slug, name, city, game_type, format, status, starts_at, entry_fee, max_participants, participant_count, banner_url",
    )
    .in("status", ["registration_open", "registration_closed", "ongoing"])
    .order("starts_at", { ascending: true })
    .limit(limit);
  return { items: (data as TournamentSummary[] | null) ?? [], error: error?.message ?? null };
}

export async function getTopPlayers(limit = 10): Promise<ListResult<LeaderboardEntry>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("leaderboard");

  const supabase = createPublicClient();
  if (!supabase) return { items: [], error: null };
  const { data, error } = await supabase
    .from("leaderboard")
    .select(
      "user_id, username, full_name, avatar_url, city, province, game_type, rating, matches_played, wins, win_rate, rank",
    )
    .eq("game_type", "eight_ball")
    .order("rank", { ascending: true })
    .limit(limit);
  return { items: (data as LeaderboardEntry[] | null) ?? [], error: error?.message ?? null };
}

export type SparringShare = {
  id: string;
  status: "open" | "matched" | "cancelled" | "completed" | "expired";
  city: string;
  place_name: string | null;
  scheduled_at: string;
  skill_level: SparringSummary["skill_level"];
  game_type: SparringSummary["game_type"];
  match_format: SparringSummary["match_format"];
  race_to: number | null;
  author: { username: string | null; full_name: string | null } | null;
};

/** Minimal public info for link previews (WhatsApp, etc.). */
export async function getSparringShare(id: string): Promise<SparringShare | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("sparring");

  const supabase = createPublicClient();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("sparring_posts")
    .select(
      "id, status, city, place_name, scheduled_at, skill_level, game_type, match_format, race_to, author:profiles!sparring_posts_user_id_fkey(username, full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as SparringShare | null) ?? null;
}
