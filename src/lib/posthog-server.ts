const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/i/v0/e/";

/** Fire-and-forget PostHog capture — never throws; analytics must not break requests. */
export function captureEvent(
  locals: App.Locals,
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const { env, ctx } = locals.runtime;
  if (!env.POSTHOG_API_KEY) return;
  // waitUntil keeps the Worker alive until the capture lands — an unawaited
  // fetch is cancelled the moment the handler returns its Response.
  ctx.waitUntil(
    fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties,
      }),
    }).catch(() => {}),
  );
}

/** Update person properties server-side (links billing state to the Supabase UUID). */
export function identifyPerson(
  locals: App.Locals,
  distinctId: string,
  set: Record<string, unknown>,
): void {
  const { env, ctx } = locals.runtime;
  if (!env.POSTHOG_API_KEY) return;
  ctx.waitUntil(
    fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.POSTHOG_API_KEY,
        event: "$identify",
        distinct_id: distinctId,
        properties: { $set: set },
      }),
    }).catch(() => {}),
  );
}
