#!/usr/bin/env node
// Side utility, outside the six steps — generate the missing poster
// (preview_image) for catalog skills that have a preview_video but a null
// preview_image, so their <video poster>, Discover card, and OG image stop
// falling back to the placeholder. It reproduces the exact poster step from
// video.mjs (finalize) for rows that have no run.json to drive it:
//
//   node backfill-posters.mjs build  --ids <id,id,…> [--only <substr>] [--seek <sec>] [--force]
//        For each id: read preview_video from Supabase (skip ones that already
//        have preview_image unless --force), download the mp4, extract one frame
//        (~60% in, capped 7s — same as video.mjs), luma black-check it, and write
//        <basename>.jpg locally. Uploads NOTHING. Writes a manifest for the later
//        steps. --ids takes catalog skill ids (owner/repo/slug), comma-separated
//        or repeated; --only limits to ids/basenames containing <substr>; --seek
//        overrides the frame timestamp for those (re-pick a weak frame).
//
//   node backfill-posters.mjs upload   [--only <substr>]
//        Push each built <basename>.jpg to the media bucket with the immutable
//        1-year cache — same key naming as the video, just .jpg. Run only after
//        eyeballing the local posters. New keys, so no overwrite risk.
//
//   node backfill-posters.mjs set-db   [--only <substr>]
//        PATCH only the preview_image column for each skill id in Supabase (never
//        an upsert — that would need the whole row and could clobber other cols).
//
// Work dir: .fill/_poster-backfill/ (never committed). ffmpeg + ffprobe required for
// build; upload needs wrangler auth in this repo plus MEDIA_* config; upload and
// set-db need the Supabase creds (loadSupabaseEnv).

import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import {
  FILL_ROOT,
  SITE_ROOT_HINT,
  eqId,
  existsSync,
  join,
  loadMediaEnv,
  loadSupabaseEnv,
  mkdirSync,
  resolveSiteRoot,
  sbSelect,
} from "../lib.mjs";
import { ffprobeSpec, lumaAvg } from "./lib.mjs";

const WORK = join(FILL_ROOT, "_poster-backfill");
const MANIFEST = join(WORK, "manifest.json");

// ---- args --------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { ids: [], only: null, seek: null, force: false, acceptDark: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ids") opts.ids.push(...String(argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    else if (a === "--only") opts.only = argv[++i];
    else if (a === "--seek") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n < 0) {
        process.stderr.write(`--seek needs a non-negative number of seconds, got "${argv[i]}".\n`);
        process.exit(2);
      }
      opts.seek = n;
    }
    else if (a === "--force") opts.force = true;
    else if (a === "--accept-dark") opts.acceptDark = true; // OK a below-24 frame you eyeballed (legit dark-themed clip, not the black-render failure)
  }
  return opts;
}

const basenameOf = (url) => url.split("/").pop().replace(/\.[^.]+$/, "");
const matchesOnly = (id, base, only) =>
  !only || id.toLowerCase().includes(only.toLowerCase()) || base.toLowerCase().includes(only.toLowerCase());

function loadManifest() {
  if (!existsSync(MANIFEST)) {
    process.stderr.write(`No manifest at ${MANIFEST} — run \`build\` first.\n`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(MANIFEST, "utf8"));
}

function saveManifest(entries) {
  mkdirSync(WORK, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(entries, null, 2) + "\n");
}

function env() {
  const siteRoot = resolveSiteRoot();
  if (!siteRoot) {
    process.stderr.write(`${SITE_ROOT_HINT}\n`);
    process.exit(1);
  }
  return { siteRoot, sb: loadSupabaseEnv(siteRoot), media: loadMediaEnv(siteRoot) };
}

// ---- build -------------------------------------------------------------------

async function build(opts) {
  if (!opts.ids.length) {
    process.stderr.write("Missing --ids <owner/repo/slug,…> — the catalog skills to backfill.\n");
    process.exit(2);
  }
  const { sb, media } = env();
  mkdirSync(WORK, { recursive: true });
  const manifest = existsSync(MANIFEST) ? loadManifest() : {};

  for (const id of opts.ids) {
    const [row] = await sbSelect(sb, "skills", `${eqId(id)}&select=id,preview_video,preview_image`);
    if (!row) { console.log(`- ${id}: not in catalog — skip`); continue; }
    if (!row.preview_video) { console.log(`- ${id}: no preview_video — skip`); continue; }
    const base = basenameOf(row.preview_video);
    if (!matchesOnly(id, base, opts.only)) continue;
    if (row.preview_image && !opts.force) {
      console.log(`- ${id}: already has preview_image — skip (use --force to redo)`);
      continue;
    }

    const mp4 = join(WORK, `${base}.mp4`);
    const poster = join(WORK, `${base}.jpg`);
    const posterUrl = `${media.base}/skills/${base}.jpg`;

    // download the mp4 (cache locally so re-picking a frame skips the fetch)
    if (!existsSync(mp4)) {
      const res = await fetch(row.preview_video);
      if (!res.ok) { console.log(`! ${base}: download ${res.status} — skip`); continue; }
      writeFileSync(mp4, Buffer.from(await res.arrayBuffer()));
    }

    // one frame, ~60% in capped at 7s (video.mjs convention), or --seek override
    const spec = ffprobeSpec(mp4);
    const seek = opts.seek != null
      ? opts.seek
      : Number.isFinite(spec.dur) && spec.dur > 0 ? Math.min(7, Math.max(1, spec.dur * 0.6)) : 7;
    const fp = spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(seek), "-i", mp4,
      "-frames:v", "1", "-q:v", "3", poster], { stdio: ["ignore", "ignore", "inherit"] });
    if (fp.status !== 0 || !existsSync(poster)) { console.log(`! ${base}: poster extraction failed`); continue; }

    const luma = lumaAvg(poster);
    const black = luma != null && luma < 24 && !opts.acceptDark;

    manifest[base] = {
      id,
      previewVideo: row.preview_video,
      posterFile: poster,
      posterUrl,
      seek: +Number(seek).toFixed(2),
      durationSec: Number.isFinite(spec.dur) ? +spec.dur.toFixed(2) : null,
      luma: luma != null ? +luma.toFixed(1) : null,
      ok: !black,
    };
    saveManifest(manifest);

    const flag = black ? "  ⚠ NEAR-BLACK (luma<24) — re-pick with --seek" : "";
    console.log(`+ ${base}: seek ${seek.toFixed(1)}s / ${spec.dur?.toFixed?.(1) ?? "?"}s, luma ${luma?.toFixed?.(1) ?? "?"}${flag}`);
  }

  console.log(`\nLocal posters in ${WORK}`);
  console.log(`Review the .jpg files, re-pick any weak one:  node backfill-posters.mjs build --ids ${opts.ids.join(",")} --only <name> --seek <sec>`);
  console.log(`Then upload:  node backfill-posters.mjs upload`);
}

