#!/usr/bin/env node
// Fallback source: the skill packs already in our catalog (Supabase
// `collections`, live or scheduled). Same shape as pick-trending, without hype
// signals. Reads use the secret key, since RLS hides scheduled rows.
//
// Usage (debug): node pick-catalog.mjs   -> prints the list as JSON

import { fileURLToPath } from "node:url";
import { log } from "./shared/core.mjs";
import { sbSelect, supabaseSecretEnv } from "./shared/supabase.mjs";

/** -> [{ repo, description, hype: null }], most-starred first. */
export async function catalogRepos() {
  const env = supabaseSecretEnv();
  if (!env) throw new Error("PUBLIC_SUPABASE_URL not set (.env)");
  const rows = await sbSelect(env, "collections", "select=id,short_description,github_stars&order=github_stars.desc.nullslast");
  return rows.map((r) => ({ repo: r.id, description: r.short_description, hype: null }));
}

/**
 * What the catalog already has (live or scheduled), for marking candidates:
 * lowercased collection ids and skill-page ids. Null when Supabase or the
 * secret key is unavailable (caller degrades).
 */
export async function catalogIndex() {
  try {
    const env = supabaseSecretEnv();
    if (!env) return null;
    const [collections, skills] = await Promise.all([
      sbSelect(env, "collections", "select=id"),
      sbSelect(env, "skills", "select=id"),
    ]);
    return {
      collections: new Set(collections.map((r) => r.id.toLowerCase())),
      skills: new Set(skills.map((r) => r.id.toLowerCase())),
    };
  } catch (e) {
    log(`warning: catalog index unavailable: ${e.message}`);
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  catalogRepos().then(
    (rows) => process.stdout.write(JSON.stringify(rows, null, 2) + "\n"),
    (e) => {
      log(e.message);
      process.exit(1);
    },
  );
}
