/// <reference types="astro/client" />

// Runtime secrets and config, available on Astro.locals.runtime.env.
// Locally these come from .dev.vars (via platformProxy); in production from
// wrangler.jsonc vars + `wrangler secret put`.
interface Env {
  SUPABASE_SECRET_KEY: string;
  POLAR_ACCESS_TOKEN: string;
  POLAR_WEBHOOK_SECRET: string;
  POLAR_SERVER: 'sandbox' | 'production';
  POLAR_PRODUCT_ID_MONTHLY: string;
  POLAR_PRODUCT_ID_YEARLY: string;
  POSTHOG_API_KEY: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** Per-request Supabase client bound to the visitor's session cookies. */
    supabase: import('@supabase/supabase-js').SupabaseClient;
    /** Verified from the session JWT in middleware; null when signed out. */
    user: { id: string; email: string | null } | null;
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
  };
}
