// Shared helpers for create-surf-skill: run state, GitHub, Supabase, and the
// row mapping/validation the catalog needs. Zero dependencies — Node built-ins
// + global fetch. The video half of the skill (template staging, ffprobe, luma)
// lives in video/lib.mjs and imports from here.
//
// All run state lives in ONE plain JSON per run:
//   .fill/<owner>__<repo>__<pageSlug>/run.json  (at the repo root, never committed)
// Each skill gets its own folder (keyed by the full skill slug), so runs are
// independent. The repo checkout (repo/) and video builds (video/) sit beside
// run.json inside that folder; run.json is the single source of truth.
//
// run.json shape:
// {
//   "repo": "owner/repo", "repoUrl": "https://github.com/owner/repo",
//   "skill": "<pageSlug>",            // which discovered skill gets the page
//   "steps": {
//     "enrich":   { "status": "done", "collection": {…facts}, "skills": [ {…per-skill facts} ], "live": {…catalog probe} },
//     "card":     { "status": "draft|approved", "collection": {…copy}, "skill": {…copy+classification} },
//                  // collection = { name, shortDescription, websiteURL, longDescription, whenToUse[], faq[] }
//                  //              — the collection page's sections (shared across sibling skill pages)
//                  // skill = { moduleSlug, name, description:{short}, longDescription, whenToUse[], faq[],
//                  //          relatedSkills[], kind, useCases[] } — the skill page's sections
//     "scenario": { "status": "draft|approved", "commandLine", "realOutputPlan", "treatment", "beat3Concept", "affordance" },
//     "run":      { "status": "pending|done", "prompt", "outputNote" },
//     "video":    { "status": "staged|built|done", "treatment", "demoMp4", "posterJpg", "warns", "spec", "previewVideo", "previewImage" },
//                  // built = local clip rendered & black-checked, awaiting user approval; done = uploaded to the CDN
//     "publish":  { "status": "done", "collectionId", "skillId", "verifyUrl" }
//   }
// }

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // .../create-surf-skill/scripts
// scripts -> create-surf-skill -> skills -> .claude -> repo root
export const REPO_ROOT = resolve(HERE, "../../../..");
export const FILL_ROOT = join(REPO_ROOT, ".fill");

export { existsSync, mkdirSync, readdirSync, join, resolve };

// ---------------------------------------------------------------------------
// GitHub URL parsing + paths
// ---------------------------------------------------------------------------

/** Parse a github URL or "owner/repo" -> { owner, repo }. */
export function parseRepoUrl(input) {
  let s = String(input).trim();
  s = s.replace(/^git@github\.com:/, "https://github.com/");
  s = s.replace(/\.git$/, "");
  const m = s.match(/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);
  if (m) return { owner: m[1], repo: m[2] };
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Cannot parse repo from: ${input}`);
  return { owner: parts[0], repo: parts[1] };
}

export function fillDirFor(owner, repo, slug) {
  return join(FILL_ROOT, `${owner}__${repo}__${slug}`);
}

/** Page/URL slug: colon-free, filesystem- and URL-safe. */
export function pageSlug(idLastSegment) {
  return String(idLastSegment).replace(/:/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function kebab(str) {
  return String(str)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// IO + run.json
// ---------------------------------------------------------------------------

export function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJSON(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

export function runPathFor(owner, repo, slug) {
  return join(fillDirFor(owner, repo, slug), "run.json");
}

/** Load run.json, or a fresh skeleton if this is a new run. */
export function loadRun(owner, repo, slug) {
  const p = runPathFor(owner, repo, slug);
  if (existsSync(p)) return readJSON(p);
  return {
    repo: `${owner}/${repo}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    skill: slug,
    createdAt: new Date().toISOString(),
    steps: {},
  };
}

export function saveRun(owner, repo, run) {
  if (!run.skill) throw new Error("saveRun: run.skill (pageSlug) must be set");
  run.updatedAt = new Date().toISOString();
  writeJSON(runPathFor(owner, repo, run.skill), run);
}

/** Load an existing run or die with a pointer to the missing prerequisite. */
export function requireRun(owner, repo, slug) {
  const p = runPathFor(owner, repo, slug);
  if (!existsSync(p)) {
    process.stderr.write(`No run at ${p} — run enrich.mjs ${owner}/${repo} ${slug} first.\n`);
    process.exit(1);
  }
  return readJSON(p);
}

