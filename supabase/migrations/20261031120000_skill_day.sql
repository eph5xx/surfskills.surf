-- One skill per day: every skill gets its own `day`, and the public sees it only
-- from midnight in Yerevan on that day. The surf-skill pipeline (Publish) writes
-- finished cards straight into `skills` with a future day using the secret key,
-- which bypasses RLS. Nothing runs on a schedule: the read policies below compare
-- `day` with today, so a row goes live on its own.
--
-- Replaces the private `skill_queue` table: queued cards were already copied into
-- `skills`, and the guard below refuses to drop the queue if any are not.
--
-- Existing skills are given days in the order they were added: the newest gets
-- 2026-10-31, then one day back per skill. That keeps the two queued cards on the
-- days they had in the queue (hallmark 2026-10-30, canvas-design 2026-10-31).
--
-- Apply with:
--   supabase db query --linked -f supabase/migrations/20261031120000_skill_day.sql
-- (or --project-ref <ref> instead of --linked). Not `supabase db push`: the live
-- database has no migration history, so push would replay every migration.

begin;

do $$
declare
  missing text;
begin
  select string_agg(q.skill_id, ', ') into missing
  from public.skill_queue q
  where not exists (select 1 from public.skills s where s.id = q.skill_id);
  if missing is not null then
    raise exception 'skill_queue rows with no matching skill: %', missing;
  end if;
end;
$$;

-- The one definition of "today" for the catalog. Publish's SITE_TZ must match.
create function public.surf_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Yerevan')::date $$;

alter table public.skills add column day date;

update public.skills s
set day = date '2026-10-31' - (o.n - 1)::int
from (
  select id, row_number() over (order by created_at desc, id desc) as n
  from public.skills
) o
where s.id = o.id;

alter table public.skills alter column day set not null;
-- Also serves `day <= today` lookups and newest-day-first queries.
alter table public.skills add constraint skills_day_key unique (day);

drop policy "public read skills" on public.skills;
create policy "public read skills"
  on public.skills for select
  to anon, authenticated
  using (day <= (select public.surf_today()));

-- A collection appears once one of its skills has gone live.
drop policy "public read collections" on public.collections;
create policy "public read collections"
  on public.collections for select
  to anon, authenticated
  using (exists (
    select 1 from public.skills s
    where s.collection_id = collections.id
      and s.day <= (select public.surf_today())
  ));

drop table public.skill_queue;

commit;
