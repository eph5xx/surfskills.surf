import type { APIRoute } from "astro";
import { loadDirectory } from "@/data/skill-model/db";
import { absoluteUrl } from "@/lib/seo";
import { posts } from "@/data/blog";

// Static: prerendered at build time from the frozen catalog snapshot.
export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? "https://surfskills.surf";
  const link = (path: string, title: string, desc: string) =>
    `- [${title}](${absoluteUrl(origin, path)}): ${desc}`;

  const dir = await loadDirectory();
  const collectionLines = Object.values(dir.collectionsById)
    .map(({ collection: c }) => link(`/s/${c.id}`, c.name, c.shortDescription))
    .sort();
  const skillLines = Object.values(dir.skillsById)
    .map((s) => link(`/s/${s.id}`, s.name, s.description.short))
    .sort();

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
    },
  });
};
