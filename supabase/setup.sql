-- =============================================================================
-- Payo Billiard — full database setup (generated from supabase/migrations).
-- Paste this whole file into Supabase → SQL Editor → Run, ONCE, on a NEW project.
-- =============================================================================

-- >>> 20261125000001_extensions_and_types.sql
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

-- >>> 20261125000002_core_tables.sql
-- =============================================================================
-- Payo Billiard — 0002: core tables, relations, constraints, indexes
-- Money is stored as integer Rupiah (no decimals).
-- =============================================================================

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text not null unique
                  check (username ~ '^[a-z0-9_]{3,24}$'),
  full_name       text check (char_length(full_name) <= 80),
  avatar_url      text,
  bio             text check (char_length(bio) <= 280),
  city            text check (char_length(city) <= 80),
  province        text check (char_length(province) <= 80),
  phone           text check (phone ~ '^(\+62|62|0)8[0-9]{7,12}$'),
  skill_level     public.skill_level,
  preferred_game  public.game_type,
  is_banned       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_city_idx on public.profiles (city);

-- -------------------------------------------------------------- user_roles
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.app_role not null,
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- ------------------------------------------------------------------ venues
create table public.venues (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete restrict,
  name             text not null check (char_length(name) between 2 and 120),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description      text check (char_length(description) <= 4000),
  address          text not null check (char_length(address) <= 300),
  city             text not null,
  province         text,
  postal_code      text check (postal_code ~ '^[0-9]{5}$'),
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  phone            text,
  whatsapp         text,
  email            text,
  instagram        text,
  cover_image_url  text,
  status           public.venue_status not null default 'pending',
  verified_at      timestamptz,
  verified_by      uuid references public.profiles (id) on delete set null,
  rejection_reason text,
  rating_avg       numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  rating_count     integer not null default 0 check (rating_count >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index venues_owner_idx  on public.venues (owner_id);
create index venues_status_idx on public.venues (status);
create index venues_city_idx   on public.venues (city) where status = 'verified';
create index venues_geo_idx    on public.venues (latitude, longitude) where status = 'verified';

-- ------------------------------------------------------------ venue_photos
create table public.venue_photos (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.venues (id) on delete cascade,
  storage_path  text not null,
  url           text not null,
  caption       text check (char_length(caption) <= 140),
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index venue_photos_venue_idx on public.venue_photos (venue_id, sort_order);

-- -------------------------------------------------------- venue_facilities
create table public.venue_facilities (
  id        uuid primary key default gen_random_uuid(),
  venue_id  uuid not null references public.venues (id) on delete cascade,
  facility  text not null check (facility in (
              'ac', 'smoking_area', 'non_smoking', 'parking', 'wifi', 'cafe', 'food',
              'toilet', 'musholla', 'vip_room', 'live_streaming', 'cue_rental', 'coaching'
            )),
  unique (venue_id, facility)
);

-- -------------------------------------------------------- billiard_tables
create table public.billiard_tables (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 40),
  category    public.table_category not null default 'pool',
  size_ft     smallint check (size_ft between 6 and 12),
  brand       text,
  is_vip      boolean not null default false,
  is_active   boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (venue_id, label),
  unique (id, venue_id) -- lets bookings reference (table_id, venue_id) consistently
);
create index billiard_tables_venue_idx on public.billiard_tables (venue_id) where is_active;

-- ----------------------------------------------------------- table_pricing
-- Most specific rule wins: table+day > table > day > venue default.
create table public.table_pricing (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references public.venues (id) on delete cascade,
  table_id        uuid,
  day_of_week     smallint check (day_of_week between 0 and 6), -- 0 = Minggu
  start_time      time not null default '00:00',
  end_time        time not null default '23:59:59',
  price_per_hour  integer not null check (price_per_hour between 1000 and 10000000),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  check (end_time > start_time),
  foreign key (table_id, venue_id) references public.billiard_tables (id, venue_id) on delete cascade
);
create index table_pricing_lookup_idx on public.table_pricing (venue_id, table_id, day_of_week) where is_active;

-- --------------------------------------------------------- operating_hours
create table public.operating_hours (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  open_time    time,
  close_time   time,   -- may be < open_time for venues open past midnight
  is_closed    boolean not null default false,
  unique (venue_id, day_of_week),
  check (is_closed or (open_time is not null and close_time is not null))
);

-- ---------------------------------------------------------------- bookings
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references public.venues (id) on delete restrict,
  table_id         uuid not null,
  user_id          uuid not null references public.profiles (id) on delete restrict,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  duration_minutes integer generated always as ((extract(epoch from (ends_at - starts_at)) / 60)::integer) stored,
  price_per_hour   integer not null default 0, -- set by trigger, never trusted from client
  total_price      integer not null default 0, -- set by trigger, never trusted from client
  status           public.booking_status not null default 'pending',
  notes            text check (char_length(notes) <= 500),
  confirmed_at     timestamptz,
  cancelled_at     timestamptz,
  cancelled_by     uuid references public.profiles (id) on delete set null,
  payment_status   text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_ref      text, -- reserved for the payment gateway integration (next phase)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (table_id, venue_id) references public.billiard_tables (id, venue_id) on delete restrict,
  check (ends_at > starts_at),
  check (ends_at - starts_at between interval '30 minutes' and interval '12 hours'),
  -- Anti double-booking: no two active bookings may overlap on the same table.
  constraint bookings_no_overlap exclude using gist (
    table_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index bookings_user_idx  on public.bookings (user_id, starts_at desc);
create index bookings_venue_idx on public.bookings (venue_id, starts_at);

-- ---------------------------------------------------------- sparring_posts
create table public.sparring_posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  venue_id         uuid references public.venues (id) on delete set null,
  city             text not null,
  location_text    text check (char_length(location_text) <= 200),
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  scheduled_at     timestamptz not null,
  duration_minutes integer not null default 120 check (duration_minutes between 30 and 600),
  skill_level      public.skill_level not null,
  game_type        public.game_type not null,
  match_format     public.match_format not null default 'singles',
  race_to          smallint check (race_to between 1 and 50),
  notes            text check (char_length(notes) <= 500),
  status           public.sparring_status not null default 'open',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index sparring_open_idx on public.sparring_posts (status, scheduled_at) where status = 'open';
create index sparring_city_idx on public.sparring_posts (city, scheduled_at);
create index sparring_user_idx on public.sparring_posts (user_id);

-- ------------------------------------------------------- sparring_requests
create table public.sparring_requests (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.sparring_posts (id) on delete cascade,
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  message       text check (char_length(message) <= 300),
  status        public.sparring_request_status not null default 'pending',
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (post_id, requester_id)
);
create index sparring_requests_requester_idx on public.sparring_requests (requester_id);

-- ----------------------------------------------------------------- matches
create table public.matches (
  id                uuid primary key default gen_random_uuid(),
  game_type         public.game_type not null,
  match_format      public.match_format not null default 'singles',
  venue_id          uuid references public.venues (id) on delete set null,
  sparring_post_id  uuid references public.sparring_posts (id) on delete set null,
  team_a_player1    uuid not null references public.profiles (id) on delete restrict,
  team_a_player2    uuid references public.profiles (id) on delete restrict,
  team_b_player1    uuid not null references public.profiles (id) on delete restrict,
  team_b_player2    uuid references public.profiles (id) on delete restrict,
  race_to           smallint check (race_to between 1 and 50),
  scheduled_at      timestamptz,
  status            public.match_status not null default 'scheduled',
  is_rated          boolean not null default true,
  created_by        uuid not null references public.profiles (id) on delete restrict,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (team_a_player1 <> team_b_player1),
  check (
    (match_format = 'singles' and team_a_player2 is null and team_b_player2 is null) or
    (match_format = 'doubles' and team_a_player2 is not null and team_b_player2 is not null)
  )
);
create index matches_a1_idx on public.matches (team_a_player1);
create index matches_b1_idx on public.matches (team_b_player1);

-- ----------------------------------------------------------- match_results
create table public.match_results (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null unique references public.matches (id) on delete cascade,
  team_a_score  smallint not null check (team_a_score >= 0),
  team_b_score  smallint not null check (team_b_score >= 0),
  winner_team   char(1) not null check (winner_team in ('a', 'b')),
  reported_by   uuid not null references public.profiles (id) on delete restrict,
  confirmed_by  uuid references public.profiles (id) on delete restrict,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  check ((winner_team = 'a' and team_a_score > team_b_score) or (winner_team = 'b' and team_b_score > team_a_score))
);

-- ---------------------------------------------------------- player_ratings
-- Written only by trusted server code (security definer functions / service role).
create table public.player_ratings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  game_type       public.game_type not null,
  rating          integer not null default 1200 check (rating between 100 and 4000),
  matches_played  integer not null default 0 check (matches_played >= 0),
  wins            integer not null default 0 check (wins >= 0),
  losses          integer not null default 0 check (losses >= 0),
  updated_at      timestamptz not null default now(),
  unique (user_id, game_type),
  check (wins + losses <= matches_played)
);
create index player_ratings_rank_idx on public.player_ratings (game_type, rating desc);

-- ------------------------------------------------------------- tournaments
create table public.tournaments (
  id                      uuid primary key default gen_random_uuid(),
  organizer_id            uuid not null references public.profiles (id) on delete restrict,
  venue_id                uuid references public.venues (id) on delete set null,
  name                    text not null check (char_length(name) between 3 and 140),
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description             text check (char_length(description) <= 8000),
  rules                   text check (char_length(rules) <= 8000),
  game_type               public.game_type not null,
  format                  public.tournament_format not null,
  status                  public.tournament_status not null default 'draft',
  city                    text,
  starts_at               timestamptz not null,
  ends_at                 timestamptz,
  registration_opens_at   timestamptz,
  registration_closes_at  timestamptz,
  entry_fee               integer not null default 0 check (entry_fee >= 0),
  prize_pool              integer check (prize_pool >= 0),
  max_participants        integer not null check (max_participants between 2 and 1024),
  race_to                 smallint check (race_to between 1 and 50),
  banner_url              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (registration_closes_at is null or registration_closes_at <= starts_at)
);
create index tournaments_status_idx on public.tournaments (status, starts_at);
create index tournaments_organizer_idx on public.tournaments (organizer_id);

-- -------------------------------------------------- tournament_participants
create table public.tournament_participants (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  seed           smallint check (seed > 0),
  status         public.participant_status not null default 'registered',
  registered_at  timestamptz not null default now(),
  unique (tournament_id, user_id),
  unique (tournament_id, id)
);
create index tournament_participants_user_idx on public.tournament_participants (user_id);

-- ------------------------------------------------------- tournament_matches
-- Bracket graph: each match points to the match its winner (and, for double
-- elimination, its loser) advances to.
create table public.tournament_matches (
  id                      uuid primary key default gen_random_uuid(),
  tournament_id           uuid not null references public.tournaments (id) on delete cascade,
  bracket                 public.bracket_side not null default 'winners',
  round                   smallint not null check (round > 0),
  match_number            smallint not null check (match_number > 0),
  player1_participant_id  uuid,
  player2_participant_id  uuid,
  winner_participant_id   uuid,
  player1_score           smallint check (player1_score >= 0),
  player2_score           smallint check (player2_score >= 0),
  next_match_id           uuid references public.tournament_matches (id) on delete set null,
  next_match_slot         smallint check (next_match_slot in (1, 2)),
  loser_next_match_id     uuid references public.tournament_matches (id) on delete set null,
  loser_next_match_slot   smallint check (loser_next_match_slot in (1, 2)),
  table_id                uuid references public.billiard_tables (id) on delete set null,
  match_id                uuid references public.matches (id) on delete set null,
  scheduled_at            timestamptz,
  status                  public.match_status not null default 'scheduled',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tournament_id, bracket, round, match_number),
  foreign key (tournament_id, player1_participant_id) references public.tournament_participants (tournament_id, id) on delete set null (player1_participant_id),
  foreign key (tournament_id, player2_participant_id) references public.tournament_participants (tournament_id, id) on delete set null (player2_participant_id),
  foreign key (tournament_id, winner_participant_id)  references public.tournament_participants (tournament_id, id) on delete set null (winner_participant_id),
  check (winner_participant_id is null or winner_participant_id in (player1_participant_id, player2_participant_id))
);
create index tournament_matches_tournament_idx on public.tournament_matches (tournament_id, bracket, round);

-- ----------------------------------------------------------------- reviews
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  booking_id   uuid references public.bookings (id) on delete set null,
  rating       smallint not null check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 2000),
  owner_reply  text check (char_length(owner_reply) <= 2000),
  replied_at   timestamptz,
  is_hidden    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (venue_id, user_id)
);
create index reviews_venue_idx on public.reviews (venue_id, created_at desc);

