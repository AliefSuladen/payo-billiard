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
