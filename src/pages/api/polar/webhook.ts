import type { APIRoute } from "astro";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createAdminClient } from "@/lib/supabase-admin";

export const prerender = false;

// Structural type for the slice of Polar's Subscription payload we store —
// every subscription.* event carries the full subscription object.
interface SubscriptionPayload {
  id: string;
  status: string;
  customerId: string;
  productId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string | null;
  createdAt: Date | string;
  modifiedAt: Date | string | null;
  customer: { externalId?: string | null };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  // Raw body BEFORE any parsing — signature is over the exact bytes.
  const body = await request.text();

  let event: { type: string; data: unknown };
  try {
    event = validateEvent(
      body,
      Object.fromEntries(request.headers.entries()),
      env.POLAR_WEBHOOK_SECRET,
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response("invalid signature", { status: 403 });
    }
    throw error;
  }

  // Every subscription.* event (created/updated/active/canceled/uncanceled/
  // revoked) is treated the same way: upsert the latest state. Idempotent and
  // tolerant of Polar's event granularity changing under us.
  if (event.type.startsWith("subscription.")) {
    const sub = event.data as SubscriptionPayload;
    const userId = sub.customer?.externalId;

    // No externalId → checkout didn't originate from our /api/checkout
    // (e.g. a manual sandbox test from the dashboard). Nothing to attach to.
    if (userId) {
      const admin = createAdminClient(env);
      const eventTime = new Date(sub.modifiedAt ?? sub.createdAt).toISOString();

      // Polar delivers at-least-once with retries spread over hours: a stale
      // retried "active" arriving after "revoked" would silently re-grant Pro
      // forever, and a delayed "revoked" for an old subscription would lock
      // out a paying re-subscriber. Never overwrite newer state with older.
      const { data: existing } = await admin
        .from("subscriptions")
        .select("polar_modified_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing?.polar_modified_at && eventTime < existing.polar_modified_at) {
        return new Response(null, { status: 202 });
      }

      const plan =
        sub.productId === env.POLAR_PRODUCT_ID_YEARLY
          ? "yearly"
          : sub.productId === env.POLAR_PRODUCT_ID_MONTHLY
            ? "monthly"
            : null;

      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          polar_customer_id: sub.customerId,
          polar_subscription_id: sub.id,
          polar_product_id: sub.productId,
          plan,
          status: sub.status,
          cancel_at_period_end: !!sub.cancelAtPeriodEnd,
          current_period_end: sub.currentPeriodEnd
            ? new Date(sub.currentPeriodEnd).toISOString()
            : null,
          polar_modified_at: eventTime,
        },
        { onConflict: "user_id" },
      );
      if (error) {
        // Unique violation (23505) means this subscription id is already
        // recorded under a different user — a poisoned delivery that will
        // never succeed. Ack it so Polar doesn't retry forever.
        if (error.code === "23505") {
          console.error("polar webhook: subscription id conflict", sub.id, userId);
          return new Response(null, { status: 202 });
        }
        // Other DB failures → 5xx so Polar retries with backoff.
        return new Response("db write failed", { status: 500 });
      }
    }
  }

  return new Response(null, { status: 202 });
};
