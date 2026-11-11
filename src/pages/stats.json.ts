import type { APIRoute } from "astro";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_CATALOG_CACHE, NO_STORE } from "@/lib/cache";

// SSR for the same reason as sitemap.xml.ts: counts and the latest skill are
// read from Supabase per request and cached at the edge, so a newly live skill
// shows up without a redeploy. RLS already hides future days.
export const prerender = false;

/** Catalog "today" — same clock as public.surf_today() (Asia/Yerevan). */
const catalogToday = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const json = (body: unknown, status: number, cacheControl: string): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      // Public catalog counts. * keeps the shared edge cache intact; a
      // reflected origin would need Vary and split it. ephx.dev reads this
      // from the browser to refresh its video-count chip.
      "Access-Control-Allow-Origin": "*",
    },
  });

export const GET: APIRoute = async ({ site, locals }) => {
  const origin = site ?? "https://surfskills.surf";

  const [skillsRes, videosRes, collectionsRes, latestRes] = await Promise.all([
    locals.supabase.from("skills").select("id", { count: "exact", head: true }),
    locals.supabase
      .from("skills")
      .select("id", { count: "exact", head: true })
      .not("preview_video", "is", null),
    locals.supabase.from("collections").select("id", { count: "exact", head: true }),
    locals.supabase
      .from("skills")
      .select("id, name, day, preview_video")
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const failed = [skillsRes, videosRes, collectionsRes, latestRes].find((res) => res.error);
  if (failed?.error || skillsRes.count === null || videosRes.count === null || collectionsRes.count === null) {
    console.error("[stats.json] failed to load catalog", failed?.error);
    return json({ error: "catalog unavailable" }, 503, NO_STORE);
  }

  const row = latestRes.data;
  const latest = row
    ? {
        id: row.id,
        name: row.name,
        day: row.day,
        url: absoluteUrl(origin, `/s/${row.id}`),
        video: row.preview_video,
      }
    : null;

  return json(
    {
      today: catalogToday(),
      skills: skillsRes.count,
      collections: collectionsRes.count,
      videos: videosRes.count,
      latest,
    },
    200,
    PUBLIC_CATALOG_CACHE,
  );
};
