// Shared helpers for surf-skill scripts. Node built-ins only, so the scripts run
// anywhere `node` does. Helpers are copied from the local create-surf-skill
// scripts on purpose: those skills are gitignored, this one is committed.

import { execFile, execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
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

// --- Run: agy in its sandbox -------------------------------------------------
//
// Run uses the Antigravity CLI (`agy`) inside its own macOS Seatbelt sandbox.
// Every agy run gets session-only settings from runSettings() or
// lockedSettings(); the user's own agy setup is never touched.

/** Exit codes shared by the run-* scripts. */
export const EXIT = { ok: 0, failed: 1, bad: 2, blocked: 3 };

export const RUN_CACHE = join(CARDS_DIR, ".run");
export const AGY = process.env.SURF_AGY || "agy";
const HOME = homedir();
// Where agy's image tool saves pictures: brain/<conversation id>/<name>.jpg.
export const AGY_BRAIN = join(HOME, ".gemini", "antigravity-cli", "brain");

// Home folders the agent must never touch. The caches matter: agy's sandbox mounts
// "common build caches" (~/.cache, ~/.npm…) readable, and they can hold API responses.
export const HOME_DENY = [
  ".ssh", ".aws", ".config", "Library", "projects", "Documents", "Desktop", "Downloads",
  ".gnupg", ".kube", ".docker", ".netrc", ".git-credentials", ".npmrc",
  ".cache", ".npm", ".pnpm-store", ".yarn", ".bun", ".cargo", ".rustup", ".gradle", ".m2", "go",
];

export function agyVersion() {
  try {
    return execFileSync(AGY, ["--version"], { encoding: "utf8", timeout: 30_000 }).trim();
  } catch (e) {
    throw new Error(`agy not found or not working (${AGY}): ${e.message}`);
  }
}

/** The user's temp folder with symlinks resolved; agy's tools see /private/var/..., not /var/... */
export function realTmp() {
  return realpathSync(process.env.TMPDIR || tmpdir());
}

/** A fresh `$TMPDIR/surf-run/<label>-<ts>/` with `ws/` (the agent's workspace) and `meta/` (ours). */
export function makeRunDir(label) {
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "");
  const dir = join(realTmp(), "surf-run", `${label}-${ts}-${randomBytes(3).toString("hex")}`);
  mkdirSync(join(dir, "ws", ".tmp"), { recursive: true });
  mkdirSync(join(dir, "meta"), { recursive: true });
  return { dir, ws: join(dir, "ws"), meta: join(dir, "meta") };
}

/**
 * Settings for the agent run. Workspace writes need an explicit allow: agy sees the
 * workspace under its real path, and anything outside it is "ask", which headless
 * mode denies. `hosts` become read_url allows, which agy also compiles into the
 * sandbox's outbound allowlist. `weaken` exists only to prove the self-test can fail.
 */
export function runSettings({ ws, hosts = [], home = HOME, weaken = false }) {
  const deny = [
    ...HOME_DENY.map((d) => `read_file(${home}/${d})`),
    "write_file(/tmp)",
    "write_file(/private/tmp)",
  ];
  return {
    enableTerminalSandbox: true,
    toolPermission: "proceed-in-sandbox",
    permissions: {
      allow: [`write_file(${ws})`, ...hosts.map((h) => `read_url(${h})`), ...(weaken ? [`read_file(${home})`] : [])],
      ask: ["execute_url(*)", "mcp(*)"],
      deny: weaken ? [] : deny,
    },
  };
}

/** Settings for the stand-in and the reviewer: no commands, no network, no MCP, no writes. */
export function lockedSettings(home = HOME) {
  return {
    enableTerminalSandbox: true,
    toolPermission: "proceed-in-sandbox",
    permissions: {
      allow: [],
      ask: [],
      deny: [
        "command(*)", "read_url(*)", "execute_url(*)", "mcp(*)", "write_file(*)",
        ...HOME_DENY.map((d) => `read_file(${home}/${d})`),
      ],
    },
  };
}

/** Hash of the lockdown, independent of the card: what the self-test result is cached under. */
export function settingsHash() {
  const shape = { run: runSettings({ ws: "<WS>", hosts: ["<HOST>"], home: "<HOME>" }), locked: lockedSettings("<HOME>") };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 16);
}

export const SELFTEST_CACHE = join(RUN_CACHE, "selftest.json");

