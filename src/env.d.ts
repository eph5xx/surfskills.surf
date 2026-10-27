/// <reference types="astro/client" />

// Runtime secrets and config, available on Astro.locals.runtime.env.
// Locally these come from .dev.vars (via platformProxy); in production from
// wrangler.jsonc vars + `wrangler secret put`.
interface Env {
  POSTHOG_API_KEY: string;
  /** Static-assets binding from wrangler.jsonc ("assets"): serves dist/ files. */
  ASSETS: { fetch(input: RequestInfo | URL): Promise<Response> };
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** Per-request anonymous Supabase client for read-only catalog queries. */
    supabase: import('@supabase/supabase-js').SupabaseClient;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly PUBLIC_POSTHOG_KEY: string;
  readonly PUBLIC_POSTHOG_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** PostHog browser SDK, initialized client-side by PostHog.astro (absent if no key). */
  posthog?: {
    identify(id: string, properties?: Record<string, unknown>): void;
    capture(event: string, properties?: Record<string, unknown>): void;
    opt_in_capturing(options?: { captureEventName?: string | null | false }): void;
    opt_out_capturing(): void;
  };
}
