<p align="center">
  <img src="public/sunny-mark.svg" alt="Surf Skills mascot" width="72">
</p>

<h1 align="center">Surf Skills</h1>

<p align="center">
  A curated directory of open-source AI agent skills — each one shown actually working.
</p>

<p align="center">
  <a href="https://surfskills.surf"><img src="https://img.shields.io/badge/surfskills.surf-live-DD6B4D" alt="surfskills.surf"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2A2C41" alt="MIT license"></a>
</p>

https://github.com/user-attachments/assets/a37493f8-572c-42f3-b988-16033ece267d

## What this is

Skill marketplaces show you a name and a description; Surf Skills shows you the output. Every skill in the directory has a preview of what it actually makes, so you can judge it before installing. Skills are open source and work with the agent you already use — Claude, ChatGPT, Cursor.

## Tech stack

- [Astro 5](https://astro.build) — static by default, per-route SSR for catalog pages
- [Cloudflare Workers](https://workers.cloudflare.com) — hosting and edge caching
- [Supabase](https://supabase.com) — catalog data
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — skill media
- [Tailwind CSS v4](https://tailwindcss.com) + [DaisyUI](https://daisyui.com)
- [PostHog](https://posthog.com) — analytics

## Quick start

```bash
npm install
cp .env.example .env             # public config
cp .dev.vars.example .dev.vars   # secret keys — never commit
npm run dev
```

`.env` holds public build-time values (Supabase URL, PostHog key) that Vite inlines into the bundle. `.dev.vars` holds runtime secrets that only exist inside the Worker; in production they are set with `wrangler secret put`.

## Project structure

```
src/
  pages/          routes; marketing pages prerender, DB-backed pages opt into SSR
  data/           catalog models: Supabase-driven directory + hand-picked homepage showcase
  lib/            edge caching and SEO helpers
  scripts/        client-side code, including the Discover filtering engine
  middleware.ts   per-request anonymous Supabase client and cache defaults
supabase/
  migrations/     database schema
```

## Adding a skill (no deploy needed)

The catalog is data, not code: skill rows live in Supabase and are read per
request by the SSR pages (`/discover`, `/s/**`, sitemap, llms.txt), and media
lives in the `surfskills-media` R2 bucket, served from
`https://media.surfskills.surf` (Cloudflare CDN in front, free egress). Adding a
skill is two steps:

1. **Upload media** (demo video + optional poster image):

   ```bash
   npx wrangler r2 object put surfskills-media/skills/<skill>-demo.mp4 \
     --file <local>.mp4 --content-type video/mp4 \
     --cache-control "public, max-age=31536000, immutable" --remote
   npx wrangler r2 object put surfskills-media/skills/<skill>-demo.jpg \
     --file <local>.jpg --content-type image/jpeg \
     --cache-control "public, max-age=31536000, immutable" --remote
   ```

   (`--remote` is required — without it wrangler writes to local dev storage.)
   Treat filenames as immutable: objects are CDN-cached for a year, so to
   replace a video upload it under a new name (e.g. `-v2`) and update the row.

2. **Insert the row** in Supabase (Studio table editor or SQL) with the full
   URLs, e.g. `preview_video = https://media.surfskills.surf/skills/<skill>-demo.mp4`.

Catalog pages are edge-cached for an hour, so the new skill appears on
`/discover` and gets its `/s/**` page within ~1h. Exception: the homepage
showcase is an explicit code-driven allowlist (`src/data/featured-skills.ts`) —
featuring a skill there is a code change and deploy by design.

## License

[MIT](LICENSE)

### Third-party assets

The logos in `public/logos/` and the website screenshots in `public/blog/` belong to their respective owners. They are used nominatively/editorially to identify the tools and sites they depict, and are not covered by the MIT license.
