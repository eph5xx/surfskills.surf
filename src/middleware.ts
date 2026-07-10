import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { defineMiddleware } from "astro:middleware";

// Public, edge-cacheable catalog pages (home, Discover, /s/**, sitemap). They
// read the catalog with the shared client but need no session, so we skip the
// auth round-trip — which also keeps auth-refresh Set-Cookie headers out of
// publicly cached responses — and let them set their OWN public Cache-Control
// (see src/lib/cache).
const isPublicCatalogRoute = (pathname: string): boolean =>
  pathname === "/" ||
  pathname === "/discover" ||
  pathname === "/sitemap.xml" ||
  pathname === "/llms.txt" ||
  pathname === "/s" ||
  pathname.startsWith("/s/");

export const onRequest = defineMiddleware(async (context, next) => {
  // Middleware also runs while prerendering static pages at build time, where
  // there is no live request or Cloudflare runtime — skip entirely.
  if (context.isPrerendered) return next();

  // Astro's internal image endpoint proxies static assets; it needs no
  // session and returns a fetch() passthrough whose headers are immutable.
  if (context.url.pathname.startsWith("/_image")) return next();

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              context.cookies.set(name, value, options);
            } catch {
              // Supabase's onAuthStateChange subscriber can fire a deferred
              // token-refresh write. If it lands after the response was fully
              // sent, Astro throws ResponseSentError — drop it; the browser
              // refreshes on the next request. (If the response was merely
              // consumed, Astro instead logs an uncatchable console.warn here;
              // that's harmless for the same reason.)
            }
          });
        },
      },
    },
  );

  context.locals.supabase = supabase;

  if (isPublicCatalogRoute(context.url.pathname)) {
    // No session needed; skip the getClaims() network call on cache misses.
    context.locals.user = null;
  } else {
    const { data, error } = await supabase.auth.getClaims();
    context.locals.user =
      !error && data?.claims
        ? {
            id: data.claims.sub,
            email: typeof data.claims.email === "string" ? data.claims.email : null,
          }
        : null;
  }

  const response = await next();
  // Session-dependent HTML must never land in a shared or browser cache. Catalog
  // pages opt INTO caching by setting their own public Cache-Control; everything
  // else (account, api, auth) sets nothing and falls back to no-store here.
  // Passthrough responses (e.g. proxied fetches) carry immutable headers — re-wrap
  // those instead of crashing the request.
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
