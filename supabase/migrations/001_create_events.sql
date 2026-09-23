create type public.event_type as enum ('OA', 'TECHNICAL_INTERVIEW');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  role text not null,
  event_type public.event_type not null,
  event_date date not null,
  start_time time,
  end_time time,
  mode text,
  venue text,
  location text,
  application_deadline timestamptz,
  stipend text,
  eligibility text,
  description text,
  additional_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_event_date_idx on public.events (event_date, start_time);

alter table public.events enable row level security;

create policy "Anyone can read events"
  on public.events
  for select
  using (true);

create policy "Authenticated users can insert events"
  on public.events
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete events"
  on public.events
  for delete
  to authenticated
  using (true);
