-- =============================================================================
-- Payo Billiard — 0004: Row Level Security
-- Principle: deny by default; every table has RLS enabled; writes are scoped to
-- the owner (auth.uid()); triggers in 0003 enforce field-level rules.
-- `(select auth.uid())` is used so Postgres evaluates it once per statement.
-- =============================================================================

alter table public.profiles                enable row level security;
alter table public.user_roles              enable row level security;
alter table public.venues                  enable row level security;
alter table public.venue_photos            enable row level security;
alter table public.venue_facilities        enable row level security;
alter table public.billiard_tables         enable row level security;
alter table public.table_pricing           enable row level security;
alter table public.operating_hours         enable row level security;
alter table public.bookings                enable row level security;
alter table public.sparring_posts          enable row level security;
alter table public.sparring_requests       enable row level security;
alter table public.matches                 enable row level security;
alter table public.match_results           enable row level security;
alter table public.player_ratings          enable row level security;
alter table public.tournaments             enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches      enable row level security;
alter table public.reviews                 enable row level security;
alter table public.notifications           enable row level security;
alter table public.reports                 enable row level security;

-- Helper: venue is publicly visible (verified) or caller is its owner / admin.
create or replace function public.can_view_venue(_venue_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.venues v
    where v.id = _venue_id
      and (v.status = 'verified' or v.owner_id = (select auth.uid()) or public.is_admin())
  );
$$;

-- ---------------------------------------------------------------- profiles
create policy "profiles: public read"   on public.profiles for select using (true);
create policy "profiles: update self"   on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update"  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Inserts happen only through the on_auth_user_created trigger.

-- -------------------------------------------------------------- user_roles
create policy "roles: read own or admin" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "roles: admin manage" on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ venues
create policy "venues: read verified/own/admin" on public.venues for select
  using (status = 'verified' or owner_id = (select auth.uid()) or public.is_admin());
create policy "venues: owners create" on public.venues for insert to authenticated
  with check (owner_id = (select auth.uid()) and (public.has_role('venue_owner') or public.is_admin()));
create policy "venues: owner update" on public.venues for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());
create policy "venues: admin delete" on public.venues for delete to authenticated
  using (public.is_admin());

-- -------------------------------------- venue children (owner-managed data)
do $$
declare t text;
begin
  foreach t in array array['venue_photos', 'venue_facilities', 'billiard_tables', 'table_pricing', 'operating_hours'] loop
    execute format($f$
      create policy "%1$s: read if venue visible" on public.%1$I for select
        using (public.can_view_venue(venue_id));
      create policy "%1$s: owner insert" on public.%1$I for insert to authenticated
        with check (public.owns_venue(venue_id) or public.is_admin());
      create policy "%1$s: owner update" on public.%1$I for update to authenticated
        using (public.owns_venue(venue_id) or public.is_admin())
        with check (public.owns_venue(venue_id) or public.is_admin());
      create policy "%1$s: owner delete" on public.%1$I for delete to authenticated
        using (public.owns_venue(venue_id) or public.is_admin());
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- bookings
create policy "bookings: read own/venue owner/admin" on public.bookings for select to authenticated
  using (user_id = (select auth.uid()) or public.owns_venue(venue_id) or public.is_admin());
create policy "bookings: create own" on public.bookings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "bookings: update own/venue owner/admin" on public.bookings for update to authenticated
  using (user_id = (select auth.uid()) or public.owns_venue(venue_id) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.owns_venue(venue_id) or public.is_admin());
-- No delete policy: bookings are cancelled, never deleted (audit trail).

-- ---------------------------------------------------------- sparring_posts
create policy "sparring: public read" on public.sparring_posts for select
  using (status in ('open', 'matched', 'completed') or user_id = (select auth.uid()) or public.is_admin());
create policy "sparring: create own" on public.sparring_posts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "sparring: update own" on public.sparring_posts for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());
create policy "sparring: delete own" on public.sparring_posts for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ------------------------------------------------------- sparring_requests
create policy "sparring_requests: read involved" on public.sparring_requests for select to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from public.sparring_posts p where p.id = post_id and p.user_id = (select auth.uid()))
    or public.is_admin()
  );
create policy "sparring_requests: create" on public.sparring_requests for insert to authenticated
  with check (requester_id = (select auth.uid()));
create policy "sparring_requests: update involved" on public.sparring_requests for update to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from public.sparring_posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );

