#!/usr/bin/env node
// Video step 3: build the video, check it, review it and finish it. Implements
// SKILL.md step 3, references/build-rules.md and references/review.md; keep them in sync.
//
// One try, no retries, like every other step: the author (locked agy) writes the result
// part; code checks it; HyperFrames checks and renders a draft; code checks the draft; a
// reviewer (locked agy, fresh session) scores stills. Any failure, or any review score of
// 1, stops the build for the owner to look at. Otherwise the draft is finished as is: a
// final render, shrunk to 1280x720 under 700 KB, and a cover still at the reviewer's pick.
//
// Writes video/work/project/ (the page HyperFrames renders), video/work/try/ (the
// fragment, the draft, its stills and the review), and at the end video/demo.mp4,
// video/cover.jpg, video/review.json and video.json.
//
// Usage: node video-build.mjs <card>   (about 15 minutes: run it in the background)
//        node video-build.mjs <card> --finish   finish the try's draft as a person
//        watched and approved it: no AI calls.
// Last line: `ok: …` (exit 0), `failed: …` (exit 1) or `blocked: …` (exit 3).

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkComposition, checkFragment, checkMp4, VIDEO } from "./video-check.mjs";
import { VIDEO_MODELS, ensureGsap, ffmpeg, ffprobe, hyperframes, missingVideoTools, videoTask } from "./video-lib.mjs";
import {
  EXIT,
  SKILL_ROOT,
  existsSync,
  join,
  log,
  mdSection,
  readJSON,
  validateSchema,
  writeJSON,
} from "./shared/core.mjs";
import { agyJson, makeRunDir } from "./shared/agy.mjs";
import { findChrome } from "./shared/chrome.mjs";

const STOP_AT = 1; // any review score at or below this stops the build
const COVER_AT = 6.0; // the cover when no review picked one
const SCORES = ["value", "readable", "looks", "honest"];
const STILL_TIMES = [1.0, 3.6, 5.0, 6.5, 8.2, 9.8];
const TILE_TIMES = Array.from({ length: 9 }, (_, i) => Math.round((3.25 + i * 0.625) * 1000) / 1000);
const REFS = join(SKILL_ROOT, "references");
const ASSETS = join(SKILL_ROOT, "assets");

function out(line, code) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mono command size so it fits 1640 px in at most three lines. */
function commandSize(len) {
  if (len <= 24) return 104;
  if (len <= 40) return 88;
  if (len <= 64) return 76;
  return 64;
}

/** Fill the frame's fixed slots; the result slots stay for the author's part. One pass, so values are never re-scanned. */
function frameFor(task) {
  const command = task.command.length > 120 ? task.command.slice(0, 119) + "…" : task.command;
  const values = {
    COMMAND_SIZE: String(commandSize(command.length)),
    NAME_SIZE: String(Math.min(150, Math.floor(1640 / (0.56 * Math.max(1, task.skill_name.length + 1))))),
    COMMAND: escapeHtml(command),
    SKILL_NAME: escapeHtml(task.skill_name),
    SKILL_BY: escapeHtml(task.by),
  };
  const frame = readFileSync(join(ASSETS, "video", "frame.html"), "utf8");
  return frame.replace(/__(COMMAND_SIZE|NAME_SIZE|COMMAND|SKILL_NAME|SKILL_BY)__/g, (_, k) => values[k]);
}

function assemble(frame, frag) {
  const parts = { CSS: frag.css, MARKUP: frag.markup, TIMELINE: frag.timeline_js };
  return frame.replace(/__RESULT_(CSS|MARKUP|TIMELINE)__/g, (_, k) => parts[k]);
}

function walk(dir, rel = "") {
  const files = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) files.push(...walk(dir, r));
    else if (e.isFile()) files.push(r);
  }
  return files;
}

/** The HyperFrames project: fonts, GSAP and the captured media, with no index.html yet. */
async function stageProject(work) {
  const dir = join(work, "project");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "assets"), { recursive: true });
  cpSync(join(ASSETS, "video", "fonts"), join(dir, "assets", "fonts"), { recursive: true });
  cpSync(await ensureGsap(), join(dir, "assets", "gsap.min.js"));
  cpSync(join(work, "media"), join(dir, "media"), { recursive: true });
  return dir;
}

