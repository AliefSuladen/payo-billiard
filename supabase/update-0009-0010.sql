-- Payo Billiard — update for an existing project (already ran 0001–0008).
-- Paste into Supabase → SQL Editor → Run once.

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
