import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Secret-key client — bypasses RLS. Only the Polar webhook handler may use
 *  it, and only instantiated per request (Workers env is request-scoped). */
export function createAdminClient(env: Env): SupabaseClient {
  return createClient(import.meta.env.PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