// --- the two AI turns --------------------------------------------------------

/** One author call, no retry: a failed answer stops the build. */
async function authorTurn(ctx) {
  const run = makeRunDir(`video-author-${ctx.name}`);
  try {
    const ws = run.ws;
    cpSync(join(ctx.work, "media"), join(ws, "media"), { recursive: true });
    cpSync(join(ctx.work, "facts.json"), join(ws, "facts.json"));
    cpSync(join(ctx.card, "video", "storyboard.json"), join(ws, "storyboard.json"));
    cpSync(join(ASSETS, "video", "frame.html"), join(ws, "frame.html"));
    writeJSON(join(ws, "task.json"), {
      ...ctx.task,
      result_window_s: VIDEO.window,
      safe_area_px: VIDEO.safe,
      min_text_px: VIDEO.minTextPx,
    });
    const prompt = [
      mdSection(join(REFS, "style.md"), "Principles"),
      "",
      "## Your task",
      "",
      mdSection(join(REFS, "style.md"), "Author brief"),
      "",
      readFileSync(join(REFS, "build-rules.md"), "utf8"),
    ].join("\n");
    const r = await agyJson({
      cwd: ws,
      prompt,
      schemaPath: join(ASSETS, "video-author.schema.json"),
      timeoutS: 480,
      model: VIDEO_MODELS.author,
    });
    if (!r.ok) return r;
    const errs = await validateSchema("video-author", r.output);
    return errs.length ? { ok: false, error: `invalid answer: ${errs.join("; ")}` } : r;
  } finally {
    rmSync(run.dir, { recursive: true, force: true });
  }
}

/** Full-size stills and a 3x3 sheet at tile size, into `dir`. */
async function stills(draft, dir) {
  mkdirSync(dir, { recursive: true });
  for (const t of STILL_TIMES) {
    await ffmpeg(["-ss", String(t), "-i", draft, "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos", "-q:v", "3", join(dir, `t${t.toFixed(1)}.jpg`)]);
  }
  const sel = TILE_TIMES.map((t) => `eq(n\\,${Math.round(t * VIDEO.fps)})`).join("+");
  await ffmpeg(["-i", draft, "-vf", `select='${sel}',scale=400:225:flags=lanczos,tile=3x3`, "-fps_mode", "passthrough", "-frames:v", "1", "-q:v", "3", join(dir, "tiles.jpg")]);
}

/** One reviewer call, no retry: a failed answer stops the build. */
async function reviewTurn(ctx, stillsDir) {
  const run = makeRunDir(`video-review-${ctx.name}`);
  let r;
  try {
    const ws = run.ws;
    mkdirSync(join(ws, "stills"), { recursive: true });
    for (const f of readdirSync(stillsDir)) {
      cpSync(join(stillsDir, f), f === "tiles.jpg" ? join(ws, "tiles.jpg") : join(ws, "stills", f));
    }
    cpSync(join(ctx.work, "media"), join(ws, "media"), { recursive: true });
    cpSync(join(ctx.card, "video", "storyboard.json"), join(ws, "storyboard.json"));
    writeJSON(join(ws, "task.json"), { ...ctx.task, tile_times_s: TILE_TIMES, still_times_s: STILL_TIMES });
    r = await agyJson({
      cwd: ws,
      prompt: mdSection(join(REFS, "review.md"), "Reviewer brief"),
      schemaPath: join(ASSETS, "video-review.schema.json"),
      timeoutS: 420, // its think is ~21k tokens: 3 minutes on a fast day, 6 on a slow one
      model: VIDEO_MODELS.reviewer,
    });
  } finally {
    rmSync(run.dir, { recursive: true, force: true });
  }
  if (!r.ok) return r;
  const errs = await validateSchema("video-review", r.output);
  return errs.length ? { ok: false, error: `invalid verdict: ${errs.join("; ")}` } : r;
}

// --- the checks HyperFrames runs, and rendering --------------------------------

