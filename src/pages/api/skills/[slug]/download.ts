import type { APIRoute } from "astro";
import { skills } from "@/data/skills";
import { captureEvent } from "@/lib/posthog-server";
import { getSubscription, hasActiveSub } from "@/lib/subscription";

export const prerender = false;

// The enforcement point for skill contents. One URL for every button state:
// anon → login (and back here), no sub → checkout, entitled → the file.
const sources = import.meta.glob("/src/data/skill-details/*/source-snapshot.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const GET: APIRoute = async ({ params, locals, url, redirect }) => {
  const slug = params.slug ?? "";
  const skill = skills.find((s) => s.slug === slug);
  const raw = sources[`/src/data/skill-details/${slug}/source-snapshot.md`];
  if (!skill || !raw) return new Response("Not found", { status: 404 });

  // Free skills need an account (the free tier), paid skills need Pro.
  if (!locals.user) {
    return redirect(`/login?next=${encodeURIComponent(url.pathname)}`, 303);
  }
  if (!skill.free && !hasActiveSub(await getSubscription(locals))) {
    // Carry the download intent through checkout so /account can hand over
    // the file the moment the subscription lands.
    return redirect(`/api/checkout?plan=monthly&next=${encodeURIComponent(url.pathname)}`, 303);
  }

  captureEvent(locals.runtime.env, locals.user.id, "skill_downloaded", {
    skill_slug: slug,
    free: skill.free,
    category: skill.category,
  });

  return new Response(raw, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
};
