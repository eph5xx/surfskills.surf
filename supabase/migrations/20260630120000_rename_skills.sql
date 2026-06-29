-- Regenerate skill display names: short, plain, human labels.
-- `name` is display + search text only; URLs/slugs/IDs derive from `id` and are
-- untouched. Matched by `id` (never by old name) so this is safe to re-run.

update public.skills set name = 'Mock Up a Website'           where id = 'Leonxlnx/taste-skill/imagegen-frontend-web';
update public.skills set name = 'Audit Your SEO'              where id = 'coreyhaines31/marketingskills/seo-audit';
update public.skills set name = 'Find Dead Code'              where id = 'DietrichGebert/ponytail/ponytail-audit';
update public.skills set name = 'Catch AI Slop'              where id = 'hardikpandya/stop-slop/stop-slop';
update public.skills set name = 'Make a Brand Kit'            where id = 'Leonxlnx/taste-skill/brandkit';
update public.skills set name = 'Grill Your Plan'            where id = 'mattpocock/skills/grill-me';
update public.skills set name = 'Make an Illustration'        where id = 'tmchow/illo-skill/illo';
update public.skills set name = 'Make a Video'                where id = 'heygen-com/hyperframes/hyperframes';
update public.skills set name = 'What People Are Saying'      where id = 'mvanhorn/last30days-skill/last30days';
update public.skills set name = 'Learn How You Work'          where id = 'rebelytics/one-skill-to-rule-them-all/task-observer';
update public.skills set name = 'Turn a Website Into a Video' where id = 'heygen-com/hyperframes/website-to-video';
update public.skills set name = 'Validate Startup Idea'       where id = 'eph5xx/tweakidea/tweak-evaluate';
