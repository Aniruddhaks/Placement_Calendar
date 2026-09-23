-- Deduplication keys for events and shortlists.
-- source_email_id already has a unique index (migrations 002/003) and is used to
-- reject redeliveries of the same email. dedup_key adds a content-based unique key
-- so that two *different* emails carrying the *same* announcement do not create
-- duplicate records. Keys are computed by the webhook from normalized fields.

alter table public.events
  add column if not exists dedup_key text;

create unique index if not exists events_dedup_key_idx
  on public.events (dedup_key)
  where dedup_key is not null;

alter table public.shortlists
  add column if not exists dedup_key text;

create unique index if not exists shortlists_dedup_key_idx
  on public.shortlists (dedup_key)
  where dedup_key is not null;

-- Admins (authenticated users) need to read ALL shortlists (drafts + published).
-- Anonymous users keep seeing only published shortlists via the existing policy.
drop policy if exists "Authenticated users can read all shortlists" on public.shortlists;

create policy "Authenticated users can read all shortlists"
  on public.shortlists
  for select
  to authenticated
  using (true);