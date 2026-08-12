# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

[surfskills.surf](https://surfskills.surf) — a curated directory of open-source AI agent skills. Astro 5 site deployed to Cloudflare Workers. The catalog is a frozen build-time snapshot (no database at runtime); PostHog handles analytics.

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

- `.env` (from `.env.example`): `PUBLIC_*` build-time values, inlined by Vite, read via `import.meta.env`. PostHog key/host.
- `.dev.vars` (from `.dev.vars.example`): runtime secrets, read via `Astro.locals.runtime.env` (typed in `src/env.d.ts`). Production uses `wrangler secret put` + `wrangler.jsonc` vars.

## Architecture

### Rendering model: static by default, SSR opt-in

`astro.config.mjs` keeps `output: 'static'`; marketing/blog/legal pages **and the whole catalog** prerender. The catalog is a frozen build-time snapshot (content collections), so `/discover`, `/s/[owner]/[repo]`, `/s/[owner]/[repo]/[skill]`, `sitemap.xml.ts`, and `llms.txt.ts` are all `prerender = true` — the dynamic `/s/**` routes enumerate every path via `getStaticPaths` from the snapshot. The homepage (`index.astro`) is the lone remaining `prerender = false` route. URLs never have trailing slashes (`trailingSlash: 'never'` + `build.format: 'file'` — both are needed so static output serves `/discover` without a redirect, matching canonicals/sitemap).

### Middleware and caching (`src/middleware.ts`, `src/lib/cache.ts`)

The catalog is prerendered, so middleware no longer creates any per-request client — it exists only for the on-demand homepage. It skips prerendered requests and `/_image`, then defaults any response without an explicit `Cache-Control` to `private, no-store`.

`src/lib/cache.ts` still backs the on-demand routes: the homepage sets `PUBLIC_CATALOG_CACHE` (1h fresh + 1d stale-while-revalidate at the edge) via `setCatalogCache`, and `notFoundPage`/`NO_STORE` serve the 404 path. The prerendered catalog is served as static assets by Cloudflare (see `dist/_routes.json` `exclude`), not through the worker.

### Two catalog worlds (`src/data/`)

- **Snapshot-driven** (`skill-model/db.ts`): source of truth for Discover, `/s/**`, sitemap, llms.txt. Data is a frozen build-time snapshot in two content collections (`src/data/catalog/{collections,skills}.json`, defined in `src/content.config.ts`); `db.ts` loads them with `getCollection`, re-sorts skills to the old DB order (`sort_order` asc nulls-last, then `created_at` desc), and maps rows to the shared `Collection`/`DirectorySkill`/`DirectoryEntry` shapes in `skill-model/types.ts` + `skill-model/index.ts`. Enum-ish columns store enum KEY strings ("Action", "Design"); mapping stays defensive: unknown array values are dropped, rows with an unknown `kind` are skipped-and-logged — never surfaced as `undefined`. To refresh the snapshot, re-export the two tables into those JSON files.
- **Code-driven** (`featured-skills.ts` → `skills.ts`): the homepage showcase is an explicit hand-maintained allowlist, intentionally independent of the catalog so the landing page can't break when the data changes.

Both worlds render cards through the shared `toSkillCard` (`skill-card.ts`). The historical Supabase schema still lives in `supabase/migrations/` (unused at runtime).

### Discover filtering (`src/scripts/directory-engine.ts`)

The client-side directory engine is framework-free and **facet-agnostic**: it discovers facet groups from `data-*` attributes in the DOM. Adding a new filter field is a one-line data change in `FACET_REGISTRY` in `src/data/directory.ts` — never an engine change.

### Auth

None. User accounts, login, and Supabase were removed entirely (the site is a read-only catalog). There is no database at runtime — the catalog is a frozen static snapshot.

### Analytics

Client-side PostHog is gated behind the cookie-consent banner (`CookieConsent.astro` + `PostHog.astro`). There is no server-side capture.

### Conventions

- Path alias `@/*` → `src/*`; TypeScript strict (`astro/tsconfigs/strict`).
- Tailwind v4 is wired through PostCSS (`postcss.config.mjs`), not the Vite plugin (incompatible with Astro's rolldown-vite). DaisyUI on top; theme tokens in `src/styles/globals.css`.
- `Astro.session` is unused and has no KV binding — first use will throw at runtime until a `SESSION` kv_namespace is added to `wrangler.jsonc`.
- `.agents/skills/` + `skills-lock.json` are installed marketing/SEO agent skills (content, not site code).
