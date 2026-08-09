#!/usr/bin/env node
// Step 5 — the single-treatment video build. Three subcommands over the same run:
//
//   node video.mjs stage    <owner/repo>   stage video/project/ per the approved scenario
//   node video.mjs finalize <owner/repo>   project render -> 720p mp4 + poster jpg in
//                                          video/final/ (LOCAL only — nothing uploaded).
//                                          Black-checks the frame, records steps.video=built.
//   node video.mjs upload   <owner/repo>   push the built mp4 + poster to the
//                                          media bucket via wrangler; records
//                                          steps.video=done. Run ONLY after the user
//                                          approved the local clip.
//
// The split adds a human gate: finalize produces a reviewable clip and the
// black-check still hard-stops a broken render, but the clip goes to the CDN
// only once the user approves it and `upload` runs. stage needs steps.scenario
// approved; upload needs steps.video=built. ffmpeg + ffprobe required for
// finalize; upload needs this repo's wrangler auth (it runs
// `npx wrangler r2 object put --remote` here) plus MEDIA_* config.

import { spawnSync } from "node:child_process";
import {
  SITE_ROOT_HINT,
  existsSync,
  fillDirFor,
  join,
  loadMediaEnv,
  mkdirSync,
  parseRepoUrl,
  readdirSync,
  requireRun,
  requireStep,
  resolveSiteRoot,
  saveRun,
} from "../lib.mjs";
import { ffprobeSpec, lumaAvg, stageProject } from "./lib.mjs";

function ctx(repoArg, slugArg) {
  const { owner, repo } = parseRepoUrl(repoArg);
  if (!slugArg) {
    process.stderr.write("Missing <pageSlug>. Usage: video.mjs <stage|finalize> <owner/repo> <pageSlug>\n");
    process.exit(2);
  }
  const run = requireRun(owner, repo, slugArg);
  const videoDir = join(fillDirFor(owner, repo, slugArg), "video");
  const enrich = requireStep(run, "enrich", ["done"]);
  const entry = enrich.skills.find((s) => s.pageSlug === run.skill);
  if (!entry) {
    process.stderr.write(`run.skill "${run.skill}" not among enriched skills.\n`);
    process.exit(1);
  }
  const slug = run.steps.card?.skill?.moduleSlug || entry.moduleSlugDefault;
  return { owner, repo, run, videoDir, slug };
}

// ---- stage -------------------------------------------------------------------

function stage(repoArg, slugArg) {
  const { owner, repo, run, videoDir } = ctx(repoArg, slugArg);
  const scenario = requireStep(run, "scenario", ["approved"]);
  if (!scenario.treatment || !scenario.beat3Concept) {
    process.stderr.write("scenario needs treatment + beat3Concept (the single-treatment shape).\n");
    process.exit(1);
  }
  const dir = join(videoDir, "project");
  const banner =
    `TREATMENT: ${scenario.treatment}. Concept: ${scenario.beat3Concept}. ` +
    `${scenario.affordance ? "Affordance: " + scenario.affordance + ". " : ""}` +
    `Rebuild ONLY beat 3 (#result) around the REAL run output; keep beats 1/2/4.`;
  const res = stageProject(dir, scenario.commandLine, { banner });
  console.log(`${res.stamped ? "+" : "!"} ${scenario.treatment} -> ${dir}`);
  run.steps.video = { status: "staged", treatment: scenario.treatment };
  saveRun(owner, repo, run);
  console.log(`\nStaged. Author #result, render to project/renders/main.mp4,`);
  console.log(`then: node video.mjs finalize ${owner}/${repo} ${run.skill}`);
}

// ---- finalize ----------------------------------------------------------------

function findRender(projectDir) {
  const rdir = join(projectDir, "renders");
  if (!existsSync(rdir)) return null;
  const mp4s = readdirSync(rdir).filter((f) => f.toLowerCase().endsWith(".mp4"));
  if (!mp4s.length) return null;
  const pick = mp4s.find((f) => f === "main.mp4") || mp4s.find((f) => !f.startsWith("_")) || mp4s[0];
  return join(rdir, pick);
}

/**
 * "present" | "absent" | "unknown". The three cases are NOT interchangeable:
 * "unknown" (the probe itself failed, or the CDN answered something other than
 * 200/404) must never be read as "free to write" — see pickName.
 */
