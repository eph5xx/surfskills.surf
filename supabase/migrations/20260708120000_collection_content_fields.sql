-- Long-form content for the collection page (/s/owner/repo) — the same unique,
-- substantial text the skill pages carry, for the collection landing page: the
-- text that lifts it above a thin roster listing and earns the `{collection}` /
-- `{collection} for {use case}` queries. Mirrors the skill content fields.
--
-- All three columns are nullable and optional: the page renders each section only
-- when its field is populated, so existing rows keep working and get the new
-- sections once backfilled. The app (skill-model/db.ts) reads them and defensively
-- drops malformed jsonb entries, so no shape constraint is enforced here.
--
--   long_description  markdown/plain prose      → "What it does"
--   when_to_use       [{ title, body }]         → "When to use it"
--   faq               [{ q, a }]                → "FAQ" + FAQPage structured data
--
-- Apply via Supabase Dashboard → SQL Editor, or:
--   supabase link --project-ref tlyvjybccqlafmowvusp && supabase db push

alter table public.collections
  add column long_description text,
  add column when_to_use      jsonb,
  add column faq              jsonb;