/** null when a passing self-test is cached for this agy version and lockdown, else why not. */
export function selftestProblem(version = agyVersion()) {
  if (!existsSync(SELFTEST_CACHE)) return "no self-test has passed yet";
  let c;
  try {
    c = readJSON(SELFTEST_CACHE);
  } catch {
    return "the self-test cache is unreadable";
  }
  if (!c.passed) return "the last self-test failed";
  if (c.agy_version !== version) return `agy changed (${c.agy_version} -> ${version})`;
  if (c.settings_hash !== settingsHash()) return "the lockdown settings changed";
  return null;
}

/** A small, secret-free environment for agy and everything it starts. */
export function agyEnv(tmp) {
  const keep = ["HOME", "USER", "LOGNAME", "PATH", "SHELL", "LANG", "LC_ALL"];
  const env = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  env.TERM = "dumb";
  // Seatbelt lets commands write to the temp folder; pointing TMPDIR into the
  // workspace keeps the real temp folder (and other runs) out of reach.
  env.TMPDIR = tmp.endsWith("/") ? tmp : tmp + "/";
  return env;
}

/** Errors that mean "stop the batch", not "this card failed". */
export function blockedReason(text) {
  if (!text) return null;
  if (/quota|RESOURCE_EXHAUSTED|rate.?limit|\b429\b|out of credits|no credit/i.test(text)) return "agy quota ran out";
  if (/not authenticated|sign.?in|log.?in required|unauthenticated|auth (error|timed out)|\b401\b/i.test(text)) return "agy is not logged in";
  return null;
}

/**
 * Start agy in stream-json mode. Returns { child, send(text), end(), done } where
 * `done` resolves to { code, signal, lines }. `onEvent` gets every parsed event.
 */
export function spawnAgyStream({ cwd, settingsPath, logFile, env, onEvent, extraArgs = [] }) {
  const args = [
    "--sandbox", "--settings", settingsPath,
    "--input-format", "stream-json", "--output-format", "stream-json",
    ...(logFile ? ["--log-file", logFile] : []),
    ...extraArgs,
    // -p takes a value; with stream-json input the turns come from stdin instead.
    "-p", "",
  ];
  const child = spawn(AGY, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: true });
  const lines = [];
  let buf = "";
  let stderr = "";
  child.stdout.on("data", (d) => {
    buf += d;
    let k;
    while ((k = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, k);
      buf = buf.slice(k + 1);
      if (!line.trim()) continue;
      lines.push(line);
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      try {
        onEvent?.(ev);
      } catch (e) {
        log(`event handler error: ${e.message}`);
      }
    }
  });
  child.stderr.on("data", (d) => {
    if (stderr.length < 20_000) stderr += d;
  });
  child.stdin.on("error", () => {});
  let ended = false;
  const done = new Promise((res) => {
    child.on("close", (code, signal) => res({ code, signal, lines, stderr }));
    child.on("error", (e) => res({ code: null, signal: null, lines, stderr: stderr + e.message }));
  });
  return {
    child,
    done,
    send(text) {
      if (ended) return;
      child.stdin.write(JSON.stringify({ event: "user", message: { content: text } }) + "\n");
    },
    end() {
      if (ended) return;
      ended = true;
      child.stdin.end();
    },
    /** Kill agy and its daemons (it runs in its own process group). */
    kill(sig = "SIGTERM") {
      try {
        process.kill(-child.pid, sig);
      } catch {
        /* already gone */
      }
    },
  };
}

/**
 * One locked-down, single-turn agy run with structured output (stand-in, reviewer,
 * video storyboard, author and reviewer). `model` is an `agy models` id; without it
 * agy uses its default. Resolves to { ok, output, error, blocked }.
 */