export function requireStep(run, name, statuses) {
  const s = run.steps?.[name];
  if (!s || (statuses && !statuses.includes(s.status))) {
    process.stderr.write(
      `Step "${name}" is ${s ? `"${s.status}"` : "missing"}; need ${statuses ? statuses.join("|") : "it done"} first.\n`,
    );
    process.exit(1);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Subprocess helpers
// ---------------------------------------------------------------------------

export function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
}

/** `gh api <path>` -> parsed JSON. Throws if gh is missing or the call fails. */
export function ghJSON(apiPath) {
  return JSON.parse(run("gh", ["api", apiPath, "-H", "Accept: application/vnd.github+json"]));
}

// ---------------------------------------------------------------------------
// Site root. The skill lives inside the site repo, so this is REPO_ROOT — the
// marker check is a guard against the skill being copied somewhere else.
// ---------------------------------------------------------------------------

const SITE_MARKER = "src/data/skill-model/index.ts";

/** The site repo root, or null if this tree isn't it (missing SITE_MARKER). */
export function resolveSiteRoot(hint) {
  for (const c of [hint, REPO_ROOT]) {
    if (!c) continue;
    const root = resolve(c);
    if (existsSync(join(root, SITE_MARKER))) return root;
  }
  return null;
}

export const SITE_ROOT_HINT =
  `Run from the site repo — ${SITE_MARKER} must exist at its root.`;

// ---------------------------------------------------------------------------
// Config + creds. Nothing deployment-specific is hardcoded: the Supabase
// project, the media host, and the R2 bucket all come from .env / .dev.vars
// (both gitignored). Keys: PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
// MEDIA_BASE_URL, MEDIA_R2_BUCKET — a missing one is named in the error.
// ---------------------------------------------------------------------------

function loadEnvFile(path, out) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in out)) out[key] = val;
  }
}

/** Merged .env + .dev.vars at the site root (.env wins; neither is committed). */
function loadRepoEnv(siteRoot) {
  const env = {};
  loadEnvFile(join(siteRoot, ".env"), env);
  loadEnvFile(join(siteRoot, ".dev.vars"), env);
  return env;
}

function requireVars(env, siteRoot, keys, what) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(
      `Missing ${what}: ${missing.join(", ")}. Set them in ${join(siteRoot, ".env")} or ` +
        `${join(siteRoot, ".dev.vars")} — see the matching .example files.`,
    );
  }
}

/** { url, secret } — PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY. */
export function loadSupabaseEnv(siteRoot) {
  const env = loadRepoEnv(siteRoot);
  requireVars(env, siteRoot, ["PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"], "Supabase creds");
  return { url: env.PUBLIC_SUPABASE_URL.replace(/\/+$/, ""), secret: env.SUPABASE_SECRET_KEY };
}

/**
 * { base, bucket } — MEDIA_BASE_URL (the public CDN origin previews are served
 * from) + MEDIA_R2_BUCKET (the R2 bucket wrangler writes them to). Deployment
 * config, not secrets, but they live in the same untracked files so the tooling
 * has one place to look and the repo stays deployment-agnostic.
 */
export function loadMediaEnv(siteRoot) {
  const env = loadRepoEnv(siteRoot);
  requireVars(env, siteRoot, ["MEDIA_BASE_URL", "MEDIA_R2_BUCKET"], "media config");
  return { base: env.MEDIA_BASE_URL.replace(/\/+$/, ""), bucket: env.MEDIA_R2_BUCKET };
}

