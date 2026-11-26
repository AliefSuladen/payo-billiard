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
