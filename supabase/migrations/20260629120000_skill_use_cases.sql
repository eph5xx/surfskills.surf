-- Collapse the old `audiences` + `tasks` axes into a single `use_cases` axis — the
-- primary browse axis behind the /discover/<use-case> SEO/GEO landing pages.
--
-- `use_cases` holds canonical enum KEY strings (Design / Video / Images / Writing /
-- SEO / Development / Research), same convention as `kind`. The app (skill-model/db.ts)
-- maps them back to the SkillUseCase enum and defensively drops any unknown key.
--
-- Apply via Supabase Dashboard → SQL Editor, or: supabase db push

-- 1. New column (default empty so existing rows stay valid until backfilled).
alter table public.skills
  add column use_cases text[] not null default '{}';

-- 2. Backfill: use_cases = de-duped union of the mapped old audiences + tasks.
--    Founder (the dropped "Startups" audience) maps to nothing; Audit/Review fold
--    into Research; Website folds into Design; Integrate folds into Development.
update public.skills s
set use_cases = coalesce((
  select array_agg(distinct uc order by uc)
  from (
    select case a
             when 'Design'    then 'Design'
             when 'SEO'       then 'SEO'
             when 'Writing'   then 'Writing'
             when 'Developer' then 'Development'
             else null  -- Founder → dropped
           end as uc
    from unnest(s.audiences) as a
    union all
    select case t
             when 'Website'   then 'Design'
             when 'Video'     then 'Video'
             when 'Image'     then 'Images'
             when 'Research'  then 'Research'
             when 'Review'    then 'Research'
             when 'Audit'     then 'Research'
             when 'Integrate' then 'Development'
             else null
           end as uc
    from unnest(s.tasks) as t
  ) mapped
  where uc is not null
), '{}');

-- 3. Surface any rows left with no use case (e.g. a Founder-only skill) so they can
--    be hand-tagged in Studio. These won't appear under any landing page.
do $$
declare r record;
begin
  for r in select id from public.skills where cardinality(use_cases) = 0 loop
    raise notice 'skill % has empty use_cases after backfill — hand-tag needed', r.id;
  end loop;
end $$;

-- 4. Constrain to the known keys (mirrors the `kind` check constraint).
alter table public.skills
  add constraint skills_use_cases_valid
  check (use_cases <@ array['Design','Video','Images','Writing','SEO','Development','Research']);

-- 5. Drop the superseded columns — nothing reads them anymore.
alter table public.skills drop column audiences;
alter table public.skills drop column tasks;