-- ----------------------------------------------------------------- matches
create policy "matches: public read" on public.matches for select using (true);
create policy "matches: participant create" on public.matches for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select auth.uid()) in (team_a_player1, team_a_player2, team_b_player1, team_b_player2)
  );
create policy "matches: participant update" on public.matches for update to authenticated
  using ((select auth.uid()) in (team_a_player1, team_a_player2, team_b_player1, team_b_player2) or public.is_admin());

-- ----------------------------------------------------------- match_results
create policy "results: public read" on public.match_results for select using (true);
create policy "results: participant report" on public.match_results for insert to authenticated
  with check (
    reported_by = (select auth.uid())
    and confirmed_by is null
    and exists (
      select 1 from public.matches m where m.id = match_id
        and (select auth.uid()) in (m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2)
    )
  );
-- Confirmation (and rating updates) will go through a security-definer RPC in Phase 4.
create policy "results: admin update" on public.match_results for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- player_ratings
create policy "ratings: public read" on public.player_ratings for select using (true);
-- No write policies: only trusted server code updates ratings.

-- ------------------------------------------------------------- tournaments
create policy "tournaments: read published/own/admin" on public.tournaments for select
  using (status <> 'draft' or organizer_id = (select auth.uid()) or public.is_admin());
create policy "tournaments: organizer create" on public.tournaments for insert to authenticated
  with check (
    organizer_id = (select auth.uid())
    and (public.has_role('venue_owner') or public.is_admin())
    and (venue_id is null or public.owns_venue(venue_id) or public.is_admin())
  );
create policy "tournaments: organizer update" on public.tournaments for update to authenticated
  using (organizer_id = (select auth.uid()) or public.is_admin())
  with check (organizer_id = (select auth.uid()) or public.is_admin());
create policy "tournaments: organizer delete draft" on public.tournaments for delete to authenticated
  using ((organizer_id = (select auth.uid()) and status = 'draft') or public.is_admin());

-- -------------------------------------------------- tournament_participants
create policy "participants: public read" on public.tournament_participants for select
  using (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.status <> 'draft' or t.organizer_id = (select auth.uid()) or public.is_admin())));
create policy "participants: self register" on public.tournament_participants for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy "participants: self/organizer update" on public.tournament_participants for update to authenticated
  using (user_id = (select auth.uid()) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy "participants: organizer delete" on public.tournament_participants for delete to authenticated
  using (public.is_tournament_organizer(tournament_id) or public.is_admin());

-- ------------------------------------------------------- tournament_matches
create policy "t_matches: public read" on public.tournament_matches for select
  using (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.status <> 'draft' or t.organizer_id = (select auth.uid()) or public.is_admin())));
create policy "t_matches: organizer manage" on public.tournament_matches for all to authenticated
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());

-- ----------------------------------------------------------------- reviews
create policy "reviews: public read" on public.reviews for select
  using (not is_hidden or user_id = (select auth.uid()) or public.is_admin());
create policy "reviews: create own" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_venue(venue_id));
create policy "reviews: author or venue owner update" on public.reviews for update to authenticated
  using (user_id = (select auth.uid()) or public.owns_venue(venue_id) or public.is_admin());
create policy "reviews: author/admin delete" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ----------------------------------------------------------- notifications
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: mark read own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
-- Inserts only from security-definer triggers / service role.

-- ------------------------------------------------------------------ reports
create policy "reports: create own" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and resolved_by is null);
create policy "reports: read own or admin" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "reports: admin update" on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------- function exposure
-- Internal helpers must not be callable as RPC by anonymous clients.
revoke execute on function public.handle_new_user()                         from public, anon, authenticated;
revoke execute on function public.resolve_price_per_hour(uuid, timestamptz) from public, anon;
revoke execute on function public.table_busy_slots(uuid, timestamptz, timestamptz) from public, anon;
grant  execute on function public.table_busy_slots(uuid, timestamptz, timestamptz) to authenticated;
grant  execute on function public.resolve_price_per_hour(uuid, timestamptz) to authenticated;
grant  execute on function public.nearby_venues(double precision, double precision, double precision, integer) to anon, authenticated;

-- ------------------------------------------- column-level privacy: profiles
-- RLS is row-level; phone numbers must not be publicly readable, so the
-- public roles only get the public columns. Owners read their full row via
-- the get_my_profile() RPC below.
revoke select, insert, update, delete on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, bio, city, province, skill_level,
              preferred_game, is_banned, created_at, updated_at)
  on public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, bio, city, province, phone, skill_level, preferred_game)
  on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = (select auth.uid());
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