/** `hyperframes check --json`: every error-level finding, as problems. */
async function hyperframesCheck(dir) {
  const r = await hyperframes(["check", "--json", "."], dir, 240);
  let j;
  try {
    j = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  } catch {
    throw new Error(`hyperframes check gave no report: ${(r.stderr || r.stdout).trim().split("\n").slice(-2).join(" ").slice(0, 300)}`);
  }
  const problems = [];
  for (const part of ["lint", "runtime", "layout", "motion", "contrast"]) {
    for (const f of j[part]?.findings || []) {
      if (f.severity !== "error") continue;
      const where = [f.selector, f.text ? `"${String(f.text).slice(0, 40)}"` : "", f.time !== undefined ? `at ${Number(f.time).toFixed(1)} s` : ""].filter(Boolean).join(" ");
      problems.push(`${part}: ${f.message}${where ? ` (${where})` : ""}`);
    }
  }
  return [...new Set(problems)].slice(0, 12);
}

async function render(dir, file, quality) {
  rmSync(file, { force: true });
  const r = await hyperframes(["render", "-q", quality, "-o", file, "."], dir, 420);
  if (r.code !== 0 || !existsSync(file)) {
    const tail = (r.stderr || r.stdout).trim().split("\n").slice(-3).join(" ").slice(0, 300);
    return r.timedOut ? "the render timed out" : `the render failed: ${tail}`;
  }
  return null;
}

// --- finishing -----------------------------------------------------------------

async function finish(ctx, review, chosenBy) {
  const coverAt = review?.cover_at ?? COVER_AT;
  const final = join(ctx.project, "renders", "final.mp4");
  const why = await render(ctx.project, final, "high");
  if (why) out(`failed: final ${why}`, EXIT.failed);
  const demo = join(ctx.card, "video", "demo.mp4");
  let crf = 23;
  for (; crf <= 33; crf += 2) {
    await ffmpeg([
      "-i", final, "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-preset", "veryslow", "-crf", String(crf), "-an", "-movflags", "+faststart", demo,
    ], 300);
    if ((await ffprobe(demo)).bytes <= VIDEO.maxBytes) break;
  }
  const problems = await checkMp4(demo, { width: 1280, height: 720, maxBytes: VIDEO.maxBytes });
  if (problems.length) out(`failed: the finished video: ${problems.join("; ")}`, EXIT.failed);
  await ffmpeg(["-ss", String(coverAt), "-i", final, "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos", "-q:v", "3", join(ctx.card, "video", "cover.jpg")]);

  const scores = review ? Object.fromEntries(SCORES.map((k) => [k, review[k].score])) : null;
  writeJSON(join(ctx.card, "video", "review.json"), {
    models: VIDEO_MODELS,
    chosen_by: chosenBy,
    scores,
    cover_at: coverAt,
    summary: review?.summary ?? null,
    fixes: review?.fixes ?? [],
    crf,
  });
  const videoJson = { video: "video/demo.mp4", cover: "video/cover.jpg", rounds: 1 };
  const errs = await validateSchema("video", videoJson);
  if (errs.length) out(`failed: video.json is invalid: ${errs.join("; ")}`, EXIT.failed);
  writeJSON(join(ctx.card, "video.json"), videoJson);
  const kb = Math.round((await ffprobe(demo)).bytes / 1024);
  const how = scores ? `scores ${SCORES.map((k) => `${k} ${scores[k]}`).join(", ")}` : "not reviewed";
  out(`ok: (chosen by ${chosenBy}, ${kb} KB, ${how})`, EXIT.ok);
}

