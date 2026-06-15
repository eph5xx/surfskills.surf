# surfskills.surf

A directory of verified AI coding skills, each shown actually working. Marketing
site + gated skill downloads.

## Stack

- **[Astro 5](https://astro.build)** with React islands — marketing pages
  prerender; auth, billing, and skill pages render on demand.
- **Tailwind + DaisyUI** for styling.
- **Cloudflare** (Pages/Workers) via `@astrojs/cloudflare` — deploy target.
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
