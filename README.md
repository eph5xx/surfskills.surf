# surfskills.surf

A directory of verified AI coding skills, each shown actually working. Marketing
site + gated skill downloads.

## Stack

- **[Astro 5](https://astro.build)** — marketing pages prerender; auth, billing,
  and skill pages render on demand (SSR via inline scripts where needed).
- **Tailwind + DaisyUI** for styling.
- **Cloudflare** (Workers) via `@astrojs/cloudflare` — deploy target.
- **Supabase** — auth.
- **Polar** — subscriptions and entitlement checks.

## Local development

```bash
npm install
cp .env.example .env             # public Supabase config
cp .dev.vars.example .dev.vars   # secret keys (Supabase, Polar) — never commit
npm run dev                      # astro dev
```

`npm run preview` builds and serves through `wrangler dev` (closest to prod).

## Adding a skill (no deploy needed)

The catalog is data, not code: skill rows live in Supabase and are read per
request by the SSR pages (`/discover`, `/s/**`), and media lives in the
`surfskills-media` R2 bucket, served from `https://media.surfskills.surf`
(Cloudflare CDN in front, free egress). Adding a skill is two steps:

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

The new skill appears on `/discover` and gets its `/s/**` page immediately.
Exception: the homepage showcase is an explicit code-driven allowlist
(`src/data/featured-skills.ts`) — featuring a skill there is a code change and
deploy by design.
