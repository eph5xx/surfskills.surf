// Plain helpers every step may use: paths, JSON, args, logging, schemas, SKILL.md,
// files and subprocesses. Node built-ins only, so the scripts run anywhere `node` does.
// Nothing here knows about any step. A step script imports only from shared/ and
// from its own <step>-*.mjs files.
//
// Each surf-skill* skill carries its own copy of the shared/ files it uses, and the
// copies must stay identical: change one, change them all.

import { spawn } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = resolve(HERE, "../..");
export const PROJECT_ROOT = resolve(HERE, "../../../../..");
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

/** Exit codes for every step script. */
export const EXIT = { ok: 0, failed: 1, drop: 2, blocked: 3 };

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

/** The user's temp folder with symlinks resolved; agy's tools see /private/var/..., not /var/... */
export function realTmp() {
  return realpathSync(process.env.TMPDIR || tmpdir());
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Regular files and symlinks under `dir`, minus folders listed in `skip`. */
export function listFiles(dir, skip = new Set(), root = dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name);
    const rel = relative(root, abs).split("\\").join("/");
    if (ent.isSymbolicLink()) acc.push({ rel, abs, size: 0, symlink: true });
    else if (ent.isDirectory()) {
      if (ent.name === ".git" || ent.name === "node_modules" || skip.has(abs)) continue;
      listFiles(abs, skip, root, acc);
    } else if (ent.isFile()) acc.push({ rel, abs, size: lstatSync(abs).size, symlink: false });
  }
  return acc;
}