// --- main ----------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: video-build.mjs <card> [--finish]");
    process.exit(2);
  }
  const card = resolve(arg);
  const work = join(card, "video", "work");
  for (const f of [join(work, "facts.json"), join(card, "video", "storyboard.json")]) {
    if (!existsSync(f)) out(`failed: ${f.slice(card.length + 1)} is missing; run video-capture.mjs and video-storyboard.mjs first`, EXIT.failed);
  }
  const missing = missingVideoTools();
  if (missing.length) out(`blocked: ${missing.join(", ")} not found`, EXIT.blocked);
  if (!findChrome()) out("blocked: no headless Chromium found (set SURF_CHROME)", EXIT.blocked);

  const finishOnly = process.argv.includes("--finish");
  const dir = join(work, "try");

  // A rerun starts clean, so a failed build never leaves an older video.json behind.
  for (const f of ["video.json", "video/demo.mp4", "video/cover.jpg", "video/review.json"]) rmSync(join(card, f), { force: true });
  if (!finishOnly) rmSync(dir, { recursive: true, force: true });

  let project;
  try {
    project = await stageProject(work);
  } catch (e) {
    out(`blocked: ${e.message}`, EXIT.blocked);
  }
  const task = videoTask(card);
  const ctx = {
    card,
    work,
    project,
    task,
    name: card.split("/").pop(),
    frame: frameFor(task),
    media: new Set(walk(join(project, "media")).map((f) => `media/${f}`)),
    quoteSources: walk(join(work, "media")).filter((f) => f.endsWith(".txt")).map((f) => readFileSync(join(work, "media", f), "utf8")),
  };

  if (finishOnly) {
    // A person watched the try's draft and approved it: rebuild it from its fragment,
    // re-run the code checks, and finish it. No AI calls.
    if (!existsSync(join(dir, "fragment.json"))) out("failed: video/work/try has no fragment.json", EXIT.failed);
    const frag = readJSON(join(dir, "fragment.json"));
    const { stage, problems } = await checkAndRender(ctx, frag);
    if (problems.length) out(`failed: the draft no longer passes the code checks: ${stage}: ${problems.slice(0, 3).join("; ")}`, EXIT.failed);
    const review = existsSync(join(dir, "review.json")) ? readJSON(join(dir, "review.json")) : null;
    return finish(ctx, review, "operator");
  }

  // One try. Every failure stops the build for the owner; nothing is asked twice.
  mkdirSync(dir, { recursive: true });
  log(`author (${VIDEO_MODELS.author})`);
  const a = await authorTurn(ctx);
  if (!a.ok) {
    if (a.blocked) out(`blocked: ${a.blocked}`, EXIT.blocked);
    out(`failed: the author did not answer: ${a.error.slice(0, 300)}`, EXIT.failed);
  }
  const frag = a.output;
  writeJSON(join(dir, "fragment.json"), frag);

  const { stage, problems, draft } = await checkAndRender(ctx, frag);
  if (problems.length) {
    writeJSON(join(dir, "problems.json"), { stage, problems, author_notes: frag.notes });
    out(`failed: ${stage}: ${problems.slice(0, 3).join("; ")}`, EXIT.failed);
  }
  // Keep the draft the reviewer judges, so the owner can always watch it.
  cpSync(draft, join(dir, "draft.mp4"));

  log(`review (${VIDEO_MODELS.reviewer})`);
  const stillsDir = join(dir, "stills");
  await stills(draft, stillsDir);
  const r = await reviewTurn(ctx, stillsDir);
  if (!r.ok) {
    if (r.blocked) out(`blocked: ${r.blocked}`, EXIT.blocked);
    out(`failed: the reviewer did not answer: ${r.error.slice(0, 300)} (draft: video/work/try/draft.mp4)`, EXIT.failed);
  }
  const review = r.output;
  writeJSON(join(dir, "review.json"), review);
  log(`review: ${SCORES.map((k) => `${k} ${review[k].score}`).join(", ")}: ${review.summary}`);
  const low = SCORES.filter((k) => review[k].score <= STOP_AT);
  if (low.length) {
    const why = low.map((k) => `${k} ${review[k].score}: ${review[k].reason}`).join("; ");
    out(`failed: the reviewer scored ${why} (draft: video/work/try/draft.mp4)`, EXIT.failed);
  }
  return finish(ctx, review, "review");
}

/** The code checks, then a draft render: { stage, problems, draft }. Leaves the page in project/index.html. */
async function checkAndRender(ctx, frag) {
  const project = ctx.project;
  let problems = checkFragment(frag, ctx);
  let stage = "fragment";
  if (!problems.length) {
    writeFileSync(join(project, "index.html"), assemble(ctx.frame, frag));
    stage = "hyperframes";
    problems = await hyperframesCheck(project);
  }
  if (!problems.length) {
    stage = "page";
    try {
      problems = await checkComposition(project, ctx);
    } catch (e) {
      if (e.blocked) out(`blocked: ${e.message}`, EXIT.blocked);
      throw e;
    }
  }
  const draft = join(project, "renders", "draft.mp4");
  if (!problems.length) {
    stage = "draft";
    const why = await render(project, draft, "draft");
    problems = why ? [why] : await checkMp4(draft, { width: 1920, height: 1080 });
  }
  return { stage, problems, draft };
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: video-build crashed: ${e.message}`, EXIT.failed);
});
