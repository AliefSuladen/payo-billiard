-- =============================================================================
-- Payo Billiard — 0001: extensions & enum types
-- =============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists btree_gist;    -- exclusion constraint (anti double-booking)
create extension if not exists citext;        -- case-insensitive usernames / slugs

create type public.app_role as enum ('player', 'venue_owner', 'admin');

create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'professional');

create type public.game_type as enum ('eight_ball', 'nine_ball', 'ten_ball', 'straight_pool');

create type public.match_format as enum ('singles', 'doubles');

create type public.venue_status as enum ('pending', 'verified', 'rejected', 'suspended');

create type public.table_category as enum ('pool', 'snooker', 'carom');

create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

create type public.sparring_status as enum ('open', 'matched', 'cancelled', 'completed', 'expired');

create type public.sparring_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

create type public.match_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'disputed');

create type public.tournament_format as enum ('single_elimination', 'double_elimination', 'round_robin');

create type public.tournament_status as enum (
  'draft', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'
);

create type public.participant_status as enum ('registered', 'confirmed', 'withdrawn', 'disqualified');

create type public.bracket_side as enum ('winners', 'losers', 'grand_final', 'group');

create type public.report_target as enum ('user', 'venue', 'review', 'sparring_post', 'tournament');

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