export function agyJson({ cwd, prompt, schemaPath, timeoutS = 180, model }) {
  const settingsPath = join(cwd, "..", `settings-${randomBytes(3).toString("hex")}.json`);
  writeJSON(settingsPath, lockedSettings());
  const tmp = join(cwd, ".tmp");
  mkdirSync(tmp, { recursive: true });
  const args = [
    "--sandbox", "--disable-slash-commands", "--settings", settingsPath,
    ...(model ? ["--model", model] : []),
    "--json-schema", schemaPath, "--output-format", "json",
    "--print-timeout", `${timeoutS}s`, "-p", prompt,
  ];
  return new Promise((res) => {
    const child = spawn(AGY, args, { cwd, env: agyEnv(tmp), stdio: ["ignore", "pipe", "pipe"], detached: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const killer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* gone */
      }
    }, (timeoutS + 60) * 1000);
    child.on("close", (code) => {
      clearTimeout(killer);
      rmSync(settingsPath, { force: true });
      let r;
      try {
        r = JSON.parse(out.trim().split("\n").pop());
      } catch {
        const msg = (err || out || `agy exited ${code}`).trim().slice(0, 500);
        return res({ ok: false, error: msg, blocked: blockedReason(msg) });
      }
      if (r.status !== "SUCCESS" || !r.structured_output) {
        const msg = String(r.error || err || "no structured output").slice(0, 500);
        return res({ ok: false, error: msg, blocked: blockedReason(msg) });
      }
      res({ ok: true, output: r.structured_output });
    });
  });
}

// --- Run: copy-out -----------------------------------------------------------

/** Limits and file types for what leaves the workspace. */
export const COPY = { maxFiles: 200, maxTotal: 50 * 1024 * 1024, maxFile: 20 * 1024 * 1024 };
const RESULT_EXT = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".csv", ".svg", ".png", ".jpg", ".jpeg",
  ".webp", ".gif", ".mp4", ".pdf", ".woff", ".woff2", ".ttf", ".otf",
]);

/** Copy only allowed regular files from `src` to `dest`. Returns { files, dropped }. */
export function copyOut(src, dest, prefix = "result") {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const files = [];
  const dropped = [];
  if (!existsSync(src)) return { files, dropped };
  let total = 0;
  const walk = (dir, rel) => {
    for (const ent of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      const abs = join(dir, ent.name);
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) dropped.push({ path: `${prefix}/${r}`, reason: "symlink" });
      else if (st.isDirectory()) walk(abs, r);
      else if (!st.isFile()) dropped.push({ path: `${prefix}/${r}`, reason: "not a regular file" });
      else if (r.split("/").some((p) => p === ".." || p === "")) dropped.push({ path: `${prefix}/${r}`, reason: "unsafe path" });
      else if (!RESULT_EXT.has(extname(ent.name).toLowerCase())) dropped.push({ path: `${prefix}/${r}`, reason: "file type not allowed" });
      else if (st.size > COPY.maxFile) dropped.push({ path: `${prefix}/${r}`, reason: `over ${COPY.maxFile / 1048576} MB` });
      else if (files.length >= COPY.maxFiles) dropped.push({ path: `${prefix}/${r}`, reason: `over ${COPY.maxFiles} files` });
      else if (total + st.size > COPY.maxTotal) dropped.push({ path: `${prefix}/${r}`, reason: `over ${COPY.maxTotal / 1048576} MB in total` });
      else {
        mkdirSync(join(dest, rel), { recursive: true });
        copyFileSync(abs, join(dest, r));
        total += st.size;
        files.push(`${prefix}/${r}`);
      }
    }
  };
  walk(src, "");
  return { files, dropped };
}

// --- Headless Chromium over CDP ----------------------------------------------
//
// Raw DevTools Protocol over Node's WebSocket: no Playwright, no Puppeteer.
// Used by Run's screenshots and by Video's capture and composition checks.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A headless Chromium binary: SURF_CHROME, Playwright's headless shell, or Chrome. */
export function findChrome() {
  if (process.env.SURF_CHROME) return process.env.SURF_CHROME;
  const pw = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(pw)) {
    const dirs = readdirSync(pw)
      .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
      .sort((a, b) => b.split("-")[1] - a.split("-")[1]);
    for (const d of dirs) {
      for (const sub of readdirSync(join(pw, d))) {
        for (const bin of ["chrome-headless-shell", "headless_shell"]) {
          const p = join(pw, d, sub, bin);
          if (existsSync(p)) return p;
        }
      }
    }
  }
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Headless Chromium with a fresh profile; DNS resolves only the approved hosts
 * (IP literals such as 127.0.0.1 skip DNS). Returns { send, on, close }.
 */
