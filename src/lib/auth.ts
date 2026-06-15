/** Cookie that carries the post-login destination through the magic-link
 *  email round trip (OAuth carries it in the callback query instead). */
export const NEXT_COOKIE = "auth-next";

/** Only allow same-site path redirects so login can't be used as an open
 *  redirect. The URL-parser probe is the load-bearing check: browsers
 *  normalize tricks like "/\\evil.com" and "//evil.com" to a foreign origin,
 *  and parsing against a sentinel base detects exactly what a browser
 *  would do with the Location header. */
export function sanitizeNext(
  raw: string | null | undefined,
  fallback = "/account",
): string {
  if (!raw || raw[0] !== "/" || raw.includes("\\")) return fallback;
  try {
    const probe = new URL(raw, "https://probe.invalid");
    if (probe.origin !== "https://probe.invalid") return fallback;
  } catch {
    return fallback;
  }
  return raw;
}
