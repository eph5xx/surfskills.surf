// Supabase over PostgREST: the publishable key sees only live rows; the secret key
// sees scheduled ones too and is the only one that can write.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "./core.mjs";

// --- Supabase (read-only, publishable key) ----------------------------------

function loadEnvFile(path, out) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in out)) out[key] = val;
  }
}

/** { url, key } from the environment or the project's .env / .dev.vars, or null. */
export function supabaseEnv() {
  const env = { ...process.env };
  loadEnvFile(join(PROJECT_ROOT, ".env"), env);
  loadEnvFile(join(PROJECT_ROOT, ".dev.vars"), env);
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** Error for a non-2xx PostgREST response, with `.status` and the PostgREST `.code`. */
async function sbError(res, what) {
  const body = await res.text().catch(() => "");
  const err = new Error(`Supabase ${what} failed: ${res.status} ${res.statusText}\n${body}`);
  err.status = res.status;
  try {
    const j = JSON.parse(body);
    err.code = j.code;
    err.detail = [j.message, j.details].filter(Boolean).join(" ");
  } catch {
    err.detail = body;
  }
  return err;
}

/** GET /rest/v1/<table>?<query> -> rows. Throws on a non-2xx response. */
export async function sbSelect(env, table, query = "") {
  const url = `${env.url}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: { apikey: env.key, Authorization: `Bearer ${env.key}` } });
  if (!res.ok) throw await sbError(res, `select ${table}`);
  return res.json();
}

// --- Supabase writes (secret key) -------------------------------------------

/**
 * The secret key for `url`'s project: SUPABASE_SECRET_KEY from the environment or
 * .dev.vars, else fetched from the Supabase CLI login. Kept in memory only; never
 * log it. Throws an Error with `.blocked = true` when neither works.
 */
export function supabaseSecretKey(url) {
  const env = { ...process.env };
  loadEnvFile(join(PROJECT_ROOT, ".dev.vars"), env);
  if (env.SUPABASE_SECRET_KEY) return env.SUPABASE_SECRET_KEY;
  const ref = new URL(url).hostname.split(".")[0];
  let keys;
  try {
    // The CLI writes supabase/.temp/ into its cwd; keep that in the project's own supabase/.
    const out = execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "--reveal", "-o", "json"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
    keys = JSON.parse(out);
  } catch {
    // The CLI's output may hold keys: say why without quoting it.
    const err = new Error(`no SUPABASE_SECRET_KEY and the Supabase CLI can't list keys for ${ref} (run \`supabase login\`)`);
    err.blocked = true;
    throw err;
  }
  const pick = (k) => typeof k?.api_key === "string" && k.api_key.length > 20;
  const key = keys.find((k) => k.type === "secret" && pick(k)) || keys.find((k) => k.id === "service_role" && pick(k));
  if (!key) {
    const err = new Error(`the Supabase CLI returned no secret key for ${ref}`);
    err.blocked = true;
    throw err;
  }
  return key.api_key;
}

/**
 * { url, key } with the secret key, for reads that must see scheduled skills
 * (RLS hides them from the publishable key). Null when PUBLIC_SUPABASE_URL is
 * unset; throws like supabaseSecretKey() when there is no secret key.
 */
export function supabaseSecretEnv() {
  const env = { ...process.env };
  loadEnvFile(join(PROJECT_ROOT, ".env"), env);
  loadEnvFile(join(PROJECT_ROOT, ".dev.vars"), env);
  if (!env.PUBLIC_SUPABASE_URL) return null;
  const url = env.PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return { url, key: supabaseSecretKey(url) };
}

function writeHeaders(env, prefer) {
  return { apikey: env.key, Authorization: `Bearer ${env.key}`, "Content-Type": "application/json", Prefer: prefer };
}

/** POST /rest/v1/<table> -> the inserted rows. Throws (with .status/.code) on a non-2xx. */
export async function sbInsert(env, table, rows) {
  const res = await fetch(`${env.url}/rest/v1/${table}`, {
    method: "POST",
    headers: writeHeaders(env, "return=representation"),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw await sbError(res, `insert ${table}`);
  return res.json();
}

/** PATCH /rest/v1/<table>?<query> with `patch` -> the updated rows. */
export async function sbPatch(env, table, query, patch) {
  const res = await fetch(`${env.url}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: writeHeaders(env, "return=representation"),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await sbError(res, `update ${table}`);
  return res.json();
}
