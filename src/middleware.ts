import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // Middleware also runs while prerendering static pages at build time, where
  // there is no live request or Cloudflare runtime — skip entirely.
  if (context.isPrerendered) return next();

  // Astro's internal image endpoint proxies static assets; it needs no
  // client and returns a fetch() passthrough whose headers are immutable.
  if (context.url.pathname.startsWith("/_image")) return next();

  // Per-request Supabase client for the catalog (Discover, /s/**, sitemap,
  // llms.txt). Auth was removed, so this is an anonymous, read-only client: it
  // never establishes a session, so no auth Set-Cookie ever lands here.
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get("Cookie") ?? "").map(
            ({ name, value }) => ({ name, value: value ?? "" }),
          );
        },
        setAll() {
          // Anonymous read-only client: it makes no auth calls, so Supabase
          // never asks to write a session cookie. Nothing to persist.
        },
      },
    },
  );

  context.locals.supabase = supabase;

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
