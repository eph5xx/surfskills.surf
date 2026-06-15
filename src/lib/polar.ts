import { Polar } from "@polar-sh/sdk";

/** Instantiated per request from locals.runtime.env — Workers bindings are
 *  request-scoped, so a module-level client would capture a stale env. */
export function polarClient(env: Env): Polar {
  return new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
}
