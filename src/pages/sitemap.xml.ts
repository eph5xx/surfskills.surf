import type { APIRoute } from "astro";
import { loadDirectory } from "@/data/skill-model/db";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_CATALOG_CACHE, NO_STORE } from "@/lib/cache";

// SSR (was prerendered): the catalog half of the sitemap is read from Supabase per
// request and cached at the edge, so newly added skills/collections show up in the
// sitemap without a redeploy.
export const prerender = false;

const STATIC_PATHS = [
  "/",
  "/discover",
  "/blog",
  "/blog/tweak-idea",
  "/terms",
  "/privacy",
  "/cookies",
];

export const GET: APIRoute = async ({ site, locals }) => {
  const origin = site ?? "https://surfskills.surf";

  let catalogPaths: string[] = [];
  let cacheControl = PUBLIC_CATALOG_CACHE;
  try {
    const dir = await loadDirectory(locals.supabase);
    catalogPaths = [
      ...Object.keys(dir.collectionsById).map((id) => `/s/${id}`),
      ...Object.keys(dir.skillsById).map((id) => `/s/${id}`),
    ];
  } catch (err) {
    console.error("[sitemap] failed to load catalog", err);
    cacheControl = NO_STORE; // serve the static paths but don't cache a partial sitemap
  }

  const urls = [...STATIC_PATHS, ...catalogPaths]
    .map((path) => absoluteUrl(origin, path))
    .sort()
    .map((loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
};