-- ----------------------------------------------------------- notifications
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (char_length(type) <= 60),
  title       text not null check (char_length(title) <= 140),
  body        text check (char_length(body) <= 1000),
  link        text check (link ~ '^/'), -- internal paths only
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ------------------------------------------------------------------ reports
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  target_type  public.report_target not null,
  target_id    uuid not null,
  reason       text not null check (char_length(reason) between 3 and 120),
  details      text check (char_length(details) <= 2000),
  status       public.report_status not null default 'open',
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  resolution   text,
  created_at   timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

-- >>> 20261125000003_functions_and_triggers.sql
-- =============================================================================
-- Payo Billiard — 0003: helper functions, triggers, views, RPCs
-- =============================================================================

-- ------------------------------------------------------------ updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'venues', 'billiard_tables', 'bookings', 'sparring_posts',
    'matches', 'tournaments', 'tournament_matches', 'reviews'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------- role helpers
-- SECURITY DEFINER so RLS policies can call them without recursive RLS checks.
create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin');
$$;

create or replace function public.owns_venue(_venue_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.venues
    where id = _venue_id and owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_tournament_organizer(_tournament_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tournaments
    where id = _tournament_id and organizer_id = (select auth.uid())
  );
$$;

-- True for trusted backends: the service_role key, the SQL editor / migrations
-- (no JWT at all), or internal maintenance triggers that set payo.internal.
-- Anonymous ('anon') and end-user ('authenticated') requests are NOT trusted.
create or replace function public.is_trusted_backend()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt()) ->> 'role', 'service_role') = 'service_role'
      or coalesce(current_setting('payo.internal', true), '') = 'on';