function headers(env, extra = {}) {
  return {
    apikey: env.secret,
    Authorization: `Bearer ${env.secret}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function ok(res, what) {
  if (res.ok) return res;
  const body = await res.text().catch(() => "");
  throw new Error(`Supabase ${what} failed: ${res.status} ${res.statusText}\n${body}`);
}

export async function sbSelect(env, table, query = "") {
  const url = `${env.url}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await ok(await fetch(url, { headers: headers(env) }), `select ${table}`);
  return res.json();
}

/** Upsert (insert-or-merge by primary key id) -> the written rows. */
export async function sbUpsert(env, table, rows) {
  const url = `${env.url}/rest/v1/${table}?on_conflict=id`;
  const res = await ok(
    await fetch(url, {
      method: "POST",
      headers: headers(env, { Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(rows),
    }),
    `upsert ${table}`,
  );
  return res.json();
}

/** PostgREST value-equality filter with escaping for ids containing `/`, `:`. */
export function eqId(id) {
  return `id=eq.${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------
// Validation — mirrors what src/data/skill-model/db.ts defends against
// (bad kind skips the row; unknown use_case is dropped). Catch it BEFORE writing.
// ---------------------------------------------------------------------------

export const KINDS = ["Action", "Mode", "Knowledge", "Router"];
export const USE_CASES = ["Design", "Video", "Images", "Writing", "SEO", "Development", "Research"];

const str = (v) => typeof v === "string" && v.trim().length > 0;

// Long-form page sections shared by skills AND collections (What it does / When to use it /
// FAQ). Malformed shapes are errors — the website silently drops bad entries, so catch them
// here. `longDescription` is required (the "What it does" body); the arrays are optional but
// must be well-formed when present. `prefix` ("skill"/"collection") makes the errors readable.
function validateContentSections(o, prefix, e) {
  if (!str(o.longDescription)) e.push(`${prefix}.longDescription is required (the 'What it does' body)`);
  if (o.whenToUse != null) {
    if (!Array.isArray(o.whenToUse)) e.push(`${prefix}.whenToUse must be an array`);
    else
      for (const [i, w] of o.whenToUse.entries())
        if (!w || !str(w.title) || !str(w.body))
          e.push(`${prefix}.whenToUse[${i}] must be {title, body} non-empty strings`);
  }
  if (o.faq != null) {
    if (!Array.isArray(o.faq)) e.push(`${prefix}.faq must be an array`);
    else
      for (const [i, f] of o.faq.entries())
        if (!f || !str(f.q) || !str(f.a))
          e.push(`${prefix}.faq[${i}] must be {q, a} non-empty strings`);
  }
}

// The blurb doubles as the SEO meta description and the card blurb; keep it scannable.
export const SHORT_DESCRIPTION_MAX = 200;

export function validateCollection(c) {
  const e = [];
  if (!c || typeof c !== "object") return ["collection: not an object"];
  if (!str(c.id)) e.push("collection.id is required");
  if (!str(c.name)) e.push("collection.name is required");
  if (!str(c.shortDescription)) e.push("collection.shortDescription is required");
  else if (c.shortDescription.length > SHORT_DESCRIPTION_MAX)
    e.push(
      `collection.shortDescription is ${c.shortDescription.length} chars (max ${SHORT_DESCRIPTION_MAX})`,
    );
  if (!str(c.repositoryURL)) e.push("collection.repositoryURL is required");
  if (!str(c.installCommand)) e.push("collection.installCommand is required");
  if (!c.author || !str(c.author.name) || !str(c.author.url))
    e.push("collection.author.{name,url} are required");
  // Long-form sections (What it does / When to use it / FAQ) — same rules as skills.
  validateContentSections(c, "collection", e);
  return e;
}

export function validateSkill(s, collectionId) {
  const e = [];
  if (!s || typeof s !== "object") return ["skill: not an object"];
  if (!str(s.id)) e.push("skill.id is required");
  if (!str(s.collection)) e.push("skill.collection is required");
  else if (collectionId && s.collection !== collectionId)
    e.push(`skill.collection "${s.collection}" != collection.id "${collectionId}"`);
  if (!str(s.name)) e.push("skill.name is required");
  if (!s.description || !str(s.description.short)) e.push("skill.description.short is required");
  else if (s.description.short.length > SHORT_DESCRIPTION_MAX)
    e.push(
      `skill.description.short is ${s.description.short.length} chars (max ${SHORT_DESCRIPTION_MAX})`,
    );
  if (!KINDS.includes(s.kind)) e.push(`skill.kind "${s.kind}" not in {${KINDS.join(", ")}}`);
  if (!Array.isArray(s.useCases) || s.useCases.length === 0)
    e.push("skill.useCases must be a non-empty array");
  else
    for (const u of s.useCases)
      if (!USE_CASES.includes(u)) e.push(`skill.useCases "${u}" not in {${USE_CASES.join(", ")}}`);

  // Long-form page sections (What it does / When to use it / FAQ) — same rules as collections.
  validateContentSections(s, "skill", e);
  if (s.relatedSkills != null) {
    if (!Array.isArray(s.relatedSkills)) e.push("skill.relatedSkills must be an array of page slugs");
    else
      for (const [i, r] of s.relatedSkills.entries())
        if (!str(r)) e.push(`skill.relatedSkills[${i}] must be a non-empty slug string`);
  }
  return e;
}

// ---------------------------------------------------------------------------
// JSON (camelCase, from run.json) -> DB row (snake_case)
// ---------------------------------------------------------------------------

export function collectionRow(c) {
  return {
    id: c.id,
    name: c.name,
    short_description: c.shortDescription,
    repository_url: c.repositoryURL,
    website_url: c.websiteURL ?? null,
    external_links: c.externalLinks ?? [],
    author_name: c.author?.name,
    author_url: c.author?.url,
    author_avatar_url: c.author?.avatarURL ?? null,
    license: c.license ?? null,
    github_stars: c.githubStars ?? null,
    updated_at: c.updatedAt ?? null,
    install_command: c.installCommand,
    skills: c.skills ?? [],
    long_description: c.longDescription ?? null,
    when_to_use: c.whenToUse ?? [],
    faq: c.faq ?? [],
  };
}

export function skillRow(s, { relatedSkillSlugs = [] } = {}) {
  return {
    id: s.id,
    collection_id: s.collection,
    name: s.name,
    description: s.description,
    reference_file: s.referenceFile ?? null,
    install_command: s.installCommand ?? null,
    tools: s.tools ?? [],
    preview_video: s.previewVideo ?? null,
    preview_image: s.previewImage ?? null,
    kind: s.kind,
    use_cases: s.useCases ?? [],
    long_description: s.longDescription ?? null,
    when_to_use: s.whenToUse ?? [],
    faq: s.faq ?? [],
    related_slugs: relatedSkillSlugs,
    // sort_order is curated by hand — omit it so upsert-merge never clobbers it.
  };
}

// Video staging + probing (stageProject / ffprobeSpec / lumaAvg) live in
// video/lib.mjs, next to the template and the two scripts that use them.
