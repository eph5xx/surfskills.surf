// GitHub's REST API and repo downloads.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { log, mapLimit } from "./core.mjs";

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
