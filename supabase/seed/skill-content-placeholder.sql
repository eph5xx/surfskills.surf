-- One-off placeholder fill for the new skill-page content fields
-- (long_description / when_to_use / faq). NOT a migration — throwaway seed data so
-- the "What it does", "When to use it", and "FAQ" sections render while real,
-- per-skill copy is authored. Guarded to only touch rows still empty, so re-running
-- won't clobber anything real you've filled in since.
--
-- Run in Supabase Dashboard → SQL Editor. To clear it later:
--   update public.skills set long_description = null, when_to_use = null, faq = null
--   where long_description like 'TODO FILL%';

update public.skills
set
  long_description = 'TODO FILL — a couple of paragraphs describing what this skill does, in plain language, will go here.

TODO FILL — a second paragraph with more detail: the workflow, what it produces, and why you would reach for it.',
  when_to_use = '[
    {"title": "TODO FILL", "body": "TODO FILL — a short line describing this use case."},
    {"title": "TODO FILL", "body": "TODO FILL — a short line describing this use case."},
    {"title": "TODO FILL", "body": "TODO FILL — a short line describing this use case."}
  ]'::jsonb,
  faq = '[
    {"q": "TODO FILL?", "a": "TODO FILL — the answer to this question."},
    {"q": "TODO FILL?", "a": "TODO FILL — the answer to this question."},
    {"q": "TODO FILL?", "a": "TODO FILL — the answer to this question."}
  ]'::jsonb
where long_description is null
  and when_to_use is null
  and faq is null;
