-- Queue for skill-of-the-day cards: one row per card, each with the day it goes
-- live. The surf-skill pipeline (scripts/publish.mjs) writes here with the secret
-- key; nothing on the site reads it yet. Moving a row onto the site (insert
-- `collection` into collections if present, then `skill` into skills) comes later
-- with the website track.
--
-- `skill` is a ready `skills` row and `collection` a ready `collections` row
-- (only when the repo isn't on the site yet), so going live is a plain insert.
--
-- Private: RLS is on with no policies and the API roles have no privileges, so
-- only the secret key (service role) can read or write it.
--
-- Apply with:
--   supabase db query --linked -f supabase/migrations/20261029120000_skill_queue.sql
-- (or --project-ref <ref> instead of --linked). Not `supabase db push`: the live
-- database has no migration history, so push would replay every migration.

create table public.skill_queue (
  skill_id    text primary key,
  publish_on  date not null unique,
  skill       jsonb not null,
  collection  jsonb,
  created_at  timestamptz not null default now(),
  constraint skill_queue_skill_id_matches check (skill->>'id' = skill_id),
  constraint skill_queue_collection_matches
    check (collection is null or collection->>'id' = skill->>'collection_id')
);

alter table public.skill_queue enable row level security;

revoke all on public.skill_queue from anon, authenticated;
