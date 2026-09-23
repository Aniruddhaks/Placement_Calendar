create type public.shortlist_status as enum ('draft', 'published');

create table public.shortlists (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  role text,
  event_id uuid references public.events(id) on delete set null,
  announcement_date date not null,
  student_count integer,
  students jsonb,
  source_email_id text not null unique,
  status public.shortlist_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shortlists_company_idx on public.shortlists (company_name);
create index shortlists_event_id_idx on public.shortlists (event_id);
create index shortlists_status_idx on public.shortlists (status);
create index shortlists_announcement_date_idx on public.shortlists (announcement_date);

alter table public.shortlists enable row level security;

create policy "Anyone can read published shortlists"
  on public.shortlists
  for select
  using (status = 'published');

create policy "Authenticated users can insert shortlists"
  on public.shortlists
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update shortlists"
  on public.shortlists
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete shortlists"
  on public.shortlists
  for delete
  to authenticated
  using (true);
