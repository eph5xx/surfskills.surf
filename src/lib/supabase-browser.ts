import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** Singleton browser client — session lives in cookies shared with the
 *  server middleware, so islands and SSR pages agree on who's signed in.
 *
 *  Returns `null` when the public config is missing (e.g. a stale dev bundle
 *  built before .env existed). Callers must handle null rather than letting
 *  `createBrowserClient` throw — an uncaught throw during island hydration
 *  unmounts the whole island and wipes its server-rendered markup. */
export function supabaseBrowser(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createBrowserClient(url, key);
  return client;
}
