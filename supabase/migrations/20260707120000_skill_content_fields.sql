-- Long-form content for the skill page (/s/owner/repo/skill) — the unique,
-- substantial text that lifts each page above the thin competitor listings and
-- earns the `{skill}` / `{skill} for {use case}` queries.
--
-- All three columns are nullable and optional: the page (SkillPage.astro) renders
-- each section only when its field is populated, so existing rows keep working and
-- get the new sections once backfilled. The app (skill-model/db.ts) reads them and
-- defensively drops malformed jsonb entries, so no shape constraint is enforced here.
--
--   long_description  markdown/plain prose      → "What it does"
--   when_to_use       [{ title, body }]         → "When to use it"
--   faq               [{ q, a }]                → "FAQ" + FAQPage structured data
--
-- Apply via Supabase Dashboard → SQL Editor, or:
--   supabase link --project-ref <project-ref> && supabase db push

alter table public.skills
  add column long_description text,
  add column when_to_use      jsonb,
  add column faq              jsonb;