$$;

-- ------------------------------------------------- new user → profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  _username  text  := lower(coalesce(_meta ->> 'username', ''));
  _role      text  := coalesce(_meta ->> 'role', 'player');
begin
  if _username !~ '^[a-z0-9_]{3,24}$'
     or exists (select 1 from public.profiles where username = _username) then
    _username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  insert into public.profiles (id, username, full_name)
  values (new.id, _username, nullif(left(_meta ->> 'full_name', 80), ''));

  -- Everyone is a player. Self-service sign-up may additionally request
  -- venue_owner. 'admin' can NEVER be self-assigned.
  insert into public.user_roles (user_id, role) values (new.id, 'player');
  if _role = 'venue_owner' then
    insert into public.user_roles (user_id, role) values (new.id, 'venue_owner');
  end if;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------- profile guard
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_trusted_backend() and not public.is_admin() then
    new.is_banned := old.is_banned;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- --------------------------------------------------- venue guards
create or replace function public.guard_venue_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_trusted_backend() or public.is_admin() then
    if new.status = 'verified' and (tg_op = 'INSERT' or old.status <> 'verified') then
      new.verified_at := now();
      new.verified_by := (select auth.uid());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id     := (select auth.uid());
    new.status       := 'pending';
    new.verified_at  := null;
    new.verified_by  := null;
    new.rating_avg   := 0;
    new.rating_count := 0;
  else
    -- Owners cannot self-verify, transfer ownership or touch ratings.
    new.owner_id         := old.owner_id;
    new.status           := case when old.status = 'rejected' and new.status = 'pending'
                                 then 'pending'::public.venue_status -- resubmit for review
                                 else old.status end;
    new.verified_at      := old.verified_at;
    new.verified_by      := old.verified_by;
    new.rejection_reason := old.rejection_reason;
    new.rating_avg       := old.rating_avg;
    new.rating_count     := old.rating_count;
  end if;
  return new;
end $$;

create trigger venues_guard before insert or update on public.venues
  for each row execute function public.guard_venue_write();

-- ---------------------------------------------------- pricing engine
-- Picks the most specific active price rule for a table at a moment in time.
create or replace function public.resolve_price_per_hour(_table_id uuid, _at timestamptz)
returns integer language sql stable security definer set search_path = '' as $$
  with t as (
    select bt.id, bt.venue_id,
           extract(dow from (_at at time zone 'Asia/Jakarta'))::smallint as dow,
           (_at at time zone 'Asia/Jakarta')::time as tod
    from public.billiard_tables bt where bt.id = _table_id
  )
  select p.price_per_hour
  from public.table_pricing p, t
  where p.venue_id = t.venue_id
    and p.is_active
    and (p.table_id is null or p.table_id = t.id)
    and (p.day_of_week is null or p.day_of_week = t.dow)
    and t.tod >= p.start_time and t.tod < p.end_time
  order by (p.table_id is not null) desc, (p.day_of_week is not null) desc, p.price_per_hour desc
  limit 1;
