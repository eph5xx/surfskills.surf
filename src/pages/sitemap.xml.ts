import type { APIRoute } from "astro";
import {
  directoryCollections,
  directorySkills,
} from "@/data/skill-model";
import { absoluteUrl } from "@/lib/seo";

export const prerender = true;

const STATIC_PATHS = [
  "/",
  "/discover",
  "/pricing",
  "/blog",
  "/blog/tweak-idea",
  "/terms",
  "/privacy",
  "/cookies",
];

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? "https://surfskills.surf";

  const paths = [
    ...STATIC_PATHS,
    ...directoryCollections.map((c) => `/s/${c.id}`),
    ...directorySkills.map((s) => `/s/${s.id}`),
  ];

  const urls = paths
    .map((path) => absoluteUrl(origin, path))
    .sort()
    .map(
      (loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
