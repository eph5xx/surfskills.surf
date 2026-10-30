#!/usr/bin/env node
// Video step 2: the storyboard. Implements SKILL.md step 2 and the
// storyboard brief in references/style.md; keep them in sync.
//
// Copies the captured media, facts and task into a fresh folder in $TMPDIR, runs agy
// there locked down (no commands, no network, no writes) with the author model, and
// checks its plan against assets/storyboard.schema.json and the media it names.
// Writes video/storyboard.json.
//
// Usage: node video-storyboard.mjs <card>
// Last line: `ok: …` (exit 0), `failed: …` (exit 1) or `blocked: …` (exit 3).

import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { VIDEO_MODELS, videoTask } from "./video-lib.mjs";
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

const STYLE = join(SKILL_ROOT, "references", "style.md");
const MAX_CAPTION_WORDS = 6;
const ATTEMPTS = 2;

function out(line, code) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

/** Problems code can see in a storyboard: schema, media that exists, caption length. */
async function problemsOf(sb, work) {
  const errs = await validateSchema("storyboard", sb);
  if (errs.length) return errs.map((e) => `schema: ${e}`);
  const problems = [];
  for (const s of sb.shots) {
    if (s.asset.includes("..") || !existsSync(join(work, s.asset))) problems.push(`${s.asset} does not exist`);
    const words = s.caption.split(/\s+/).filter(Boolean).length;
    if (words > MAX_CAPTION_WORDS) problems.push(`caption "${s.caption}" has ${words} words; at most ${MAX_CAPTION_WORDS}`);
  }
  return problems;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: video-storyboard.mjs <card>");
    process.exit(2);
  }
  const card = resolve(arg);
  const work = join(card, "video", "work");
  if (!existsSync(join(work, "facts.json"))) out("failed: video/work/facts.json is missing; run video-capture.mjs first", EXIT.failed);
  const runJson = readJSON(join(card, "run.json"));
  const task = {
    ...videoTask(card),
    run_reviewer_said: { summary: runJson.review?.summary || "", video_ready: runJson.review?.video_ready?.reason || "" },
  };

  const prompt = [
    mdSection(STYLE, "Principles"),
    "",
    "## Your task",
    "",
    mdSection(STYLE, "Storyboard brief"),
  ].join("\n");

  let problems = [];
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const run = makeRunDir(`storyboard-${card.split("/").pop()}`);
    cpSync(join(work, "media"), join(run.ws, "media"), { recursive: true });
    cpSync(join(work, "facts.json"), join(run.ws, "facts.json"));
    writeJSON(join(run.ws, "task.json"), task);
    const again = problems.length ? `\n\nYour last plan had these problems; fix them:\n${problems.map((p) => `- ${p}`).join("\n")}` : "";
    const r = await agyJson({
      cwd: run.ws,
      prompt: prompt + again,
      schemaPath: join(SKILL_ROOT, "assets", "storyboard.schema.json"),
      timeoutS: 300,
      model: VIDEO_MODELS.author,
    });
    rmSync(run.dir, { recursive: true, force: true });
    if (!r.ok) {
      if (r.blocked) out(`blocked: ${r.blocked}`, EXIT.blocked);
      problems = [`the storyboard AI did not answer: ${r.error}`];
      continue;
    }
    problems = await problemsOf(r.output, work);
    if (!problems.length) {
      writeJSON(join(card, "video", "storyboard.json"), r.output);
      log(`value: ${r.output.value}`);
      for (const s of r.output.shots) log(`shot: ${s.asset} — ${s.caption || "(no caption)"}`);
      out(`ok: ${r.output.pattern}, ${r.output.shots.length} shot(s)`, EXIT.ok);
    }
    for (const p of problems) log(`FAIL ${p}`);
  }
  out(`failed: storyboard: ${problems.join("; ")}`, EXIT.failed);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: video-storyboard crashed: ${e.message}`, EXIT.failed);
});
