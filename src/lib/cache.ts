// Edge-cache policy for the public, DB-backed catalog pages (Discover, /s/**,
// sitemap). The catalog changes rarely, so we cache aggressively: fresh for an
// hour, then serve stale for up to a day while a single background request
// revalidates. A new skill therefore appears within ~1h with no redeploy; for
// instant updates, purge the Cloudflare cache on write (see the plan follow-ups).
//
// Tunable in one place. Pages apply it ONLY on a successful 200; misses (404) and
// loader failures must use NO_STORE so a bad/empty response never sticks at the edge.
export const PUBLIC_CATALOG_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const NO_STORE = "private, no-store";

/** Set the public catalog cache header on an Astro response. */
export const setCatalogCache = (headers: Headers): void => {
  headers.set("Cache-Control", PUBLIC_CATALOG_CACHE);
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
