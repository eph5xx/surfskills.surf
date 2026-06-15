import type { APIRoute } from "astro";
import { NEXT_COOKIE, sanitizeNext } from "@/lib/auth";

export const prerender = false;

const OAUTH_PROVIDERS = ["google", "github"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const POST: APIRoute = async ({ request, locals, url, cookies, redirect }) => {
  const form = await request.formData();
  const provider = form.get("provider")?.toString() ?? "";
  const next = sanitizeNext(form.get("next")?.toString());

  if ((OAUTH_PROVIDERS as readonly string[]).includes(provider)) {
    const { data, error } = await locals.supabase.auth.signInWithOAuth({
      provider: provider as OAuthProvider,
      options: {
        redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error || !data.url) return redirect("/login?error=oauth", 303);
    return redirect(data.url, 303);
  }

  if (provider === "email") {
    const email = form.get("email")?.toString().trim() ?? "";
    if (!email) return redirect("/login?error=email", 303);

    // The destination can't ride the email link's query string (the template
    // appends its own), so park it in a short-lived cookie until /auth/confirm.
    cookies.set(NEXT_COOKIE, next, {
      path: "/",
      maxAge: 60 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
    });

    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${url.origin}/auth/confirm` },
    });
    if (error) return redirect("/login?error=email", 303);
    return redirect("/login?sent=1", 303);
  }

  return redirect("/login?error=unknown", 303);
};
