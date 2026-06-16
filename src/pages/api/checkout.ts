import type { APIRoute } from "astro";
import { sanitizeNext } from "@/lib/auth";
import { captureEvent } from "@/lib/posthog-server";
import { polarClient } from "@/lib/polar";
import { getSubscription, hasActiveSub } from "@/lib/subscription";

export const prerender = false;

// Sends a logged-in user to Polar checkout. Both products are passed so the
// customer can toggle monthly/yearly inside checkout; ?plan= picks the default.
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  if (!locals.user) {
    return redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, 303);
  }

  // The static pricing page links here for everyone — never start a second
  // checkout for someone who already has a sub. past_due belongs in the
  // portal (fix the card), not in a fresh purchase.
  const sub = await getSubscription(locals);
  if (hasActiveSub(sub) || sub?.status === "past_due") {
    return redirect("/account", 303);
  }

  const env = locals.runtime.env;
  const monthlyFirst = [env.POLAR_PRODUCT_ID_MONTHLY, env.POLAR_PRODUCT_ID_YEARLY];
  const products =
    url.searchParams.get("plan") === "yearly" ? monthlyFirst.toReversed() : monthlyFirst;

  // Preserve where the buyer was headed (e.g. a skill download) across the
  // Polar round trip — /account offers it back once the sub is active.
  const next = sanitizeNext(url.searchParams.get("next"), "");
  const plan = url.searchParams.get("plan") === "yearly" ? "yearly" : "monthly";
  const successUrl =
    `${url.origin}/account?checkout_id={CHECKOUT_ID}` +
    (next ? `&next=${encodeURIComponent(next)}` : "");

  try {
    const checkout = await polarClient(env).checkouts.create({
      products,
      successUrl,
      // The join key: webhooks come back with customer.externalId set to the
      // Supabase user UUID, so subscription state lands on the right row.
      externalCustomerId: locals.user.id,
      customerEmail: locals.user.email ?? undefined,
    });
    captureEvent(env, locals.user.id, "checkout_started", { plan, next });
    return redirect(checkout.url, 303);
  } catch {
    return redirect("/account?error=checkout", 303);
  }
};
