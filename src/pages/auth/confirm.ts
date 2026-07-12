import type { APIRoute } from "astro";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NEXT_COOKIE, sanitizeNext } from "@/lib/auth";
import { captureEvent, identifyPerson } from "@/lib/posthog-server";

export const prerender = false;

async function trackSignIn(locals: App.Locals, method: "magic_link" | "oauth") {
  const {
    data: { user },
  } = await locals.supabase.auth.getUser();
  if (!user) return;
  captureEvent(locals, user.id, "sign_in_completed", { method });
  identifyPerson(locals, user.id, { email: user.email ?? undefined });
}

// Magic-link landing. Handles both email-template shapes:
//  - customized template: ?token_hash=...&type=email (verified here, server-side)
//  - default template:    Supabase verifies first, then redirects here with ?code=
export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
  const next = sanitizeNext(cookies.get(NEXT_COOKIE)?.value);
  cookies.delete(NEXT_COOKIE, { path: "/" });

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return redirect("/login?error=expired", 303);
    await trackSignIn(locals, "magic_link");
    return redirect(next, 303);
  }

  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect("/login?error=expired", 303);
    await trackSignIn(locals, "magic_link");
    return redirect(next, 303);
  }

  return redirect("/login?error=email", 303);
};
