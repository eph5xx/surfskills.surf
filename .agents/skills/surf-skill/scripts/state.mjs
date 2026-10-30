#!/usr/bin/env node
// The orchestrator's one tool: what to launch next, whether a step is done, and the
// status log. The only place that knows each step's output file. Step code is never
// imported: a step's checker runs as its own process and its exit code is the answer.
//
// A step is done when its output exists, matches its schema, is newer than every
// output it depends on, and its checker (if any) exits 0.
//
// Usage:
//   node state.mjs next                       -> `pick`, or `<card> <step> [<step>]`
//   node state.mjs check <card> <step>        -> `ok` or `failed: …`
//   node state.mjs log <card> <step> <done|failed|dropped|blocked> "<why>"

import { spawnSync } from "node:child_process";
import { appendFileSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { CARDS_DIR, EXIT, SKILL_ROOT, existsSync, join, log, readJSON, validateSchema } from "./shared/core.mjs";

// `skill` is the step's sibling skill folder, where its checker lives.
const STEPS = {
  pick: { skill: "surf-skill-pick", out: "pick.json", reads: [] },
  plan: { skill: "surf-skill-plan", out: "plan.json", reads: ["pick"], check: "plan-check.mjs" },
  run: { skill: "surf-skill-run", out: "run.json", reads: ["plan"] },
  card: { skill: "surf-skill-card", out: "card.json", reads: ["pick"], check: "card-check.mjs" },
  video: { skill: "surf-skill-video", out: "video.json", reads: ["run"], check: "video-check.mjs" },
  publish: { skill: "surf-skill-publish", out: "publish.json", reads: ["card", "video"] },
};
// Launch order; steps in one stage run at the same time.
const STAGES = [["plan"], ["run"], ["card", "video"], ["publish"]];
const STATUSES = ["done", "failed", "dropped", "blocked"];
// Where the real status table lives is still undecided; until then, this file.
const STATUS_LOG = join(CARDS_DIR, "status.log");

function out(line, code = EXIT.ok) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

/** Every step whose output `step` depends on, directly or through another step. */
function upstream(step) {
  const all = new Set();
  for (const r of STEPS[step].reads) for (const s of [r, ...upstream(r)]) all.add(s);
  return [...all];
}

/** null when `step` is done for `card`, else why not. */
async function problem(card, step) {
  const { skill, out: file, check } = STEPS[step];
  const path = join(card, file);
  if (!existsSync(path)) return `${file} is missing`;
  let data;
  try {
    data = readJSON(path);
  } catch (e) {
    return `${file} is not valid JSON: ${e.message}`;
  }
  const errs = await validateSchema(step, data);
  if (errs.length) return `${file} is invalid: ${errs.join("; ")}`;
  for (const r of upstream(step)) {
    const upstream = join(card, STEPS[r].out);
    if (!existsSync(upstream)) return `${STEPS[r].out} is missing`;
    if (statSync(upstream).mtimeMs > statSync(path).mtimeMs) return `${STEPS[r].out} changed after ${file} was written`;
  }
  if (check) {
    const r = spawnSync(process.execPath, [join(SKILL_ROOT, "..", skill, "scripts", check), card], { encoding: "utf8" });
    if (r.status !== 0) {
      const said = (r.stdout || r.stderr || `exit ${r.status}`).trim().split("\n").map((l) => l.trim()).join("; ");
      return `${check}: ${said.slice(0, 500)}`;
    }
  }
  return null;
}

function droppedCards() {
  if (!existsSync(STATUS_LOG)) return new Set();
  const lines = readFileSync(STATUS_LOG, "utf8").split("\n");
  return new Set(lines.map((l) => l.split(" ")).filter((p) => p[3] === "dropped").map((p) => p[1]));
}

async function next() {
  const dropped = droppedCards();
  const cards = existsSync(CARDS_DIR)
    ? readdirSync(CARDS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !dropped.has(e.name))
        .map((e) => join(CARDS_DIR, e.name))
    : [];
  // Oldest card first, by when Pick saved it.
  const started = cards.filter((c) => existsSync(join(c, "pick.json")));
  started.sort((a, b) => statSync(join(a, "pick.json")).mtimeMs - statSync(join(b, "pick.json")).mtimeMs);
  for (const card of started) {
    if (!(await problem(card, "publish"))) continue;
    // Pick can't be redone in place: a folder without a valid pick.json is skipped.
    const pickWhy = await problem(card, "pick");
    if (pickWhy) {
      log(`skipping ${basename(card)}: ${pickWhy}`);
      continue;
    }
    for (const stage of STAGES) {
      const todo = [];
      for (const step of stage) if (await problem(card, step)) todo.push(step);
      if (todo.length) out(`${card} ${todo.join(" ")}`);
    }
  }
  out("pick");
}

function cardPath(arg) {
  const p = resolve(arg);
  return existsSync(p) || !existsSync(join(CARDS_DIR, arg)) ? p : join(CARDS_DIR, arg);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "next") return next();
  if (cmd === "check" && rest.length === 2 && STEPS[rest[1]]) {
    const why = await problem(cardPath(rest[0]), rest[1]);
    out(why ? `failed: ${why}` : "ok", why ? EXIT.failed : EXIT.ok);
  }
  if (cmd === "log" && rest.length >= 3 && STEPS[rest[1]] && STATUSES.includes(rest[2])) {
    const [card, step, status, ...why] = rest;
    const ts = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    appendFileSync(STATUS_LOG, `${ts} ${basename(cardPath(card))} ${step} ${status} ${why.join(" ")}`.trimEnd() + "\n");
    out("ok");
  }
  log("Usage: state.mjs next | check <card> <step> | log <card> <step> <done|failed|dropped|blocked> \"<why>\"");
  log(`Steps: ${Object.keys(STEPS).join(", ")}`);
  process.exit(2);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: state crashed: ${e.message}`, EXIT.failed);
});
