import type { APIRoute } from "astro";
import { loadDirectory } from "@/data/skill-model/db";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_CATALOG_CACHE, NO_STORE } from "@/lib/cache";
import { posts } from "@/data/blog";

// SSR for the same reason as sitemap.xml.ts: the catalog half is read from
// Supabase per request and cached at the edge, so new skills/collections show
// up without a redeploy.
export const prerender = false;

export const GET: APIRoute = async ({ site, locals }) => {
  const origin = site ?? "https://surfskills.surf";
  const link = (path: string, title: string, desc: string) =>
    `- [${title}](${absoluteUrl(origin, path)}): ${desc}`;

  let collectionLines: string[] = [];
  let skillLines: string[] = [];
  let cacheControl = PUBLIC_CATALOG_CACHE;
  try {
    const dir = await loadDirectory(locals.supabase);
    collectionLines = Object.values(dir.collectionsById)
      .map(({ collection: c }) => link(`/s/${c.id}`, c.name, c.shortDescription))
      .sort();
    skillLines = Object.values(dir.skillsById)
      .map((s) => link(`/s/${s.id}`, s.name, s.description.short))
      .sort();
  } catch (err) {
    console.error("[llms.txt] failed to load catalog", err);
    cacheControl = NO_STORE; // serve the static sections but don't cache a partial file
  }

  const blogLines = posts.map((post) => link(post.href, post.title, post.blurb));

  const body = [
    "# surfskills",
    "",
    "> A categorized directory of open-source AI agent skills. Preview what each one does, then open the source in one click.",
    "",
    "## Skill collections",
    "",
    ...collectionLines,
    "",
    "## Skills",
    "",
    ...skillLines,
    "",
    "## Blog",
    "",
    ...blogLines,
    "",
    "## Other",
    "",
    link("/discover", "Discover", "browse and search all skills"),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
};