$$;

-- --------------------------------------------------- booking guards
create or replace function public.guard_booking_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _uid      uuid := (select auth.uid());
  _trusted  boolean := public.is_trusted_backend() or public.is_admin();
  _is_owner boolean := public.owns_venue(coalesce(new.venue_id, old.venue_id));
  _rate     integer;
begin
  if tg_op = 'INSERT' then
    if not _trusted then
      new.user_id      := _uid;
      new.status       := 'pending';
      new.confirmed_at := null;
      new.cancelled_at := null;
      new.payment_status := 'unpaid';
      new.payment_ref  := null;
      if new.starts_at < now() then
        raise exception 'Booking harus untuk waktu yang akan datang' using errcode = 'P0001';
      end if;
    end if;

    if not exists (
      select 1 from public.venues v
      join public.billiard_tables bt on bt.venue_id = v.id
      where v.id = new.venue_id and bt.id = new.table_id and v.status = 'verified' and bt.is_active
    ) then
      raise exception 'Meja tidak tersedia untuk booking' using errcode = 'P0001';
    end if;
  else
    -- Immutable identity of a booking.
    new.user_id  := old.user_id;
    new.venue_id := old.venue_id;

    if not _trusted then
      if _is_owner then
        if new.status not in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show') then
          raise exception 'Status tidak valid';
        end if;
      elsif old.user_id = _uid then
        -- Customers may only cancel (and edit notes). They cannot change time/table.
        if new.status <> old.status and new.status <> 'cancelled' then
          raise exception 'Anda hanya dapat membatalkan booking' using errcode = 'P0001';
        end if;
        new.table_id  := old.table_id;
        new.starts_at := old.starts_at;
        new.ends_at   := old.ends_at;
      end if;
      new.payment_status := old.payment_status;
      new.payment_ref    := old.payment_ref;
    end if;

    if new.status = 'confirmed' and old.status <> 'confirmed' then new.confirmed_at := now(); end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      new.cancelled_at := now();
      new.cancelled_by := _uid;
    end if;
  end if;

  -- Price is ALWAYS computed server-side (anti price manipulation).
  if tg_op = 'INSERT' or new.table_id <> old.table_id or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
    _rate := public.resolve_price_per_hour(new.table_id, new.starts_at);
    if _rate is null then
      raise exception 'Harga meja belum diatur untuk jam tersebut' using errcode = 'P0001';
    end if;
    new.price_per_hour := _rate;
    new.total_price    := ceil(_rate * extract(epoch from (new.ends_at - new.starts_at)) / 3600.0)::integer;
  end if;

  return new;
end $$;

create trigger bookings_guard before insert or update on public.bookings
  for each row execute function public.guard_booking_write();

-- ------------------------------------------------ review aggregates
create or replace function public.refresh_venue_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare _venue uuid := coalesce(new.venue_id, old.venue_id);
begin
  -- Mark this as an internal write so guard_venue_write lets ratings change.
  perform set_config('payo.internal', 'on', true);
  update public.venues v set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.reviews
                             where venue_id = _venue and not is_hidden), 0),
    rating_count = (select count(*) from public.reviews where venue_id = _venue and not is_hidden)
  where v.id = _venue;
  perform set_config('payo.internal', 'off', true);
  return null;
end $$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_venue_rating();

create or replace function public.guard_review_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare _uid uuid := (select auth.uid());
begin
  if public.is_trusted_backend() or public.is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.user_id     := _uid;
    new.owner_reply := null;
    new.replied_at  := null;
    new.is_hidden   := false;
    if public.owns_venue(new.venue_id) then
      raise exception 'Pemilik venue tidak dapat mengulas venue sendiri' using errcode = 'P0001';
    end if;
    return new;
  end if;

  new.user_id  := old.user_id;
  new.venue_id := old.venue_id;
  new.is_hidden := old.is_hidden;
  if public.owns_venue(old.venue_id) and old.user_id <> _uid then
    -- Owner may only reply.
    new.rating  := old.rating;
    new.comment := old.comment;
    if new.owner_reply is distinct from old.owner_reply then new.replied_at := now(); end if;
  else
    new.owner_reply := old.owner_reply;
    new.replied_at  := old.replied_at;
  end if;
  return new;
end $$;

create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.guard_review_write();

-- ------------------------------------------------- sparring guards
create or replace function public.guard_sparring_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _uid  uuid := (select auth.uid());
  _post public.sparring_posts;
begin
  select * into _post from public.sparring_posts where id = coalesce(new.post_id, old.post_id);
  if public.is_trusted_backend() or public.is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.requester_id := _uid;
    new.status := 'pending';
    new.responded_at := null;
    if _post.user_id = _uid then
      raise exception 'Tidak dapat menantang posting sendiri' using errcode = 'P0001';
    end if;
    if _post.status <> 'open' or _post.scheduled_at < now() then
      raise exception 'Posting sparring sudah tidak menerima tantangan' using errcode = 'P0001';
    end if;
    return new;
  end if;

  new.post_id := old.post_id;
  new.requester_id := old.requester_id;
  if _post.user_id = _uid then
    if new.status not in ('accepted', 'rejected') then
      raise exception 'Status tidak valid' using errcode = 'P0001';
    end if;
    new.responded_at := now();
  elsif old.requester_id = _uid then
    if new.status <> 'cancelled' then
      raise exception 'Anda hanya dapat membatalkan permintaan' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger sparring_requests_guard before insert or update on public.sparring_requests
  for each row execute function public.guard_sparring_request();

