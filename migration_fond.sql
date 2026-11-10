-- =====================================================================
-- IPNET Events : mise à jour "fond animé par événement"
-- À coller dans une NOUVELLE requête vide, puis Run. Peut être relancé sans risque.
-- =====================================================================

-- 1. Image ou vidéo de fond pour chaque événement
alter table public.events add column if not exists bg_url  text;
alter table public.events add column if not exists bg_kind text;
alter table public.events drop constraint if exists events_bg_kind_check;
alter table public.events add constraint events_bg_kind_check
  check (bg_kind is null or bg_kind in ('image','video'));

-- 2. Dossier public pour ces fichiers (lecture pour tous, écriture admin seulement)
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', true, 41943040,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public = true, file_size_limit = 41943040,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'];

drop policy if exists "media: lecture publique" on storage.objects;
drop policy if exists "media: admin envoie"     on storage.objects;
drop policy if exists "media: admin supprime"   on storage.objects;

create policy "media: lecture publique" on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-media');
create policy "media: admin envoie" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media' and public.is_admin());
create policy "media: admin supprime" on storage.objects for delete to authenticated
  using (bucket_id = 'event-media' and public.is_admin());

-- 3. Journal : création / modification / suppression d'un événement
create or replace function public.log_event_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.write_log('event_delete', old.id::text, jsonb_build_object('title', old.title));
    return old;
  end if;
  perform public.write_log(case when tg_op = 'INSERT' then 'event_create' else 'event_update' end,
                           new.id::text, jsonb_build_object('title', new.title));
  return new;
end $$;
revoke all on function public.log_event_change() from public, anon, authenticated;

drop trigger if exists events_log on public.events;
create trigger events_log after insert or update or delete on public.events
  for each row execute function public.log_event_change();

-- 4. (au cas où) droit utilisé par la contrainte des paliers
grant execute on function public.valid_tiers(jsonb) to authenticated;
