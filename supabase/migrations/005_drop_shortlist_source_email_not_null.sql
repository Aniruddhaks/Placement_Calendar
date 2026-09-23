-- Admin-created shortlists have no source email (source_email_id remains set for
-- webhook-ingested ones). Postgres UNIQUE permits multiple NULLs, so dropping
-- the NOT NULL allows manual shortlists while keeping webhook dedup intact.

alter table public.shortlists
  alter column source_email_id drop not null;