create or replace function public.notify_sparring_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare _owner uuid;
begin
  select user_id into _owner from public.sparring_posts where id = new.post_id;
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, link)
    values (_owner, 'sparring_request', 'Tantangan sparring baru',
            'Seorang pemain ingin sparring dengan Anda.', '/dashboard');
  elsif new.status in ('accepted', 'rejected') and new.status <> old.status then
    insert into public.notifications (user_id, type, title, link)
    values (new.requester_id, 'sparring_' || new.status::text,
            case when new.status = 'accepted' then 'Tantangan diterima!' else 'Tantangan ditolak' end,
            '/dashboard');
  end if;
  return null;
end $$;

create trigger sparring_requests_notify after insert or update on public.sparring_requests
  for each row execute function public.notify_sparring_request();

-- ------------------------------------------- tournament registration
create or replace function public.guard_tournament_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := (select auth.uid());
  _t   public.tournaments;
  _n   integer;
begin
  select * into _t from public.tournaments where id = coalesce(new.tournament_id, old.tournament_id) for update;
  if public.is_trusted_backend() or public.is_admin() or _t.organizer_id = _uid then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.user_id := _uid;
    new.status := 'registered';
    new.seed := null;
    if _t.status <> 'registration_open'
       or (_t.registration_closes_at is not null and _t.registration_closes_at < now()) then
      raise exception 'Pendaftaran turnamen ditutup' using errcode = 'P0001';
    end if;
    select count(*) into _n from public.tournament_participants
      where tournament_id = _t.id and status in ('registered', 'confirmed');
    if _n >= _t.max_participants then
      raise exception 'Kuota peserta sudah penuh' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- Participants may only withdraw themselves.
  new.tournament_id := old.tournament_id;
  new.user_id := old.user_id;
  new.seed := old.seed;
  if new.status <> old.status and new.status <> 'withdrawn' then
    raise exception 'Anda hanya dapat mengundurkan diri' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger tournament_participants_guard before insert or update on public.tournament_participants
  for each row execute function public.guard_tournament_registration();

-- ================================================================ VIEWS
-- security_invoker = true → the caller's RLS applies to the underlying tables.

create view public.venue_cards with (security_invoker = true) as
select
  v.id, v.slug, v.name, v.city, v.province, v.address, v.cover_image_url,
  v.latitude, v.longitude, v.rating_avg, v.rating_count,
  (select min(p.price_per_hour) from public.table_pricing p
    where p.venue_id = v.id and p.is_active) as price_from
from public.venues v
where v.status = 'verified';

create view public.tournament_cards with (security_invoker = true) as
select
  t.id, t.slug, t.name, t.city, t.game_type, t.format, t.status, t.starts_at,
  t.entry_fee, t.max_participants, t.banner_url, t.venue_id,
  (select count(*)::integer from public.tournament_participants tp
    where tp.tournament_id = t.id and tp.status in ('registered', 'confirmed')) as participant_count
from public.tournaments t
where t.status <> 'draft';

create view public.leaderboard with (security_invoker = true) as
select
  r.user_id, p.username, p.full_name, p.avatar_url, p.city, p.province,
  r.game_type, r.rating, r.matches_played, r.wins, r.losses,
  case when r.matches_played > 0
       then round(100.0 * r.wins / r.matches_played, 1) else 0 end as win_rate,
  rank() over (partition by r.game_type order by r.rating desc, r.wins desc)::integer as rank
from public.player_ratings r
join public.profiles p on p.id = r.user_id
where r.matches_played > 0 and not p.is_banned;

-- ================================================================= RPCs

-- Verified venues within a radius, ordered by great-circle distance.
create or replace function public.nearby_venues(
  lat double precision, lng double precision,
  radius_km double precision default 25, max_results integer default 12
)
returns table (
  id uuid, slug text, name text, city text, province text, address text,
  cover_image_url text, rating_avg numeric, rating_count integer,
  price_from integer, distance_km double precision
)
language sql stable set search_path = '' as $$
  select * from (
    select c.id, c.slug, c.name, c.city, c.province, c.address, c.cover_image_url,
           c.rating_avg, c.rating_count, c.price_from,
           6371 * 2 * asin(sqrt(
             power(sin(radians(c.latitude - lat) / 2), 2) +
             cos(radians(lat)) * cos(radians(c.latitude)) *
             power(sin(radians(c.longitude - lng) / 2), 2)
           )) as distance_km
    from public.venue_cards c
    where c.latitude is not null and c.longitude is not null
      and c.latitude  between lat - radius_km / 111.0 and lat + radius_km / 111.0
  ) x
  where x.distance_km <= least(radius_km, 200)
  order by x.distance_km
  limit least(greatest(max_results, 1), 50);
$$;

-- Busy slots for a table (no personal data) — used by the booking UI.
create or replace function public.table_busy_slots(_table_id uuid, _from timestamptz, _to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.starts_at, b.ends_at from public.bookings b
  where b.table_id = _table_id
    and b.status in ('pending', 'confirmed')
    and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(_from, least(_to, _from + interval '14 days'), '[)')
  order by b.starts_at;
$$;

-- >>> 20261125000004_rls_policies.sql
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

-- >>> 20261125000005_storage.sql
-- =============================================================================
-- Payo Billiard — 0005: Storage buckets & policies
-- avatars/{user_id}/...       → writable by that user
-- venue-photos/{venue_id}/... → writable by the venue owner (or admin)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('venue-photos', 'venue-photos', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Safe uuid cast for folder names (non-uuid folders simply never match).
create or replace function public.try_uuid(_v text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return _v::uuid;
exception when others then
  return null;
end $$;

create policy "venue-photos: public read" on storage.objects for select
  using (bucket_id = 'venue-photos');
create policy "venue-photos: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'venue-photos'
    and (public.owns_venue(public.try_uuid((storage.foldername(name))[1])) or public.is_admin()));
create policy "venue-photos: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'venue-photos'
    and (public.owns_venue(public.try_uuid((storage.foldername(name))[1])) or public.is_admin()));
create policy "venue-photos: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'venue-photos'
    and (public.owns_venue(public.try_uuid((storage.foldername(name))[1])) or public.is_admin()));

