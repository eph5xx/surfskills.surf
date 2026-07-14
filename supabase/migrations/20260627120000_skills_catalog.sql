-- Skills catalog: the directory's collections + skills, read at request time by
-- the SSR catalog pages (/discover, /s/**, /sitemap.xml). Rows are authored in
-- Supabase Studio / SQL or seeded once from src/data/skill-model via
-- `npm run seed:skills`. Browsers/SSR only ever read; writes go through the
-- secret-key (service role) client. Apply via Supabase Dashboard → SQL Editor, or:
--   supabase link --project-ref <project-ref> && supabase db push

-- A collection is a GitHub repo that ships one or more skills. id = "owner/repo".
create table public.collections (
  id                text primary key,
  name              text not null,
  short_description text not null,
  readme            text,
  repository_url    text not null,
  website_url       text,
  external_links    text[] not null default '{}',
  author_name       text not null,
  author_url        text not null,
  author_avatar_url text,
  license           text,
  github_stars      integer,
  -- Catalog "last updated" for the repo (ISO date), distinct from row mtime.
  updated_at        date,
  install_command   text not null,
  install_count     integer,
  -- Every skill id the repo ships — including ones we don't have a page for yet
  -- (rendered "coming soon" on the collection roster).
  skills            text[] not null default '{}',
  created_at        timestamptz not null default now()
);

-- A directory skill = one page under /s/owner/repo/skill. id = "owner/repo/skill".
-- Enum-ish fields hold the canonical enum *key* strings (Action / Founder / Audit …)
-- so the app maps them back to the SkillKind/SkillAudience/SkillTask enums.
create table public.skills (
  id              text primary key,
  collection_id   text not null references public.collections (id) on delete cascade,
  name            text not null,
  description     jsonb not null,                 -- { short, input, process, output }
  example         text not null,
  reference_file  text,
  install_command text,
  tools           jsonb not null default '[]',    -- [{ name, blocking }]
  preview_video   text,
  preview_image   text,
  external_links  text[] not null default '{}',
  kind            text not null check (kind in ('Action', 'Mode', 'Knowledge', 'Router')),
  audiences       text[] not null default '{}',
  tasks           text[] not null default '{}',
  -- Slugs of related skills, surfaced on the detail page (was relatedSkillSlugs).
  related_slugs   text[] not null default '{}',
  -- Optional manual ordering hint for Discover; ties broken by created_at desc.
  sort_order      integer,
  created_at      timestamptz not null default now()
);

create index skills_collection_id_idx on public.skills (collection_id);

-- Public read; no public write. RLS allows select for everyone (the catalog is
-- public), and write privileges are stripped from the API roles so only the
-- secret-key client (seed script / future admin) can mutate.
alter table public.collections enable row level security;
alter table public.skills      enable row level security;

create policy "public read collections"
  on public.collections for select
  to anon, authenticated
  using (true);

create policy "public read skills"
  on public.skills for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.collections from anon, authenticated;
revoke insert, update, delete on public.skills      from anon, authenticated;
