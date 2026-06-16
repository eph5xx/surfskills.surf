// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the
// @tailwindcss/vite plugin, which is not yet compatible with Astro 6's
// rolldown-vite resolver.
// https://astro.build/config
export default defineConfig({
  // Output stays 'static': marketing pages prerender; auth/billing/skill pages
  // opt into SSR individually with `export const prerender = false`.
  adapter: cloudflare({
    // Makes wrangler.jsonc bindings and .dev.vars secrets available on
    // Astro.locals.runtime.env during `astro dev`.
    platformProxy: { enabled: true },
  }),
});
