import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { GameType, MatchFormat, Profile, SkillLevel } from "@/types/domain";

type Person = Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;

export type SparringDetail = {
  id: string;
  user_id: string;
  status: "open" | "matched" | "cancelled" | "completed" | "expired";
  city: string;
  place_name: string | null;
  place_address: string | null;
  place_ref: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduled_at: string;
  duration_minutes: number;
  skill_level: SkillLevel;
  game_type: GameType;
  match_format: MatchFormat;
  race_to: number | null;
  notes: string | null;
  author: Person | null;
};

export type SparringRequestRow = {
  id: string;
  requester_id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  requester: Person | null;
};

export type MatchRow = {
  id: string;
  /** Match time has passed → results may be reported. */
  started: boolean;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "disputed";
  scheduled_at: string | null;
  is_rated: boolean;
  team_a_player1: string;
  team_b_player1: string;
  player_a: Person | null;
  player_b: Person | null;
  result: {
    team_a_score: number;
    team_b_score: number;
    winner_team: "a" | "b";
    reported_by: string;
    confirmed_at: string | null;
  } | null;
};

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };
export type MatchContact = { user_id: string; whatsapp: string };

const PERSON = "id, username, full_name, avatar_url";

/** Everything the challenge page needs. RLS decides which requests are visible. */
export async function getSparringDetail(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: post } = await supabase
    .from("sparring_posts")
    .select(
      `id, user_id, status, city, place_name, place_address, place_ref, latitude, longitude, scheduled_at,
       duration_minutes, skill_level, game_type, match_format, race_to, notes,
       author:profiles!sparring_posts_user_id_fkey(${PERSON})`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!post) return null;

  const [{ data: requests }, { data: match }] = await Promise.all([
    supabase
      .from("sparring_requests")
      .select(`id, requester_id, message, status, created_at, requester:profiles!sparring_requests_requester_id_fkey(${PERSON})`)
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("matches")
      .select(
        `id, status, scheduled_at, is_rated, team_a_player1, team_b_player1,
         player_a:profiles!matches_team_a_player1_fkey(${PERSON}),
         player_b:profiles!matches_team_b_player1_fkey(${PERSON}),
         result:match_results(team_a_score, team_b_score, winner_team, reported_by, confirmed_at)`,
      )
      .eq("sparring_post_id", id)
      .maybeSingle(),
  ]);

  const m = match as unknown as (Omit<MatchRow, "result"> & { result: MatchRow["result"] | MatchRow["result"][] }) | null;
  const now = Date.now();
  const normalized: MatchRow | null = m
    ? {
        ...m,
        started: !m.scheduled_at || new Date(m.scheduled_at).getTime() <= now,
        result: Array.isArray(m.result) ? (m.result[0] ?? null) : m.result,
      }
    : null;

  // Chat + shared numbers: RLS returns rows only to the match's players.
  let messages: ChatMessage[] = [];
  let contacts: MatchContact[] = [];
  if (normalized) {
    const [{ data: msgs }, { data: cts }] = await Promise.all([
      supabase
        .from("match_messages")
        .select("id, sender_id, body, created_at")
        .eq("match_id", normalized.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("match_contacts").select("user_id, whatsapp").eq("match_id", normalized.id),
    ]);
    messages = ((msgs as ChatMessage[] | null) ?? []).reverse();
    contacts = (cts as MatchContact[] | null) ?? [];
  }

  return {
    post: post as unknown as SparringDetail,
    requests: (requests as unknown as SparringRequestRow[] | null) ?? [],
    match: normalized,
    messages,
    contacts,
  };
}

/** The signed-in user's challenges, requests and matches (dashboard). */
export async function getMySparring(userId: string) {
  const supabase = (await createClient())!;
  const [posts, requests, matches] = await Promise.all([
    supabase
      .from("sparring_posts")
      .select("id, status, place_name, city, scheduled_at, game_type, skill_level, sparring_requests(status)")
      .eq("user_id", userId)
      .order("scheduled_at", { ascending: false })
      .limit(50),
    supabase
      .from("sparring_requests")
      .select("id, status, post:sparring_posts(id, place_name, city, scheduled_at, game_type)")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("matches")
      .select(
        `id, status, scheduled_at, sparring_post_id, team_a_player1, team_b_player1,
         player_a:profiles!matches_team_a_player1_fkey(${PERSON}),
         player_b:profiles!matches_team_b_player1_fkey(${PERSON}),
         result:match_results(team_a_score, team_b_score, winner_team, reported_by, confirmed_at)`,
      )
      .or(`team_a_player1.eq.${userId},team_b_player1.eq.${userId}`)
      .order("scheduled_at", { ascending: false })
      .limit(50),
  ]);
  return {
    posts: (posts.data ?? []) as unknown as {
      id: string;
      status: SparringDetail["status"];
      place_name: string | null;
      city: string;
      scheduled_at: string;
      game_type: GameType;
      skill_level: SkillLevel;
      sparring_requests: { status: string }[];
    }[],
    requests: (requests.data ?? []) as unknown as {
      id: string;
      status: SparringRequestRow["status"];
      post: { id: string; place_name: string | null; city: string; scheduled_at: string; game_type: GameType } | null;
    }[],
    matches: ((matches.data ?? []) as unknown as (Omit<MatchRow, "is_rated" | "result" | "started"> & {
      sparring_post_id: string | null;
      result: MatchRow["result"] | MatchRow["result"][];
    })[]).map((m) => ({
      ...m,
      started: !m.scheduled_at || new Date(m.scheduled_at).getTime() <= Date.now(),
      result: Array.isArray(m.result) ? (m.result[0] ?? null) : m.result,
    })),
  };
}
