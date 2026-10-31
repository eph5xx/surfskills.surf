// Run's own helpers: the self-test cache and the copy-out rules.

import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { extname, join } from "node:path";
import { agyVersion, settingsHash } from "./shared/agy.mjs";
import { CARDS_DIR, readJSON } from "./shared/core.mjs";

export const RUN_CACHE = join(CARDS_DIR, ".run");

export const SELFTEST_CACHE = join(RUN_CACHE, "selftest.json");

/** agy models for Run. The self-test runs on the agent's model, so changing it re-runs the self-test. */
export const RUN_MODELS = {
  agent: process.env.SURF_RUN_AGENT_MODEL || "gemini-3.8-flash-high",
  standIn: process.env.SURF_RUN_STANDIN_MODEL || "gemini-3.8-flash-low",
  reviewer: process.env.SURF_RUN_REVIEW_MODEL || "gemini-3.8-flash-high",
};

/** null when a passing self-test is cached for this agy version, agent model and lockdown, else why not. */
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
  if (c.agent_model !== RUN_MODELS.agent) return `the agent model changed (${c.agent_model || "none"} -> ${RUN_MODELS.agent})`;
  if (c.settings_hash !== settingsHash()) return "the lockdown settings changed";
  return null;
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
