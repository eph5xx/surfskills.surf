import type { APIRoute } from "astro";
import { loadDirectory } from "@/data/skill-model/db";
import { absoluteUrl } from "@/lib/seo";
import { posts } from "@/data/blog";

// Static: prerendered at build time from the frozen catalog snapshot.
export const prerender = true;

const STATIC_PATHS = [
  "/",
  "/discover",
  "/blog",
  "/terms",
  "/privacy",
  "/cookies",
];

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? "https://surfskills.surf";

  const dir = await loadDirectory();
  const catalogPaths = [
    ...Object.keys(dir.collectionsById).map((id) => `/s/${id}`),
    ...Object.keys(dir.skillsById).map((id) => `/s/${id}`),
  ];

  const urls = [...STATIC_PATHS, ...posts.map((post) => post.href), ...catalogPaths]
    .map((path) => absoluteUrl(origin, path))
    .sort()
    .map((loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