export async function launchChrome(bin, hosts) {
  const profile = mkdtempSync(join(realTmp(), "surf-chrome-"));
  const rules = ["MAP * ~NOTFOUND", ...hosts.map((h) => `EXCLUDE ${h}`)].join(", ");
  const args = [
    "--headless", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--host-resolver-rules=${rules}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync", "--disable-background-networking",
    "--disable-component-update", "--disable-default-apps", "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb",
    "about:blank",
  ];
  const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
  const exited = new Promise((res) => child.once("exit", res));
  const kill = async () => {
    child.kill("SIGKILL");
    await Promise.race([exited, sleep(5000)]);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (e) {
      log(`could not remove the Chromium profile ${profile}: ${e.message}`);
    }
  };
  let wsUrl;
  try {
    wsUrl = await new Promise((res, rej) => {
      let err = "";
      const t = setTimeout(() => rej(new Error(`Chromium did not start: ${err.slice(0, 300)}`)), 20_000);
      child.stderr.on("data", (d) => {
        err += d;
        const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) {
          clearTimeout(t);
          res(m[1]);
        }
      });
      child.on("exit", () => rej(new Error(`Chromium exited: ${err.slice(0, 300)}`)));
    });
  } catch (e) {
    await kill();
    throw e;
  }
  const port = new URL(wsUrl).port;
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === "page");
  const sock = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    sock.onopen = res;
    sock.onerror = () => rej(new Error("CDP connection failed"));
  });
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  sock.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      const { res, rej } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      waiting.set(i, { res, rej });
      sock.send(JSON.stringify({ id: i, method, params }));
    });
  return {
    send,
    on: (fn) => listeners.push(fn),
    async close() {
      try {
        sock.close();
      } catch {
        /* closed */
      }
      await kill();
    },
  };
}

/**
 * Open `url`, wait for load, scroll through once (up to `maxScroll` px) so
 * reveal-on-scroll content shows, then return to the top. -> { height, title }.
 */
export async function loadPage(cdp, url, maxScroll = 12_000) {
  const loaded = new Promise((res) => {
    cdp.on((m) => m.method === "Page.loadEventFired" && res());
    setTimeout(res, 20_000);
  });
  await cdp.send("Page.navigate", { url });
  await loaded;
  await sleep(1500);
  const r = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const h = () => document.documentElement.scrollHeight;
      for (let y = 0; y < h() && y < ${maxScroll}; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      scrollTo(0, 0); await new Promise(r => setTimeout(r, 900));
      return { height: h(), title: document.title };
    })()`,
  });
  return r.result.value || {};
}

/** Page.captureScreenshot into `path` (png unless params.format says otherwise). */
export async function shoot(cdp, path, params = {}) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png", ...params });
  writeFileSync(path, Buffer.from(r.data, "base64"));
}

// --- Video: tools ------------------------------------------------------------
//
// Video renders with HyperFrames (Apache-2.0, Copyright 2026 HeyGen, Inc.), run
// as a pinned tool through npx. None of its files are copied into this skill.

/** Pinned: the newest release at least two weeks old when Video was built. */
export const HYPERFRAMES_VERSION = "0.8.162";
// GSAP runs inside the composition. Downloaded once, checked, never committed.
const GSAP = {
  version: "3.14.2",
  sha256: "c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280",
};
export const VIDEO_CACHE = join(CARDS_DIR, ".video");
/** agy models for Video. The reviewer is a different model, so it doesn't share the author's blind spots. */
export const VIDEO_MODELS = {
  author: process.env.SURF_VIDEO_AUTHOR_MODEL || "claude-opus-5-5-high",
  reviewer: process.env.SURF_VIDEO_REVIEW_MODEL || "gemini-4-argon-high",
};

/** The text under `## <heading>` in a markdown file, up to the next `## ` heading. */
export function mdSection(path, heading) {
  const md = readFileSync(path, "utf8");
  const k = md.indexOf(`\n## ${heading}\n`);
  if (k < 0) throw new Error(`${path} has no "## ${heading}" section`);
  const rest = md.slice(k + heading.length + 5);
  const end = rest.search(/\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

/**
 * Run a command; resolves to { code, stdout, stderr, timedOut }. On timeout the
 * whole process group is killed.
 */
export function runCmd(cmd, args, { cwd, env = process.env, timeoutS = 300 } = {}) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d) => {
      if (stdout.length < 2_000_000) stdout += d;
    });
    child.stderr.on("data", (d) => {
      if (stderr.length < 200_000) stderr += d;
    });
    const t = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* gone */
      }
    }, timeoutS * 1000);
    child.on("error", (e) => {
      clearTimeout(t);
      res({ code: null, stdout, stderr: stderr + e.message, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(t);
      res({ code, stdout, stderr, timedOut });
    });
  });
}

