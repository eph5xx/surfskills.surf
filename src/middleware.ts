import { createClient } from "@supabase/supabase-js";
import { defineMiddleware } from "astro:middleware";
import { EDGE_CATALOG_CACHE, NO_STORE } from "@/lib/cache";

/** Copy a response so its headers are mutable (passthrough/cached ones are not). */
const mutable = (response: Response): Response => new Response(response.body, response);

export const onRequest = defineMiddleware(async (context, next) => {
  // Middleware also runs while prerendering static pages at build time, where
  // there is no live request or Cloudflare runtime — skip entirely.
  if (context.isPrerendered) return next();

  // Astro's internal image endpoint proxies static assets; it needs no
  // client and returns a fetch() passthrough whose headers are immutable.
  if (context.url.pathname.startsWith("/_image")) return next();

  // Real edge cache (see EDGE_CATALOG_CACHE in src/lib/cache.ts). The Worker runs
  // before Cloudflare's CDN cache, so we use the Cache API ourselves. The key
  // drops the query string: no SSR page reads query params, so `?x=` must not
  // bypass the cache. Any cache failure falls back to rendering normally.
  const runtime = context.locals.runtime;
  const isGet = context.request.method === "GET";
  const cacheKey = context.url.origin + context.url.pathname;
  // Workers' Cache API uses its own Request/Response types; it takes the
  // standard ones at runtime, so view it through the standard Cache interface.
  const edgeCache = runtime.caches.default as unknown as Cache;
  if (isGet) {
    try {
      const hit = await edgeCache.match(cacheKey);
      if (hit) {
        const response = mutable(hit);
        response.headers.set("X-Edge-Cache", "HIT");
        return response;
      }
    } catch (err) {
      console.error("[edge-cache] match failed", err);
    }
  }

  // Per-request Supabase client for the catalog (Discover, /s/**, sitemap,
  // llms.txt, stats.json). There is no auth, so this is an anonymous, read-only client with
  // session handling off: it never reads or writes cookies, so nothing
  // user-specific can leak into an edge-cached response.
  context.locals.supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const response = await next();

  // Pages opt into the edge cache by setting EDGE_CATALOG_CACHE on a 200.
  // Errors, 404s and every other page are never stored.
  if (
    isGet &&
    response.status === 200 &&
    response.headers.get("Cache-Control") === EDGE_CATALOG_CACHE
  ) {
    const cacheable = mutable(response);
    try {
      runtime.ctx.waitUntil(
        edgeCache.put(cacheKey, cacheable.clone()).catch((err: unknown) => {
          console.error("[edge-cache] put failed", err);
        }),
      );
    } catch (err) {
      console.error("[edge-cache] put failed", err);
    }
    cacheable.headers.set("X-Edge-Cache", "MISS");
    return cacheable;
  }

  // Catalog pages opt INTO edge caching by setting their own public
  // Cache-Control; everything else sets nothing and falls back to no-store
  // here. Passthrough responses (e.g. proxied fetches) carry immutable headers
  // — re-wrap those instead of crashing the request.
  if (response.headers.has("Cache-Control")) return response;
  try {
    response.headers.set("Cache-Control", NO_STORE);
    return response;
  } catch {
    const rewrapped = mutable(response);
    rewrapped.headers.set("Cache-Control", NO_STORE);
    return rewrapped;
  }
});
