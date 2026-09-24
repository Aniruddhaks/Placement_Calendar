-- Raw email + JD storage for events.
-- raw_email preserves the original ingested body so admins can review what was
-- actually said; job_description_url holds the storage object path (within the
-- "jds" bucket) of an attached/passed-on Job Description.

alter table public.events
  add column if not exists raw_email text,
  add column if not exists job_description_url text;

create index if not exists events_jd_idx on public.events (job_description_url)
  where job_description_url is not null;

-- Private bucket so anonymous access is governed purely by the select policies
-- below: the public can open a JD only when its event is published.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jds',
  'jds',
  false,
  20971520,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/octet-stream']
)
on conflict (id) do update
  set public = false, file_size_limit = 20971520;

alter table storage.objects enable row level security;

drop policy if exists "public can read jds for published events" on storage.objects;
create policy "public can read jds for published events"
  on storage.objects
  for select
  to anon
  using (
    bucket_id = 'jds'
    and exists (
      select 1
      from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.status = 'published'
    )
  );

drop policy if exists "admins can read any jds" on storage.objects;
create policy "admins can read any jds"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'jds');