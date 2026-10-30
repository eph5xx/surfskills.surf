// Video's own helpers. Video renders with HyperFrames (Apache-2.0, Copyright 2026
// HeyGen, Inc.), run as a pinned tool through npx. None of its files are copied into
// this skill.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { CARDS_DIR, parseFrontmatter, readJSON, runCmd } from "./shared/core.mjs";

/** Pinned: the newest release at least two weeks old when Video was built. */
export const HYPERFRAMES_VERSION = "0.8.162";
// GSAP runs inside the composition. Downloaded once, checked, never committed.
const GSAP = {
  version: "3.14.2",
  sha256: "c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280",
};
export const VIDEO_CACHE = join(CARDS_DIR, ".video");
/** agy models for Video: Gemini only, so Video draws on the same agy quota as Run. Flash as reviewer wandered outside its folder; a denied read ends a headless run. */
export const VIDEO_MODELS = {
  author: process.env.SURF_VIDEO_AUTHOR_MODEL || "gemini-4-argon-high",
  reviewer: process.env.SURF_VIDEO_REVIEW_MODEL || "gemini-4-argon-high",
};

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
