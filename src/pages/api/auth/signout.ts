import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  await locals.supabase.auth.signOut();
  return redirect("/", 303);
};