async function cdnProbe(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return "present";
    if (res.status === 404) return "absent";
    return "unknown"; // 5xx, 403, a captive portal… — no evidence either way
  } catch {
    return "unknown";
  }
}

// Uploaded names are immutable (1-year CDN cache): if <slug>-demo.mp4 is taken,
// bump to <slug>-demo-v2 etc. and update the row — never overwrite in place.
// A failed probe therefore has to STOP the upload: treating it as "absent" would
// silently overwrite a live clip that is then cached wrong for a year.
async function pickName(mediaBase, slug) {
  for (let v = 1; v <= 20; v++) {
    const name = v === 1 ? `${slug}-demo` : `${slug}-demo-v${v}`;
    const state = await cdnProbe(`${mediaBase}/skills/${name}.mp4`);
    if (state === "absent") return name;
    if (state === "unknown") {
      process.stderr.write(
        `Could not tell whether ${name}.mp4 already exists on the CDN (probe failed).\n` +
          `Uploads are immutable and cached for a year, so refusing to risk overwriting it. ` +
          `Check the connection to ${mediaBase} and re-run upload — nothing was written.\n`,
      );
      process.exit(1);
    }
  }
  process.stderr.write(`All names ${slug}-demo through -v20 exist on the CDN — pick a new moduleSlug.\n`);
  process.exit(1);
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

// finalize builds the reviewable clip LOCALLY and stops. It decides no CDN name
// (that's upload's job, after approval), so the files use fixed local names.
async function finalize(repoArg, slugArg) {
  const { owner, repo, run, videoDir } = ctx(repoArg, slugArg);
  const projectDir = join(videoDir, "project");
  const render = findRender(projectDir);
  if (!render) {
    process.stderr.write(`No render under ${join(projectDir, "renders")} — stage + author first.\n`);
    process.exit(1);
  }
  const finalDir = join(videoDir, "final");
  mkdirSync(finalDir, { recursive: true });
  const mp4 = join(finalDir, "demo.mp4");
  const poster = join(finalDir, "poster.jpg");

  // shelf pass — 720p, libx264, silent, faststart (the proven command)
  const ff = spawnSync("ffmpeg", [
    "-y", "-i", render,
    "-vf", "scale=1280:720:flags=lanczos",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-preset", "veryslow", "-crf", "23",
    "-an", "-movflags", "+faststart",
    mp4,
  ], { stdio: ["ignore", "ignore", "inherit"] });
  if (ff.status !== 0) {
    process.stderr.write("! ffmpeg shelf pass failed\n");
    process.exit(ff.status || 1);
  }

  // poster — a representative result frame (~60% in, capped at 7s)
  const spec = ffprobeSpec(mp4);
  const seek = Number.isFinite(spec.dur) && spec.dur > 0 ? Math.min(7, Math.max(1, spec.dur * 0.6)) : 7;
  const fp = spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(seek), "-i", mp4,
    "-frames:v", "1", "-q:v", "3", poster], { stdio: ["ignore", "ignore", "inherit"] });
  if (fp.status !== 0 || !existsSync(poster)) {
    process.stderr.write("! poster extraction failed\n");
    process.exit(1);
  }

  // Black-check BEFORE the clip reaches review. Limited-range black encodes
  // Y=16; at/under ~24 = a fully-black frame (the nested-<video> silent
  // failure). A hard stop here keeps a broken render out of the approval gate.
  const luma = lumaAvg(poster);
  if (luma != null && luma < 24) {
    process.stderr.write(
      `! poster frame is near-black (luma ${luma.toFixed(1)}) — the render is broken ` +
        `(classic nested-<video> failure: the <video> must be a direct child of #root). ` +
        `Fix #result, re-render, re-finalize. Nothing was uploaded.\n`,
    );
    process.exit(1);
  }

  const warns = [];
  if (spec.res !== "1280x720") warns.push(`resolution ${spec.res}, expected 1280x720`);
  if (spec.hasAudio) warns.push("audio present — previews must be silent");
  if (spec.kb < 150 || spec.kb > 700) warns.push(`size ${spec.kb.toFixed(0)} KB outside the 150-700 KB band`);
  if (Number.isFinite(spec.dur) && (spec.dur < 9 || spec.dur > 13)) warns.push(`duration ${spec.dur.toFixed(1)}s outside ~10-12s`);

  run.steps.video = {
    ...(run.steps.video || {}),
    status: "built",
    demoMp4: mp4,
    posterJpg: poster,
    warns,
    spec: {
      // ffprobe can fail to read a duration; record null rather than a NaN that
      // JSON.stringify would quietly flatten anyway.
      durationSec: Number.isFinite(spec.dur) ? +spec.dur.toFixed(2) : null,
      resolution: spec.res,
      sizeKB: Math.round(spec.kb),
    },
  };
  saveRun(owner, repo, run);

  console.log(`Built (local — nothing uploaded yet):`);
  const durLabel = Number.isFinite(spec.dur) ? `${spec.dur.toFixed(1)}s` : "duration unknown";
  console.log(`  watch:  ${mp4}  (${spec.res}, ${durLabel}, ${spec.kb.toFixed(0)} KB)`);
  console.log(`  poster: ${poster}`);
  if (warns.length) { console.log("  ⚠ off-spec:"); for (const w of warns) console.log(`    - ${w}`); }
  console.log(`\nReview the clip, then — after approval — push it to the CDN:`);
  console.log(`  node video.mjs upload ${owner}/${repo} ${run.skill}`);
}

