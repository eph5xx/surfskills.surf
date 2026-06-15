import type { APIRoute } from "astro";
import { polarClient } from "@/lib/polar";

export const prerender = false;

// Self-serve billing: cancel/uncancel, payment method, invoices. The session
// is created by external customer ID (= Supabase user UUID), so no local
// customer-id bookkeeping is needed.
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  if (!locals.user) {
    return redirect("/login?next=%2Faccount", 303);
  }

  try {
    const session = await polarClient(locals.runtime.env).customerSessions.create({
      externalCustomerId: locals.user.id,
      returnUrl: `${url.origin}/account`,
    });
    return redirect(session.customerPortalUrl, 303);
  } catch {
    // No Polar customer yet (never checked out) or API hiccup.
    return redirect("/account?error=portal", 303);
  }
};
