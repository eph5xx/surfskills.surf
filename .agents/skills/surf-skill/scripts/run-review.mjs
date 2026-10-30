#!/usr/bin/env node
// The AI review of Run's result. Implements references/3-run/review.md; keep them in sync.
//
// Copies the reviewer's material (review/shots, review/result, evidence, page
// info, the task) into a fresh folder in $TMPDIR, runs agy there with no
// commands, no network and no MCP, and checks its verdict against
// assets/review.schema.json. Writes the final run.json, only when the review passes.
//
// Usage: node run-review.mjs <card>
// Last line: `ok` (exit 0), `drop: …` (exit 2), `failed: …` (exit 1)
// or `blocked: …` (exit 3).

import { cpSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { EXIT, SKILL_ROOT, existsSync, join, log, readJSON, validateSchema, writeJSON } from "./shared/core.mjs";
import { agyJson, makeRunDir } from "./shared/agy.mjs";

const CRITERIA = ["task_done", "not_broken", "skill_used", "video_ready"];

function out(line, code) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

/** The part of review.md written for the reviewer. */
function brief() {
  const md = readFileSync(join(SKILL_ROOT, "references", "3-run", "review.md"), "utf8");
  const k = md.indexOf("## Reviewer brief");
  if (k < 0) throw new Error('references/3-run/review.md has no "## Reviewer brief" section');
  return md.slice(k + "## Reviewer brief".length).trim();
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: run-review.mjs <card>");
    process.exit(2);
  }
  const card = resolve(arg);
  const plan = readJSON(join(card, "plan.json"));
  const reviewDir = join(card, "review");
  for (const f of ["agent.json", "checks.json", "evidence.json"]) {
    if (!existsSync(join(reviewDir, f))) out(`failed: review/${f} is missing; run run-agent.mjs and run-check.mjs first`, EXIT.failed);
  }
  const agent = readJSON(join(reviewDir, "agent.json"));
  const checks = readJSON(join(reviewDir, "checks.json"));
  if (!checks.all_pass) out("failed: the code checks did not pass; the review runs only after they do", EXIT.failed);

  // The reviewer's folder: only its own material, outside the card and the home folder.
  const run = makeRunDir(`review-${card.split("/").pop()}`);
  const rws = run.ws;
  for (const p of ["shots", "result", "evidence.json", "page.json", "checks.json"]) {
    if (existsSync(join(reviewDir, p))) cpSync(join(reviewDir, p), join(rws, p), { recursive: true, dereference: false });
  }
  writeJSON(join(rws, "task.json"), {
    title: plan.task.title,
    prompt: plan.task.prompt,
    deliverable: plan.deliverable,
    questions: agent.questions,
    stopped_at_time_limit: !!agent.timed_out,
    stopped_at_token_limit: !!agent.stopped_at_token_limit,
  });

  const shotList = checks.shots.map((s) => s.replace(/^review\//, "")).join(", ") || "none";
  const prompt = [
    brief(),
    "",
    "## Your folder",
    "",
    `- task.json: the task, the deliverable (${plan.deliverable.path}, type ${plan.deliverable.type}) and any questions the agent asked.`,
    `- ${plan.deliverable.path} and the rest of result/: what the agent made.`,
    `- Screenshots: ${shotList}. Open every one with your file viewer.`,
    "- evidence.json: which skill files the agent read and which skill scripts it ran.",
    "- checks.json: the code checks, all passed.",
    plan.deliverable.type === "web_page" ? "- page.json: the page's title, console errors and failed requests." : "",
    "",
    "Read them now, then give your verdict.",
  ].filter((l) => l !== "").join("\n");

  const r = await agyJson({ cwd: rws, prompt, schemaPath: join(SKILL_ROOT, "assets", "review.schema.json"), timeoutS: 300 });
  rmSync(run.dir, { recursive: true, force: true });
  if (!r.ok) {
    if (r.blocked) out(`blocked: ${r.blocked}`, EXIT.blocked);
    out(`failed: the reviewer did not answer: ${r.error}`, EXIT.failed);
  }
  const verdictErrors = await validateSchema("review", r.output);
  if (verdictErrors.length) out(`failed: the reviewer's verdict is invalid: ${verdictErrors.join("; ")}`, EXIT.failed);

  for (const c of CRITERIA) log(`${r.output[c].verdict === "pass" ? "pass" : "FAIL"} ${c}: ${r.output[c].reason}`);
  // A dropped card gets no run.json: the output exists only when the step succeeded.
  const failedCriteria = CRITERIA.filter((c) => r.output[c].verdict !== "pass");
  if (failedCriteria.length) {
    out(`drop: ${failedCriteria.map((c) => `${c}: ${r.output[c].reason}`).join("; ")}`, EXIT.drop);
  }
  const review = { verdict: "ok", ...r.output };
  const runJson = {
    files: agent.files,
    agent: agent.agent,
    duration_s: agent.duration_s,
    turns: agent.turns,
    timed_out: !!agent.timed_out,
    stopped_at_token_limit: !!agent.stopped_at_token_limit,
    ...(agent.usage ? { usage: agent.usage } : {}),
    questions: agent.questions,
    images_generated: agent.images_generated,
    hosts: agent.hosts,
    dropped_files: agent.dropped_files,
    checks: checks.checks,
    shots: checks.shots,
    review,
  };
  const runErrors = await validateSchema("run", runJson);
  if (runErrors.length) out(`failed: run.json is invalid: ${runErrors.join("; ")}`, EXIT.failed);
  writeJSON(join(card, "run.json"), runJson);
  out("ok", EXIT.ok);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: run-review crashed: ${e.message}`, EXIT.failed);
});
