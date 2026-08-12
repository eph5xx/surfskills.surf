# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

[surfskills.surf](https://surfskills.surf) — a curated directory of open-source AI agent skills. Astro 5 site deployed to Cloudflare Workers, with Supabase (catalog data + auth) and PostHog analytics.

## Commands

```bash
npm run dev          # astro dev; .dev.vars secrets available via Cloudflare platformProxy
npm run build        # astro build → dist/
npm run preview      # build + wrangler dev — closest to production runtime
npx astro check      # typecheck (.astro + .ts); no npm script for it
```

There is no test suite and no linter configured.

## Git workflow

`core.hooksPath` is set to `.githooks`, which **blocks committing and pushing to `main`**. Always work on a feature branch and PR into `main`.

## Environment / secrets

Two distinct channels — don't mix them up:

- `.env` (from `.env.example`): `PUBLIC_*` build-time values, inlined by Vite, read via `import.meta.env`. Supabase URL/publishable key, PostHog key/host.
- `.dev.vars` (from `.dev.vars.example`): runtime secrets, read via `Astro.locals.runtime.env` (typed in `src/env.d.ts`). Production uses `wrangler secret put` + `wrangler.jsonc` vars.

## Architecture

### Rendering model: static by default, SSR opt-in

`astro.config.mjs` keeps `output: 'static'`; marketing/blog/legal pages prerender. DB-backed pages opt into SSR individually with `export const prerender = false`: `/discover`, `/s/[owner]/[repo]`, `/s/[owner]/[repo]/[skill]`, `sitemap.xml.ts`, `llms.txt.ts`. URLs never have trailing slashes (`trailingSlash: 'never'` + `build.format: 'file'` — both are needed so static output serves `/discover` without a redirect, matching canonicals/sitemap).

### Middleware and caching (`src/middleware.ts`, `src/lib/cache.ts`)

Middleware creates a per-request anonymous Supabase client on `locals.supabase` for read-only catalog queries. Auth was removed, so it verifies no session and sets no `locals.user`; the client makes no auth calls, so no auth Set-Cookie can leak into a cached response.

Caching is opt-in: middleware defaults every response to `private, no-store`; SSR catalog pages set `PUBLIC_CATALOG_CACHE` (1h fresh + 1d stale-while-revalidate at the edge) **only on a successful 200**. Misses and loader failures must use `NO_STORE`/`notFound()` from `src/lib/cache.ts` so a bad response never sticks at the edge. Catalog changes therefore appear within ~1h without a redeploy.

### Two catalog worlds (`src/data/`)

- **Supabase-driven** (`skill-model/db.ts`): source of truth for Discover, `/s/**`, sitemap, llms.txt. Rows map to the shared `Collection`/`DirectorySkill`/`DirectoryEntry` shapes in `skill-model/types.ts` + `skill-model/index.ts`. Enum-ish columns store enum KEY strings ("Action", "Design") and are hand-edited in Supabase Studio, so mapping is defensive: unknown array values are dropped, rows with an unknown `kind` are skipped-and-logged — never surfaced as `undefined`.
- **Code-driven** (`featured-skills.ts` → `skills.ts`): the homepage showcase is an explicit hand-maintained allowlist, intentionally independent of the DB so the landing page can't break when the DB changes.

Both worlds render cards through the shared `toSkillCard` (`skill-card.ts`). Schema migrations live in `supabase/migrations/`.

### Discover filtering (`src/scripts/directory-engine.ts`)

The client-side directory engine is framework-free and **facet-agnostic**: it discovers facet groups from `data-*` attributes in the DOM. Adding a new filter field is a one-line data change in `FACET_REGISTRY` in `src/data/directory.ts` — never an engine change.

### Auth

None. User accounts, login, and Supabase auth were removed (the site is a read-only catalog). Supabase is used only for anonymous catalog reads.

### Analytics

Client-side PostHog is gated behind the cookie-consent banner (`CookieConsent.astro` + `PostHog.astro`). There is no server-side capture.

### Conventions

- Path alias `@/*` → `src/*`; TypeScript strict (`astro/tsconfigs/strict`).
- Tailwind v4 is wired through PostCSS (`postcss.config.mjs`), not the Vite plugin (incompatible with Astro's rolldown-vite). DaisyUI on top; theme tokens in `src/styles/globals.css`.
- `Astro.session` is unused and has no KV binding — first use will throw at runtime until a `SESSION` kv_namespace is added to `wrangler.jsonc`.
- `.agents/skills/` + `skills-lock.json` are installed marketing/SEO agent skills (content, not site code).
