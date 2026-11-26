/**
 * Domain types mirroring the Supabase schema (supabase/migrations).
 * Regenerate full DB types with `npm run db:types` once a project is linked.
 */
export type AppRole = "player" | "venue_owner" | "admin";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "professional";
export type GameType = "eight_ball" | "nine_ball" | "ten_ball" | "straight_pool";
export type MatchFormat = "singles" | "doubles";
export type TournamentFormat = "single_elimination" | "double_elimination" | "round_robin";
export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled";

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  skill_level: SkillLevel | null;
  preferred_game: GameType | null;
  created_at: string;
};

export type VenueSummary = {
  id: string;
  slug: string;
  name: string;
  city: string;
  province: string | null;
  address: string;
  cover_image_url: string | null;
  rating_avg: number;
  rating_count: number;
  price_from: number | null;
  distance_km?: number;
};

export type SparringSummary = {
  id: string;
  city: string;
  location_text: string | null;
  place_name: string | null;
  place_address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  scheduled_at: string;
  skill_level: SkillLevel;
  game_type: GameType;
  match_format: MatchFormat;
  author: Pick<Profile, "username" | "full_name" | "avatar_url"> | null;
  venue: Pick<VenueSummary, "name" | "slug"> | null;
};

export type TournamentSummary = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  game_type: GameType;
  format: TournamentFormat;
  status: TournamentStatus;
  starts_at: string;
  entry_fee: number;
  max_participants: number;
  participant_count: number;
  banner_url: string | null;
};

export type LeaderboardEntry = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  province: string | null;
  game_type: GameType;
  rating: number;
  matches_played: number;
  wins: number;
  win_rate: number;
  rank: number;
};
