#!/usr/bin/env node
// Video step 3: build the video, check it, review it and finish it. Implements
// references/5-video/README.md step 3, build-rules.md and review.md; keep them in sync.
//
// Up to 3 rounds. In each, the author (locked agy) writes the result part; code checks
// it; HyperFrames checks and renders a draft; code checks the draft; a reviewer (locked
// agy, another model) scores stills. Problems or the reviewer's fixes go back to the
// author. When a round passes: a final render, shrunk to 1280x720 under 700 KB, and a
// cover still at the reviewer's pick.
//
// Writes video/work/project/ (the page HyperFrames renders), video/work/rounds/<n>/,
// and at the end video/demo.mp4, video/cover.jpg, video/review.json and video.json.
//
// Usage: node video-build.mjs <card>   (up to 25 minutes: run it in the background)
// Last line: `video: ok …` (exit 0), `failed: …` (exit 1) or `blocked: …` (exit 3).

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkComposition, checkFragment, checkMp4, VIDEO } from "./video-check.mjs";
import {
  EXIT,
  SKILL_ROOT,
  VIDEO_MODELS,
  agyJson,
  ensureGsap,
  existsSync,
  ffmpeg,
  ffprobe,
  findChrome,
  hyperframes,
  join,
  log,
  makeRunDir,
  mdSection,
  missingVideoTools,
  readJSON,
  validateSchema,
  videoTask,
  writeJSON,
} from "./lib.mjs";

const MAX_ROUNDS = 3;
const LIMIT_S = 22 * 60; // no new round starts after this, minus a round's worst case
const ROUND_S = 6 * 60;
const PASS = 4; // every review score must be at least this
const SCORES = ["value", "readable", "looks", "honest"];
const STILL_TIMES = [1.0, 3.6, 5.0, 6.5, 8.2, 9.8];
const TILE_TIMES = Array.from({ length: 9 }, (_, i) => Math.round((3.25 + i * 0.625) * 1000) / 1000);
const REFS = join(SKILL_ROOT, "references", "5-video");
const ASSETS = join(SKILL_ROOT, "assets");

const started = Date.now();
const elapsed = () => (Date.now() - started) / 1000;

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

/** Fill the frame's fixed slots; the result slots stay for each round. One pass, so values are never re-scanned. */
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

async function authorTurn(ctx, round, feedback) {
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
      round,
    });
    if (feedback) {
      mkdirSync(join(ws, "previous"), { recursive: true });
      writeJSON(join(ws, "previous", "fragment.json"), feedback.frag);
      writeFileSync(join(ws, "previous", "feedback.md"), feedback.text);
      if (feedback.stills) cpSync(feedback.stills, join(ws, "previous", "stills"), { recursive: true });
    }
    const prompt = [
      mdSection(join(REFS, "style.md"), "Principles"),
      "",
      "## Your task",
      "",
      mdSection(join(REFS, "style.md"), "Author brief"),
      "",
      readFileSync(join(REFS, "build-rules.md"), "utf8"),
      feedback ? `\nThis is round ${round}. Read previous/feedback.md first.` : "",
    ].join("\n");
    // One retry: a single agy hiccup shouldn't cost a round.
    let r;
    for (let attempt = 1; attempt <= 2; attempt++) {
      r = await agyJson({
        cwd: ws,
        prompt,
        schemaPath: join(ASSETS, "video-author.schema.json"),
        timeoutS: 480,
        model: VIDEO_MODELS.author,
      });
      if (r.ok) {
        const errs = await validateSchema("video-author", r.output);
        if (!errs.length) return r;
        r = { ok: false, error: `invalid answer: ${errs.join("; ")}` };
      }
      if (r.blocked) return r;
      log(`author attempt ${attempt} failed: ${r.error.slice(0, 200)}`);
    }
    return r;
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

async function reviewTurn(ctx, stillsDir) {
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const run = makeRunDir(`video-review-${ctx.name}`);
    try {
      const ws = run.ws;
      mkdirSync(join(ws, "stills"), { recursive: true });
      for (const f of readdirSync(stillsDir)) {
        cpSync(join(stillsDir, f), f === "tiles.jpg" ? join(ws, "tiles.jpg") : join(ws, "stills", f));
      }
      cpSync(join(ctx.work, "media"), join(ws, "media"), { recursive: true });
      cpSync(join(ctx.card, "video", "storyboard.json"), join(ws, "storyboard.json"));
      writeJSON(join(ws, "task.json"), { ...ctx.task, tile_times_s: TILE_TIMES, still_times_s: STILL_TIMES });
      last = await agyJson({
        cwd: ws,
        prompt: mdSection(join(REFS, "review.md"), "Reviewer brief"),
        schemaPath: join(ASSETS, "video-review.schema.json"),
        timeoutS: 300,
        model: VIDEO_MODELS.reviewer,
      });
    } finally {
      rmSync(run.dir, { recursive: true, force: true });
    }
    if (last.blocked) return last;
    if (last.ok) {
      const errs = await validateSchema("video-review", last.output);
      if (!errs.length) return last;
      last = { ok: false, error: `invalid verdict: ${errs.join("; ")}` };
    }
    log(`reviewer attempt ${attempt} failed: ${last.error}`);
  }
  return last;
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

