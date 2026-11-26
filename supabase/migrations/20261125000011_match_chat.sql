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
