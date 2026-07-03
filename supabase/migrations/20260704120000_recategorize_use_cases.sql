-- Recategorize skills onto their PRIMARY use case and introduce the new `Meta`
-- use case (skills that improve the agent itself — memory, workflow observation,
-- skill-building).
--
-- Pattern: each skill keeps only the category matching its primary outcome —
-- "Research"/"Development" as it-touches-code-or-reads-stuff secondary tags are
-- dropped; mockup/knowledge skills that genuinely span two outcomes keep both
-- (gsap-scrolltrigger, clone-website: Design+Development; imagegen mockups:
-- Design+Images).
--
-- Apply via Supabase Dashboard → SQL Editor, or: supabase db push

-- 1. Allow the new `Meta` key (mirrors skill-model USE_CASE_BY_KEY / SkillUseCase).
alter table public.skills drop constraint skills_use_cases_valid;
alter table public.skills
  add constraint skills_use_cases_valid
  check (use_cases <@ array['Design','Video','Images','Writing','SEO','Development','Research','Meta']);

-- 2. Recategorize. Unchanged rows (already single/correct) are omitted:
--    tweak-evaluate, gsap-scrolltrigger, motion-graphics, clone-website,
--    imagegen-frontend-mobile, industrial-brutalist-ui, minimalist-ui,
--    agent-reach, impeccable.

-- Writing
update public.skills set use_cases = '{Writing}' where id = 'blader/humanizer/humanizer';
update public.skills set use_cases = '{Writing}' where id = 'hardikpandya/stop-slop/stop-slop';

-- SEO
update public.skills set use_cases = '{SEO}' where id = 'coreyhaines31/marketingskills/seo-audit';

-- Development
update public.skills set use_cases = '{Development}' where id = 'DietrichGebert/ponytail/ponytail-audit';
update public.skills set use_cases = '{Development}' where id = 'Egonex-AI/Understand-Anything/understand';
update public.skills set use_cases = '{Development}' where id = 'Leonxlnx/taste-skill/full-output-enforcement';
update public.skills set use_cases = '{Development}' where id = 'mattpocock/skills/grill-me';

-- Video
update public.skills set use_cases = '{Video}' where id = 'heygen-com/hyperframes/hyperframes';
update public.skills set use_cases = '{Video}' where id = 'heygen-com/hyperframes/website-to-video';

-- Design
update public.skills set use_cases = '{Design}' where id = 'jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better';
update public.skills set use_cases = '{Design}' where id = 'Leonxlnx/taste-skill/brandkit';
update public.skills set use_cases = '{Design}' where id = 'Leonxlnx/taste-skill/design-taste-frontend';
update public.skills set use_cases = '{Design}' where id = 'Leonxlnx/taste-skill/high-end-visual-design';
update public.skills set use_cases = '{Design}' where id = 'Leonxlnx/taste-skill/image-to-code';
update public.skills set use_cases = '{Design}' where id = 'Leonxlnx/taste-skill/redesign-existing-projects';

-- Design + Images (mockup generators: design outcome, image output)
update public.skills set use_cases = '{Design,Images}' where id = 'Leonxlnx/taste-skill/imagegen-frontend-web';

-- Images
update public.skills set use_cases = '{Images}' where id = 'tmchow/illo-skill/illo';

-- Research
update public.skills set use_cases = '{Research}' where id = 'mvanhorn/last30days-skill/last30days';

-- Meta (improve the agent itself)
update public.skills set use_cases = '{Meta}' where id = 'rebelytics/one-skill-to-rule-them-all/task-observer';
update public.skills set use_cases = '{Meta}' where id = 'supermemoryai/supermemory/supermemory';
update public.skills set use_cases = '{Meta}' where id = 'virgiliojr94/book-to-skill/book-to-skill';