async function finish(ctx, round, review, rounds) {
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
  await ffmpeg(["-ss", String(review.cover_at), "-i", final, "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos", "-q:v", "3", join(ctx.card, "video", "cover.jpg")]);

  const scores = Object.fromEntries(SCORES.map((k) => [k, review[k].score]));
  writeJSON(join(ctx.card, "video", "review.json"), {
    models: VIDEO_MODELS,
    passed_round: round,
    scores,
    cover_at: review.cover_at,
    summary: review.summary,
    crf,
    rounds,
  });
  const videoJson = { video: "video/demo.mp4", cover: "video/cover.jpg", rounds: round };
  const errs = await validateSchema("video", videoJson);
  if (errs.length) out(`failed: video.json is invalid: ${errs.join("; ")}`, EXIT.failed);
  writeJSON(join(ctx.card, "video.json"), videoJson);
  const kb = Math.round((await ffprobe(demo)).bytes / 1024);
  out(`video: ok (round ${round}, ${kb} KB, scores ${SCORES.map((k) => `${k} ${scores[k]}`).join(", ")})`, EXIT.ok);
}

// --- main ----------------------------------------------------------------------

function feedbackText(round, rec) {
  if (rec.stage !== "review") {
    return `Round ${round} failed the code checks, so nothing was rendered or reviewed. Fix every problem:\n\n${rec.problems.map((p) => `- ${p}`).join("\n")}\n`;
  }
  return [
    `Round ${round} passed the code checks and was reviewed. It passes only when every score is ${PASS} or 5.`,
    "",
    ...SCORES.map((k) => `- ${k}: ${rec.review[k].score}/5. ${rec.review[k].reason}`),
    "",
    "The reviewer's fixes, most important first:",
    "",
    ...(rec.review.fixes.length ? rec.review.fixes.map((f, i) => `${i + 1}. ${f}`) : ["(none listed)"]),
    "",
    `previous/stills/ shows your draft: t<seconds>.jpg at full size, and tiles.jpg with 9 frames at tile size (times ${TILE_TIMES.join(", ")} s, row by row).`,
  ].join("\n");
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: video-build.mjs <card>");
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

  // A rerun starts clean, so a failed build never leaves an older video.json behind.
  for (const f of ["video.json", "video/demo.mp4", "video/cover.jpg", "video/review.json"]) rmSync(join(card, f), { force: true });
  rmSync(join(work, "rounds"), { recursive: true, force: true });

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

  const rounds = [];
  let feedback = null;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (elapsed() > LIMIT_S - ROUND_S) {
      log(`stopping before round ${round}: ${Math.round(elapsed() / 60)} min used`);
      break;
    }
    const dir = join(work, "rounds", String(round));
    mkdirSync(dir, { recursive: true });
    log(`round ${round}: author (${VIDEO_MODELS.author})`);
    const a = await authorTurn(ctx, round, feedback);
    if (!a.ok) {
      if (a.blocked) out(`blocked: ${a.blocked}`, EXIT.blocked);
      const rec = { round, stage: "author", problems: [`the author did not answer: ${a.error}`] };
      rounds.push(rec);
      log(`FAIL ${rec.problems[0]}`);
      continue; // same feedback again
    }
    const frag = a.output;
    writeJSON(join(dir, "fragment.json"), frag);

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
    if (problems.length) {
      const rec = { round, stage, problems, author_notes: frag.notes };
      rounds.push(rec);
      writeJSON(join(dir, "problems.json"), rec);
      for (const p of problems) log(`FAIL ${stage}: ${p}`);
      feedback = { frag, text: feedbackText(round, rec) };
      continue;
    }

    log(`round ${round}: review (${VIDEO_MODELS.reviewer})`);
    const stillsDir = join(dir, "stills");
    await stills(draft, stillsDir);
    const r = await reviewTurn(ctx, stillsDir);
    if (!r.ok) {
      if (r.blocked) out(`blocked: ${r.blocked}`, EXIT.blocked);
      out(`failed: the video reviewer did not answer: ${r.error}`, EXIT.failed);
    }
    const review = r.output;
    writeJSON(join(dir, "review.json"), review);
    const pass = SCORES.every((k) => review[k].score >= PASS);
    const rec = { round, stage: "review", pass, review, author_notes: frag.notes };
    rounds.push(rec);
    log(`${pass ? "pass" : "FAIL"} review: ${SCORES.map((k) => `${k} ${review[k].score}`).join(", ")}: ${review.summary}`);
    if (pass) return finish(ctx, round, review, rounds);
    feedback = { frag, text: feedbackText(round, rec), stills: stillsDir };
  }

  const last = rounds[rounds.length - 1];
  const why = !last
    ? "no round ran"
    : last.stage === "review"
      ? `the reviewer scored ${SCORES.map((k) => `${k} ${last.review[k].score}`).join(", ")}: ${last.review.summary}`
      : `${last.stage}: ${last.problems.slice(0, 3).join("; ")}`;
  out(`failed: no draft passed in ${rounds.length} round(s); last: ${why}`, EXIT.failed);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: video-build crashed: ${e.message}`, EXIT.failed);
});
