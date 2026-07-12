import type { APIRoute } from "astro";
import { sanitizeNext } from "@/lib/auth";
import { captureEvent, identifyPerson } from "@/lib/posthog-server";

export const prerender = false;

// OAuth (PKCE) landing: Supabase redirects here with ?code= after the
// provider round trip; exchange it for a session cookie and move on.
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));

  if (!code) return redirect("/login?error=oauth", 303);

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect("/login?error=oauth", 303);

  const {
    data: { user },
  } = await locals.supabase.auth.getUser();
  if (user) {
    captureEvent(locals, user.id, "sign_in_completed", { method: "oauth" });
    identifyPerson(locals, user.id, { email: user.email ?? undefined });
  }

  return redirect(next, 303);
};