// ---- upload ------------------------------------------------------------------

// upload pushes the already-built local clip to R2. Run ONLY after the user
// approved it — this is the outward-facing gate the finalize/upload split adds.
async function upload(repoArg, slugArg) {
  const { owner, repo, run, videoDir, slug } = ctx(repoArg, slugArg);
  const video = requireStep(run, "video", ["built"]);
  const mp4 = video.demoMp4 || join(videoDir, "final", "demo.mp4");
  const poster = video.posterJpg || join(videoDir, "final", "poster.jpg");
  if (!existsSync(mp4) || !existsSync(poster)) {
    process.stderr.write(`Built clip missing (${mp4} / ${poster}) — re-run finalize first.\n`);
    process.exit(1);
  }
  const siteRoot = resolveSiteRoot();
  if (!siteRoot) {
    process.stderr.write(`${SITE_ROOT_HINT}\n`);
    process.exit(1);
  }
  const media = loadMediaEnv(siteRoot);
  const name = await pickName(media.base, slug);

  r2Put(siteRoot, media.bucket, `skills/${name}.mp4`, mp4, "video/mp4");
  r2Put(siteRoot, media.bucket, `skills/${name}.jpg`, poster, "image/jpeg");
  const previewVideo = `${media.base}/skills/${name}.mp4`;
  const previewImage = `${media.base}/skills/${name}.jpg`;
  // Post-upload liveness is only informational: the edge often 404s a fresh
  // object for a minute, so anything but a confirmed hit is just a note.
  const warns = [];
  for (const url of [previewVideo, previewImage]) {
    if ((await cdnProbe(url)) !== "present") warns.push(`${url} not reachable yet — recheck in a minute`);
  }

  run.steps.video = {
    ...video,
    status: "done",
    previewVideo,
    previewImage,
  };
  saveRun(owner, repo, run);

  console.log(`Uploaded as ${name}:`);
  console.log(`  ${previewVideo}`);
  console.log(`  ${previewImage}`);
  if (warns.length) { console.log("  ⚠"); for (const w of warns) console.log(`    - ${w}`); }
  console.log(`\nNext: node publish.mjs --review ${owner}/${repo} ${run.skill}`);
}

// ---- dispatch ----------------------------------------------------------------

const [cmd, repoArg, slugArg] = process.argv.slice(2);
if (cmd === "stage" && repoArg) stage(repoArg, slugArg);
else if (cmd === "finalize" && repoArg) await finalize(repoArg, slugArg);
else if (cmd === "upload" && repoArg) await upload(repoArg, slugArg);
else {
  process.stderr.write(
    "Usage:\n  video.mjs stage <owner/repo> <pageSlug>\n" +
      "  video.mjs finalize <owner/repo> <pageSlug>   (build local clip for review)\n" +
      "  video.mjs upload <owner/repo> <pageSlug>     (push approved clip to the CDN)\n",
  );
  process.exit(2);
}
