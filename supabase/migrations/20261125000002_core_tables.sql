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
