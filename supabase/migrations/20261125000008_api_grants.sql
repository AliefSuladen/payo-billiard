-- =============================================================================
-- Payo Billiard — 0008: explicit Data API grants
-- Newer Supabase projects no longer grant table privileges to the `anon` and
-- `authenticated` roles automatically. Privileges only open the door; every
-- row is still filtered by the RLS policies from 0004.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- Signed-in users: full DML, narrowed by RLS + guard triggers.
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Visitors: read only (RLS decides which rows are public).
grant select on all tables in schema public to anon;

-- Tables only trusted backends may write.
revoke insert, update, delete on public.player_ratings from anon, authenticated;
revoke insert on public.notifications from anon, authenticated;

-- profiles: column-level privacy (phone is never publicly readable).
revoke all on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, bio, city, province, skill_level,
              preferred_game, is_banned, created_at, updated_at)
  on public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, bio, city, province, phone, skill_level, preferred_game)
  on public.profiles to authenticated;

-- Helpers used inside RLS policies run as the caller, so they need EXECUTE.
grant execute on function
  public.has_role(public.app_role),
  public.is_admin(),
  public.owns_venue(uuid),
  public.is_tournament_organizer(uuid),
  public.is_trusted_backend(),
  public.can_view_venue(uuid),
  public.try_uuid(text)
to anon, authenticated;

grant execute on function public.nearby_venues(double precision, double precision, double precision, integer)
  to anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.claim_venue_owner_role() to authenticated;
grant execute on function public.table_busy_slots(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.resolve_price_per_hour(uuid, timestamptz) to authenticated;

-- Tables created by future migrations get the same baseline automatically.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
