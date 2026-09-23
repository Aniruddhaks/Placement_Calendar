create type public.event_status as enum ('draft', 'published');

alter table public.events
  add column status public.event_status not null default 'draft',
  add column source_email_id text unique;

create index events_status_idx on public.events (status);
create index events_source_email_idx on public.events (source_email_id);

-- Update RLS policies to only allow reading published events
drop policy if exists "Anyone can read events" on public.events;

create policy "Anyone can read published events"
  on public.events
  for select
  using (status = 'published');

create policy "Authenticated users can read all events"
  on public.events
  for select
  to authenticated
  using (true);
