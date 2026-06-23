// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the
// @tailwindcss/vite plugin, which is not yet compatible with Astro 6's
// rolldown-vite resolver.
// https://astro.build/config
export default defineConfig({
  site: 'https://surfskills.surf',
  // No trailing slash anywhere. On Cloudflare Pages `trailingSlash` alone only affects
  // dev/SSR — `build.format: 'file'` is what makes the static output serve `/discover`
  // (from discover.html) with no redirect, matching our canonical + sitemap (no slash).
  trailingSlash: 'never',
  build: { format: 'file' },
  // Output stays 'static': marketing + skill/collection pages prerender; auth/billing
  // pages opt into SSR individually with `export const prerender = false`.
  adapter: cloudflare({
    // Makes wrangler.jsonc bindings and .dev.vars secrets available on
    // Astro.locals.runtime.env during `astro dev`.
    platformProxy: { enabled: true },
  }),
});
