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