-- >>> 20261125000006_oauth_profiles.sql
-- =============================================================================
-- Payo Billiard — 0006: Google / Apple (OAuth) sign-in support
--  * new-user trigger also reads provider metadata (name, avatar)
--  * claim_venue_owner_role(): lets an OAuth user who signed up from
--    "Daftarkan venue" get the venue_owner role (same as email sign-up).
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  _username  text  := lower(coalesce(_meta ->> 'username', ''));
  _role      text  := coalesce(_meta ->> 'role', 'player');
  _full_name text  := nullif(left(coalesce(_meta ->> 'full_name', _meta ->> 'name', ''), 80), '');
  _avatar    text  := coalesce(_meta ->> 'avatar_url', _meta ->> 'picture');
begin
  -- OAuth users have no username: derive one from the email local part.
  if _username = '' and new.email is not null then
    _username := left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '_', 'g'), 20);
  end if;

  if _username !~ '^[a-z0-9_]{3,24}$'
     or exists (select 1 from public.profiles where username = _username) then
    _username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  -- Only https avatar URLs from the provider are accepted.
  if _avatar is not null and _avatar !~ '^https://' then
    _avatar := null;
  end if;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, _username, _full_name, _avatar);

  insert into public.user_roles (user_id, role) values (new.id, 'player');
  if _role = 'venue_owner' then
    insert into public.user_roles (user_id, role) values (new.id, 'venue_owner');
  end if;

  return new;
end $$;

create or replace function public.claim_venue_owner_role()
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.user_roles (user_id, role)
  select (select auth.uid()), 'venue_owner'
  where (select auth.uid()) is not null
  on conflict (user_id, role) do nothing;
$$;

revoke execute on function public.claim_venue_owner_role() from public, anon;
grant execute on function public.claim_venue_owner_role() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- >>> 20261125000007_sparring_places.sql
-- =============================================================================
-- Payo Billiard — 0007: sparring location picked from the map
-- Venues are no longer registered by owners; a player opening a challenge
-- picks the place on the map (OpenStreetMap). The place is stored on the post.
-- =============================================================================

alter table public.sparring_posts
  add column place_name    text check (char_length(place_name) between 2 and 120),
  add column place_address text check (char_length(place_address) <= 300),
  add column place_ref     text check (place_ref ~ '^(node|way|relation)/[0-9]+$');

-- Every challenge must point somewhere: a registered venue or map coordinates
-- inside Indonesia.
alter table public.sparring_posts
  add constraint sparring_posts_location_required check (
    venue_id is not null
    or (
      place_name is not null
      and latitude  between -11.5 and 6.5
      and longitude between 94.5 and 141.5
    )
  );

create index sparring_geo_idx on public.sparring_posts (latitude, longitude) where status = 'open';

-- Guard: a new challenge always starts open, in the future, within 60 days.
create or replace function public.guard_sparring_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_trusted_backend() or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := (select auth.uid());
    new.status := 'open';
  else
    new.user_id := old.user_id;
  end if;
  if (tg_op = 'INSERT' or new.scheduled_at <> old.scheduled_at)
     and (new.scheduled_at < now() or new.scheduled_at > now() + interval '60 days') then
    raise exception 'Jadwal harus antara sekarang dan 60 hari ke depan' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger sparring_posts_guard before insert or update on public.sparring_posts
  for each row execute function public.guard_sparring_post();

-- >>> 20261125000008_api_grants.sql
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

-- >>> 20261125000009_sparring_match_flow.sql
-- =============================================================================
-- Payo Billiard — 0009: sparring lifecycle
--   open ──(owner accepts a request)──▶ matched ──(result confirmed)──▶ completed
-- * The author may edit or delete a challenge only while it is still open.
-- * Accepting a request creates the match (one opponent per challenge).
-- * After the match time, either player reports the score; the opponent must
--   accept it. Accepted results update Elo ratings (singles only).
-- All state transitions go through SECURITY DEFINER RPCs that check the caller.
-- =============================================================================

-- ------------------------------------------------ edit / delete rules
drop policy if exists "sparring: delete own" on public.sparring_posts;
create policy "sparring: delete own open" on public.sparring_posts for delete to authenticated
  using ((user_id = (select auth.uid()) and status = 'open') or public.is_admin());

create or replace function public.guard_sparring_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_trusted_backend() or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := (select auth.uid());
    new.status := 'open';
  else
    if old.status <> 'open' then
      raise exception 'Tantangan yang sudah mendapat lawan tidak bisa diubah' using errcode = 'P0001';
    end if;
    new.user_id := old.user_id;
    new.status := old.status; -- status only changes through the RPCs below
  end if;
  if (tg_op = 'INSERT' or new.scheduled_at <> old.scheduled_at)
     and (new.scheduled_at < now() or new.scheduled_at > now() + interval '60 days') then
    raise exception 'Jadwal harus antara sekarang dan 60 hari ke depan' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Results are written only through report_match_result().
drop policy if exists "results: participant report" on public.match_results;

-- Notifications link to the challenge page.
create or replace function public.notify_sparring_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare _owner uuid;
begin
  select user_id into _owner from public.sparring_posts where id = new.post_id;
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, link)
    values (_owner, 'sparring_request', 'Tantangan sparring baru',
            'Seorang pemain ingin sparring dengan Anda.', '/sparring/' || new.post_id);
  elsif new.status in ('accepted', 'rejected') and new.status <> old.status then
    insert into public.notifications (user_id, type, title, link)
    values (new.requester_id, 'sparring_' || new.status::text,
            case when new.status = 'accepted' then 'Tantangan diterima!' else 'Tantangan ditolak' end,
            '/sparring/' || new.post_id);
  end if;
  return null;
