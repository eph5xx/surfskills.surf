import { createClient } from "@supabase/supabase-js";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // Middleware also runs while prerendering static pages at build time, where
  // there is no live request or Cloudflare runtime — skip entirely.
  if (context.isPrerendered) return next();

  // Astro's internal image endpoint proxies static assets; it needs no
  // client and returns a fetch() passthrough whose headers are immutable.
  if (context.url.pathname.startsWith("/_image")) return next();

  // Per-request Supabase client for the catalog (Discover, /s/**, sitemap,
  // llms.txt). There is no auth, so this is an anonymous, read-only client with
  // session handling off: it never reads or writes cookies, so nothing
  // user-specific can leak into an edge-cached response.
  context.locals.supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const response = await next();
  // Catalog pages opt INTO edge caching by setting their own public
  // Cache-Control; everything else sets nothing and falls back to no-store
  // here. Passthrough responses (e.g. proxied fetches) carry immutable headers
  // — re-wrap those instead of crashing the request.
  if (response.headers.has("Cache-Control")) return response;
  try {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    const rewrapped = new Response(response.body, response);
    rewrapped.headers.set("Cache-Control", "private, no-store");
    return rewrapped;
  }
});