/** A secret-free environment for HyperFrames, with its telemetry off. */
function hyperframesEnv() {
  const keep = ["HOME", "USER", "LOGNAME", "PATH", "SHELL", "LANG", "LC_ALL", "TMPDIR"];
  const env = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  return { ...env, HYPERFRAMES_NO_TELEMETRY: "1", DO_NOT_TRACK: "1", NO_COLOR: "1" };
}

/** `npx hyperframes@<pinned> <args>` in `cwd`. */
export function hyperframes(args, cwd, timeoutS = 300) {
  return runCmd("npx", ["--yes", `hyperframes@${HYPERFRAMES_VERSION}`, ...args], { cwd, env: hyperframesEnv(), timeoutS });
}

/** Run ffmpeg quietly; throws with its last stderr lines when it fails. */
export async function ffmpeg(args, timeoutS = 300) {
  const r = await runCmd("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { timeoutS });
  if (r.code !== 0) throw new Error(`ffmpeg failed: ${(r.stderr || "").trim().split("\n").slice(-3).join(" ")}`);
  return r;
}

/** { duration, width, height, fps, audio, bytes } of a media file. */
export async function ffprobe(file) {
  const r = await runCmd("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { timeoutS: 60 });
  if (r.code !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr.trim().slice(0, 200)}`);
  const j = JSON.parse(r.stdout);
  const v = (j.streams || []).find((s) => s.codec_type === "video") || {};
  const [n, d] = String(v.avg_frame_rate || "0/1").split("/").map(Number);
  return {
    duration: Number(j.format?.duration || v.duration || 0),
    width: v.width || 0,
    height: v.height || 0,
    fps: d ? n / d : 0,
    audio: (j.streams || []).some((s) => s.codec_type === "audio"),
    bytes: statSync(file).size,
  };
}

/** Which video tools are missing: [] when ffmpeg, ffprobe and npx all run. */
export function missingVideoTools() {
  return ["ffmpeg", "ffprobe", "npx"].filter((t) => {
    try {
      execFileSync(t, [t === "npx" ? "--version" : "-version"], { stdio: "ignore", timeout: 30_000 });
      return false;
    } catch {
      return true;
    }
  });
}

/** Path to the cached, checksum-verified gsap.min.js; downloads it on first use. */
export async function ensureGsap() {
  const path = join(VIDEO_CACHE, `gsap-${GSAP.version}.min.js`);
  const ok = (buf) => createHash("sha256").update(buf).digest("hex") === GSAP.sha256;
  if (existsSync(path) && ok(readFileSync(path))) return path;
  const res = await fetch(`https://cdn.jsdelivr.net/npm/gsap@${GSAP.version}/dist/gsap.min.js`);
  if (!res.ok) throw new Error(`GSAP download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!ok(buf)) throw new Error(`GSAP ${GSAP.version} does not match its pinned checksum`);
  mkdirSync(VIDEO_CACHE, { recursive: true });
  writeFileSync(path, buf);
  return path;
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2",
};

/**
 * Serve `dir` read-only on 127.0.0.1 (fonts don't load from file:// pages).
 * Resolves to { origin, close }.
 */
export function serveDir(dir) {
  const root = realpathSync(dir);
  const server = createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const abs = resolve(root, "." + (rel.endsWith("/") ? rel + "index.html" : rel));
    if (abs !== root && !abs.startsWith(root + sep)) return res.writeHead(403).end();
    if (!existsSync(abs) || !statSync(abs).isFile()) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": MIME[extname(abs).toLowerCase()] || "application/octet-stream" });
    res.end(readFileSync(abs));
  });
  return new Promise((res) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      res({ origin: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

/** What every Video script needs to know about a card: the command, the skill, the result type. */
export function videoTask(card) {
  const plan = readJSON(join(card, "plan.json"));
  const pick = readJSON(join(card, "pick.json"));
  const skillMd = join(card, "skill", "SKILL.md");
  const { data } = existsSync(skillMd) ? parseFrontmatter(readFileSync(skillMd, "utf8")) : { data: null };
  const owner = pick.skill_id.split("/")[0];
  return {
    command: plan.task.title,
    skill_name: (data?.name || pick.skill_id.split("/").pop()).slice(0, 40),
    owner,
    by: `by ${owner}`,
    skill_description: (data?.description || "").slice(0, 500),
    result_type: plan.deliverable.type,
  };
}
