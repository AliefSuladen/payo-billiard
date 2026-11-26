-- =============================================================================
-- Payo Billiard — 0010: allow Google Places references on challenges
-- place_ref is "node/123" | "way/123" | "relation/123" (OpenStreetMap)
--          or "google:<place id>" (Google Maps Platform).
-- =============================================================================
alter table public.sparring_posts drop constraint if exists sparring_posts_place_ref_check;
alter table public.sparring_posts
  add constraint sparring_posts_place_ref_check
  check (place_ref ~ '^((node|way|relation)/[0-9]+|google:[A-Za-z0-9_-]{10,255})$');
