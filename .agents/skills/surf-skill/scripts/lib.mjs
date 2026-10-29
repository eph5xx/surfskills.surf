// Shared helpers for surf-skill scripts. Node built-ins only, so the scripts run
// anywhere `node` does. Helpers are copied from the local create-surf-skill
// scripts on purpose: those skills are gitignored, this one is committed.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = resolve(HERE, "..");
export const PROJECT_ROOT = resolve(HERE, "../../../..");
export const CARDS_DIR = process.env.SURF_CARDS_DIR || join(PROJECT_ROOT, "cards");
// Pick's cache: daily candidate pools and downloaded repos (untrusted, never run).
export const PICK_DIR = join(CARDS_DIR, ".pick");

export { existsSync, join };

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJSON(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

export function log(msg) {
  process.stderr.write(msg + "\n");
}

/** Parse `--key value` / `--flag` pairs and positionals. */
export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

/** Run `fn` over `items` with at most `limit` in flight; results keep input order. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// --- card folders -----------------------------------------------------------

/** `owner/repo/skill` -> `owner__repo__skill`, filesystem-safe. */
export function cardDirName(skillId) {
  return skillId.split("/").join("__").replace(/[^A-Za-z0-9._-]/g, "-");
}

/** Lowercased skill ids that already have a card folder (published or dropped). */
export function featuredSkillIds() {
  const ids = new Set();
  if (!existsSync(CARDS_DIR)) return ids;
  for (const ent of readdirSync(CARDS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const pickPath = join(CARDS_DIR, ent.name, "pick.json");
    let id = null;
    try {
      id = readJSON(pickPath).skill_id;
    } catch {
      /* no pick.json: fall back to the folder name */
    }
    ids.add((id || ent.name.split("__").join("/")).toLowerCase());
  }
  return ids;
}

// --- GitHub -----------------------------------------------------------------

let ghToken;
function githubToken() {
  if (ghToken !== undefined) return ghToken;
  ghToken = process.env.GITHUB_TOKEN || null;
  if (!ghToken) {
    try {
      ghToken = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim() || null;
    } catch {
      ghToken = null;
    }
  }
  if (!ghToken) log("warning: no GITHUB_TOKEN and no `gh auth token`; GitHub allows only 60 requests/hour");
  return ghToken;
}

function ghHeaders() {
  const h = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const token = githubToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** GET api.github.com/<path> -> JSON. Throws an Error with `.status` on non-2xx. */
export async function gh(path) {
  const res = await fetch(`https://api.github.com/${path}`, { headers: ghHeaders() });
  if (!res.ok) {
    const err = new Error(`GitHub ${path}: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Download the repo tarball at `sha` and extract it into `dest` (created fresh).
 * Extraction goes through a `.partial` folder so an interrupted run never looks
 * complete. The files are third-party: read them, never run them.
 */
export async function downloadRepo(repo, sha, dest) {
  if (existsSync(dest)) return dest;
  const res = await fetch(`https://api.github.com/repos/${repo}/tarball/${sha}`, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub tarball ${repo}@${sha}: ${res.status} ${res.statusText}`);
  const partial = `${dest}.partial`;
  rmSync(partial, { recursive: true, force: true });
  mkdirSync(partial, { recursive: true });
  const tarPath = `${partial}.tar.gz`;
  writeFileSync(tarPath, Buffer.from(await res.arrayBuffer()));
  try {
    execFileSync("tar", ["-xzf", tarPath, "-C", partial, "--strip-components=1"], { stdio: "pipe" });
  } finally {
    rmSync(tarPath, { force: true });
  }
  renameSync(partial, dest);
  return dest;
}

/**
 * Download only `paths` (repo-relative) at `sha` into `dest`, for repos too big
 * for a tarball. Same `.partial` rule as downloadRepo.
 */
export async function downloadFiles(repo, sha, paths, dest) {
  if (existsSync(dest)) return dest;
  const partial = `${dest}.partial`;
  rmSync(partial, { recursive: true, force: true });
  await mapLimit(paths, 8, async (p) => {
    if (p.startsWith("/") || p.split("/").includes("..")) throw new Error(`unsafe path in tree: ${p}`);
    const url = `https://raw.githubusercontent.com/${repo}/${sha}/${p.split("/").map(encodeURIComponent).join("/")}`;
    const res = await fetch(url, { headers: ghHeaders() });
    if (!res.ok) throw new Error(`raw ${repo}/${p}: ${res.status} ${res.statusText}`);
    const out = join(partial, p);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  });
  mkdirSync(partial, { recursive: true });
  renameSync(partial, dest);
  return dest;
}

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

/** GET /rest/v1/<table>?<query> -> rows. Throws on a non-2xx response. */
export async function sbSelect(env, table, query = "") {
  const url = `${env.url}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: { apikey: env.key, Authorization: `Bearer ${env.key}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase select ${table} failed: ${res.status} ${res.statusText}\n${body}`);
  }
  return res.json();
}

// --- JSON Schema ------------------------------------------------------------

/**
 * Validate `data` against `assets/<name>.schema.json` -> list of errors (empty = valid).
 * Without ajv installed, only checks the top-level required fields, with a warning.
 */
export async function validateSchema(name, data) {
  const schema = readJSON(join(SKILL_ROOT, "assets", `${name}.schema.json`));
  let Ajv2020;
  try {
    Ajv2020 = (await import("ajv/dist/2020.js")).default;
  } catch {
    log("warning: ajv not found; checking required fields only");
    const missing = (schema.required || []).filter((k) => !(data && typeof data === "object" && k in data));
    return missing.length ? [`missing: ${missing.join(", ")}`] : [];
  }
  // The schemas use type unions like ["string", "integer"]; strict mode would warn on every run.
  const check = new Ajv2020({ allErrors: true, allowUnionTypes: true }).compile(schema);
  return check(data) ? [] : check.errors.map((e) => `${e.instancePath || "/"} ${e.message}`);
}

// --- SKILL.md ---------------------------------------------------------------

/**
 * Split SKILL.md into { data, body }. `data` holds top-level scalar keys,
 * including quoted values and `>` / `|` block scalars. Returns data = null when
 * there is no frontmatter.
 */
export function parseFrontmatter(text) {
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = src.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { data: null, body: src };
  const data = {};
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const km = lines[i].match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!km) continue;
    let val = km[2].trim();
    const cont = [];
    while (i + 1 < lines.length && /^(\s+\S|\s*$)/.test(lines[i + 1]) && !/^[A-Za-z0-9_-]+\s*:/.test(lines[i + 1])) {
      cont.push(lines[++i].trim());
    }
    if (/^[>|][-+]?$/.test(val)) val = cont.join(val.startsWith(">") ? " " : "\n");
    else if (cont.length) val = [val, ...cont].join(" ");
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    data[km[1]] = val;
  }
  return { data, body: src.slice(m[0].length) };
}
