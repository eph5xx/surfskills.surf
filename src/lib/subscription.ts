export interface Subscription {
  user_id: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  polar_product_id: string | null;
  plan: "monthly" | "yearly" | null;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  polar_modified_at: string | null;
}

/** The signed-in user's subscription row, read under their own JWT — RLS
 *  guarantees they can only ever see their own. Null when signed out or
 *  never subscribed. */
export async function getSubscription(locals: App.Locals): Promise<Subscription | null> {
  if (!locals.user) return null;
  const { data } = await locals.supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", locals.user.id)
    .maybeSingle();
  return (data as Subscription | null) ?? null;
}

/** "Has Pro" — Polar keeps status 'active' (with cancel_at_period_end set)
 *  until the period actually ends, so cancel-keeps-access needs no extra logic. */
export function hasActiveSub(sub: Subscription | null): boolean {
  return sub !== null && (sub.status === "active" || sub.status === "trialing");
}
