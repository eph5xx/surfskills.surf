// Cache policy for the public, DB-backed catalog pages.
//
// On Cloudflare Workers the Worker runs BEFORE the CDN cache, so a Cache-Control
// header alone never makes Cloudflare store a Worker response. Two policies:
//
// - PUBLIC_CATALOG_CACHE: a hint for browsers and downstream caches only. Every
//   request still runs the page and queries Supabase.
// - EDGE_CATALOG_CACHE: the middleware stores the response in Cloudflare's Cache
//   API (per data center) and serves it from there for 10 minutes, so Supabase is
//   asked at most once per 10 min per location. The Cache API has no
//   stale-while-revalidate, so none is set.
//
// Pages apply either ONLY on a successful 200; misses (404) and loader failures
// must use NO_STORE so a bad/empty response never sticks at the edge.
export const PUBLIC_CATALOG_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

/** Stored at the edge by the middleware (see top comment). Opt-in per page. */
export const EDGE_CATALOG_CACHE = "public, s-maxage=600";

export const NO_STORE = "private, no-store";

/** Set the public catalog cache header on an Astro response. */
export const setCatalogCache = (headers: Headers): void => {
  headers.set("Cache-Control", PUBLIC_CATALOG_CACHE);
};

/** Opt a successful response into the middleware's real edge cache. */
export const setEdgeCatalogCache = (headers: Headers): void => {
  headers.set("Cache-Control", EDGE_CATALOG_CACHE);
};

/** Re-wrap a rendered/fetched 404 body as a real 404 that is never cached,
 *  so a bad id can't get a public 200 stuck at the edge. */
export const notFound = (rendered: Response): Response => {
  const headers = new Headers(rendered.headers);
  headers.set("Cache-Control", NO_STORE);
  return new Response(rendered.body, { status: 404, statusText: "Not Found", headers });
};

/** 404 for an SSR catalog miss: serve the built static 404 page via the ASSETS
 *  binding (Astro.rewrite can't reach a prerendered page from SSR — it 500s).
 *  Falls back to a minimal body if the asset fetch fails (e.g. astro dev). */
export const notFoundPage = async (locals: App.Locals): Promise<Response> => {
  try {
    const asset = await locals.runtime.env.ASSETS.fetch("https://assets.local/404");
    if (asset.ok) return notFound(asset);
  } catch {
    /* fall through to the minimal body */
  }
  return new Response("Not Found", {
    status: 404,
    headers: { "Cache-Control": NO_STORE },
  });
};
