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