// ---- upload ------------------------------------------------------------------

async function cdnExists(url) {
  try { return (await fetch(url, { method: "HEAD" })).ok; } catch { return false; }
}

function r2Put(siteRoot, bucket, key, file, contentType) {
  const res = spawnSync("npx", [
    "wrangler", "r2", "object", "put", `${bucket}/${key}`,
    "--file", file, "--content-type", contentType,
    "--cache-control", "public, max-age=31536000, immutable", "--remote",
  ], { cwd: siteRoot, stdio: ["ignore", "inherit", "inherit"] });
  if (res.status !== 0) {
    process.stderr.write(`! upload failed for ${key} — wrangler authed? (cd ${siteRoot} && npx wrangler login)\n`);
    process.exit(res.status || 1);
  }
}

async function upload(opts) {
  const { siteRoot, media } = env();
  const manifest = loadManifest();
  let n = 0;
  for (const [base, e] of Object.entries(manifest)) {
    if (!matchesOnly(e.id, base, opts.only)) continue;
    if (!e.ok) { console.log(`- ${base}: marked near-black — re-pick before upload, skipping`); continue; }
    if (!existsSync(e.posterFile)) { console.log(`- ${base}: local poster missing — re-run build`); continue; }
    r2Put(siteRoot, media.bucket, `skills/${base}.jpg`, e.posterFile, "image/jpeg");
    const live = await cdnExists(e.posterUrl);
    console.log(`✓ ${base}.jpg → ${e.posterUrl}${live ? "" : "  (not reachable yet — recheck in a minute)"}`);
    n++;
  }
  console.log(`\nUploaded ${n} poster(s). Next:  node backfill-posters.mjs set-db`);
}

// ---- set-db ------------------------------------------------------------------

async function sbPatch(sb, id, patch) {
  const url = `${sb.url}/rest/v1/skills?${eqId(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: sb.secret,
      Authorization: `Bearer ${sb.secret}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH ${id} failed: ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

async function setDb(opts) {
  const { sb } = env();
  const manifest = loadManifest();
  for (const [base, e] of Object.entries(manifest)) {
    if (!matchesOnly(e.id, base, opts.only)) continue;
    if (!e.ok) { console.log(`- ${e.id}: near-black poster — skip`); continue; }
    if (!(await cdnExists(e.posterUrl))) { console.log(`- ${e.id}: ${e.posterUrl} not live yet — run upload first`); continue; }
    const [updated] = await sbPatch(sb, e.id, { preview_image: e.posterUrl });
    console.log(`✓ ${e.id}: preview_image = ${updated?.preview_image ?? e.posterUrl}`);
  }
  console.log(`\nDone. Verify a skill page / Discover card — poster should show (no placeholder).`);
}

// ---- dispatch ----------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
const opts = parseArgs(rest);
if (cmd === "build") await build(opts);
else if (cmd === "upload") await upload(opts);
else if (cmd === "set-db") await setDb(opts);
else {
  process.stderr.write(
    "Usage:\n" +
      "  backfill-posters.mjs build   --ids <owner/repo/slug,…> [--only <substr>] [--seek <sec>] [--force]\n" +
      "  backfill-posters.mjs upload  [--only <substr>]\n" +
      "  backfill-posters.mjs set-db  [--only <substr>]\n",
  );
  process.exit(2);
}