end $$;

-- ------------------------------------------------ accept / reject request
create or replace function public.respond_sparring_request(p_request uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _uid  uuid := (select auth.uid());
  _req  public.sparring_requests;
  _post public.sparring_posts;
  _match uuid;
begin
  select * into _req from public.sparring_requests where id = p_request for update;
  if not found then raise exception 'Permintaan tidak ditemukan' using errcode = 'P0001'; end if;
  select * into _post from public.sparring_posts where id = _req.post_id for update;
  if _post.user_id is distinct from _uid then
    raise exception 'Hanya pembuat tantangan yang bisa merespons' using errcode = 'P0001';
  end if;
  if _post.status <> 'open' or _req.status <> 'pending' then
    raise exception 'Permintaan ini sudah tidak bisa direspons' using errcode = 'P0001';
  end if;

  perform set_config('payo.internal', 'on', true);

  if not p_accept then
    update public.sparring_requests set status = 'rejected', responded_at = now() where id = p_request;
    perform set_config('payo.internal', 'off', true);
    return null;
  end if;

  update public.sparring_requests set status = 'accepted', responded_at = now() where id = p_request;
  update public.sparring_requests set status = 'rejected', responded_at = now()
    where post_id = _post.id and id <> p_request and status = 'pending';
  update public.sparring_posts set status = 'matched' where id = _post.id;

  insert into public.matches (game_type, match_format, sparring_post_id, team_a_player1, team_b_player1,
                              race_to, scheduled_at, status, is_rated, created_by)
  values (_post.game_type, 'singles', _post.id, _post.user_id, _req.requester_id,
          _post.race_to, _post.scheduled_at, 'scheduled',
          _post.match_format = 'singles', -- doubles: recorded between captains, not rated
          _uid)
  returning id into _match;

  perform set_config('payo.internal', 'off', true);
  return _match;
end $$;

-- ------------------------------------------------ report a result
create or replace function public.report_match_result(p_match uuid, p_my_score integer, p_opponent_score integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := (select auth.uid());
  _m   public.matches;
  _a   integer;
  _b   integer;
  _opp uuid;
begin
  select * into _m from public.matches where id = p_match for update;
  if not found or _uid not in (_m.team_a_player1, _m.team_b_player1) then
    raise exception 'Anda bukan pemain di pertandingan ini' using errcode = 'P0001';
  end if;
  if _m.status not in ('scheduled', 'in_progress', 'disputed') then
    raise exception 'Hasil pertandingan ini sudah final' using errcode = 'P0001';
  end if;
  if _m.scheduled_at is not null and now() < _m.scheduled_at then
    raise exception 'Hasil bisa dilaporkan setelah jadwal pertandingan dimulai' using errcode = 'P0001';
  end if;
  if p_my_score is null or p_opponent_score is null or p_my_score < 0 or p_opponent_score < 0
     or p_my_score > 99 or p_opponent_score > 99 or p_my_score = p_opponent_score then
    raise exception 'Skor tidak valid (tidak boleh seri)' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.match_results where match_id = p_match and confirmed_at is null) then
    raise exception 'Sudah ada hasil yang menunggu konfirmasi' using errcode = 'P0001';
  end if;

  if _uid = _m.team_a_player1 then
    _a := p_my_score; _b := p_opponent_score; _opp := _m.team_b_player1;
  else
    _a := p_opponent_score; _b := p_my_score; _opp := _m.team_a_player1;
  end if;

  insert into public.match_results (match_id, team_a_score, team_b_score, winner_team, reported_by)
  values (p_match, _a, _b, case when _a > _b then 'a' else 'b' end, _uid);
  update public.matches set status = 'in_progress' where id = p_match;

  insert into public.notifications (user_id, type, title, body, link)
  values (_opp, 'result_reported', 'Konfirmasi hasil pertandingan',
          'Lawan Anda melaporkan skor ' || p_my_score || '–' || p_opponent_score || '. Terima atau tolak.',
          coalesce('/sparring/' || _m.sparring_post_id, '/dashboard'));
end $$;

-- ------------------------------------------------ Elo rating update
create or replace function public.apply_elo(p_winner uuid, p_loser uuid, p_game public.game_type)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _rw integer; _rl integer; _ew numeric; _k integer := 32; _delta integer;
begin
  insert into public.player_ratings (user_id, game_type) values (p_winner, p_game), (p_loser, p_game)
    on conflict (user_id, game_type) do nothing;
  select rating into _rw from public.player_ratings where user_id = p_winner and game_type = p_game for update;
  select rating into _rl from public.player_ratings where user_id = p_loser and game_type = p_game for update;
  _ew := 1 / (1 + power(10, (_rl - _rw) / 400.0));
  _delta := greatest(1, round(_k * (1 - _ew)))::integer;
  update public.player_ratings
     set rating = least(4000, rating + _delta), matches_played = matches_played + 1, wins = wins + 1, updated_at = now()
   where user_id = p_winner and game_type = p_game;
  update public.player_ratings
     set rating = greatest(100, rating - _delta), matches_played = matches_played + 1, losses = losses + 1, updated_at = now()
   where user_id = p_loser and game_type = p_game;
end $$;

-- ------------------------------------------------ accept / reject a result
create or replace function public.respond_match_result(p_match uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := (select auth.uid());
  _m   public.matches;
  _r   public.match_results;
  _winner uuid; _loser uuid;
begin
  select * into _m from public.matches where id = p_match for update;
  select * into _r from public.match_results where match_id = p_match for update;
  if not found or _r.confirmed_at is not null then
    raise exception 'Tidak ada hasil yang menunggu konfirmasi' using errcode = 'P0001';
  end if;
  if _uid not in (_m.team_a_player1, _m.team_b_player1) or _uid = _r.reported_by then
    raise exception 'Hanya lawan yang bisa mengonfirmasi hasil' using errcode = 'P0001';
  end if;

  perform set_config('payo.internal', 'on', true);

  if not p_accept then
    delete from public.match_results where id = _r.id;
    update public.matches set status = 'disputed' where id = p_match;
    insert into public.notifications (user_id, type, title, body, link)
    values (_r.reported_by, 'result_rejected', 'Hasil ditolak lawan',
            'Laporkan ulang skor yang benar.', coalesce('/sparring/' || _m.sparring_post_id, '/dashboard'));
    perform set_config('payo.internal', 'off', true);
    return;
  end if;

  update public.match_results set confirmed_by = _uid, confirmed_at = now() where id = _r.id;
  update public.matches set status = 'completed' where id = p_match;
  if _m.sparring_post_id is not null then
    update public.sparring_posts set status = 'completed' where id = _m.sparring_post_id;
  end if;

  if _m.is_rated then
    if _r.winner_team = 'a' then _winner := _m.team_a_player1; _loser := _m.team_b_player1;
    else _winner := _m.team_b_player1; _loser := _m.team_a_player1; end if;
    perform public.apply_elo(_winner, _loser, _m.game_type);
  end if;

  insert into public.notifications (user_id, type, title, link)
  values (_r.reported_by, 'result_confirmed', 'Hasil pertandingan dikonfirmasi',
          coalesce('/sparring/' || _m.sparring_post_id, '/dashboard'));
  perform set_config('payo.internal', 'off', true);
end $$;

-- ------------------------------------------------ exposure
revoke execute on function public.apply_elo(uuid, uuid, public.game_type) from public, anon, authenticated;
revoke execute on function public.respond_sparring_request(uuid, boolean) from public, anon;
revoke execute on function public.report_match_result(uuid, integer, integer) from public, anon;
revoke execute on function public.respond_match_result(uuid, boolean) from public, anon;
grant execute on function public.respond_sparring_request(uuid, boolean) to authenticated;
grant execute on function public.report_match_result(uuid, integer, integer) to authenticated;
grant execute on function public.respond_match_result(uuid, boolean) to authenticated;

-- >>> 20261125000010_google_place_refs.sql
-- =============================================================================
-- Payo Billiard — 0010: allow Google Places references on challenges
-- place_ref is "node/123" | "way/123" | "relation/123" (OpenStreetMap)
--          or "google:<place id>" (Google Maps Platform).
-- =============================================================================
alter table public.sparring_posts drop constraint if exists sparring_posts_place_ref_check;
alter table public.sparring_posts
  add constraint sparring_posts_place_ref_check
  check (place_ref ~ '^((node|way|relation)/[0-9]+|google:[A-Za-z0-9_-]{10,255})$');


-- ==== 20261125000011_match_chat.sql ====
-- =============================================================================
-- Payo Billiard — 0011: chat between matched players + optional WhatsApp share
-- Once a challenge is accepted, both sides can message each other on the
-- challenge page. Phone numbers are never exposed automatically: each player
-- may choose to share a WhatsApp number with that one match.
-- =============================================================================

-- Is the caller one of the players of this match?
create or replace function public.is_match_player(p_match uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match
      and auth.uid() in (m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2)
  );
$$;
revoke all on function public.is_match_player(uuid) from public;
grant execute on function public.is_match_player(uuid) to authenticated;

-- ------------------------------------------------------------ match_messages
create table if not exists public.match_messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  sender_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists match_messages_match_idx on public.match_messages (match_id, created_at);

alter table public.match_messages enable row level security;

drop policy if exists "match_messages: players read" on public.match_messages;
create policy "match_messages: players read" on public.match_messages
  for select to authenticated
  using (public.is_match_player(match_id));

drop policy if exists "match_messages: players send" on public.match_messages;
create policy "match_messages: players send" on public.match_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_match_player(match_id)
    and exists (select 1 from public.matches m where m.id = match_id and m.status <> 'cancelled')
  );

-- Simple flood guard: max 20 messages per minute per sender.
create or replace function public.guard_match_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.sender_id := auth.uid();
  new.created_at := now();
  new.body := btrim(new.body);
  if (select count(*) from public.match_messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Terlalu banyak pesan, tunggu sebentar' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists match_messages_guard on public.match_messages;
create trigger match_messages_guard before insert on public.match_messages
  for each row execute function public.guard_match_message();

revoke all on public.match_messages from anon, authenticated;
grant select, insert on public.match_messages to authenticated;

-- ------------------------------------------------------------ match_contacts
-- A WhatsApp number a player chose to share with the other side of one match.
create table if not exists public.match_contacts (
  match_id    uuid not null references public.matches (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  whatsapp    text not null check (whatsapp ~ '^62[0-9]{8,13}$'),
  created_at  timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_contacts enable row level security;

drop policy if exists "match_contacts: players read" on public.match_contacts;
create policy "match_contacts: players read" on public.match_contacts
  for select to authenticated
  using (public.is_match_player(match_id));

drop policy if exists "match_contacts: share own" on public.match_contacts;
create policy "match_contacts: share own" on public.match_contacts
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_match_player(match_id));

drop policy if exists "match_contacts: update own" on public.match_contacts;
create policy "match_contacts: update own" on public.match_contacts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_match_player(match_id));

drop policy if exists "match_contacts: remove own" on public.match_contacts;
create policy "match_contacts: remove own" on public.match_contacts
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.match_contacts from anon, authenticated;
grant select, insert, update, delete on public.match_contacts to authenticated;

-- ------------------------------------------------------------ realtime
-- New messages are pushed to the open chat (RLS still filters who receives them).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_messages'
     ) then
    alter publication supabase_realtime add table public.match_messages;
  end if;
end $$;
