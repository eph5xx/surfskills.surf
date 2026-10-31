#!/usr/bin/env node
// The orchestrator's one tool: what to launch next, whether a step is done, and the
// status log. The only place that knows each step's output file. Step code is never
// imported: a step's checker runs as its own process and its exit code is the answer.
//
// A step is done when its output exists, matches its schema, is newer than every
// output it depends on, and its checker (if any) exits 0.
//
// The pipeline never retries or reruns on its own. `next` launches only steps whose
// output is missing; a card whose last log entry is failed/dropped/blocked, or that
// has an output that exists but isn't done, stops the batch until the owner acts.
//
// Usage:
//   node state.mjs next                       -> `pick`, `<card> <step> [<step>]`, or `stopped: …`
//   node state.mjs check <card> <step>        -> `ok` or `failed: …`
//   node state.mjs log <card> <step> <done|failed|dropped|blocked> "<why>"
//   node state.mjs resume <card>              (owner only) clear a stop; `next` continues the card
//   node state.mjs skip <card>                (owner only) leave the card out for good

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
// Statuses that stop the batch until the owner runs `resume` or `skip`.
const STOPS = ["failed", "dropped", "blocked"];
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

/** Each card's last log entry, in log order: name -> { step, status, why }. */
function lastEntries() {
  const last = new Map();
  if (!existsSync(STATUS_LOG)) return last;
  for (const line of readFileSync(STATUS_LOG, "utf8").split("\n")) {
    const [, card, step, status, ...why] = line.split(" ");
    if (!card || !status) continue;
    last.delete(card); // keep Map order = order of each card's latest entry
    last.set(card, { step, status, why: why.join(" ") });
  }
  return last;
}

function appendLog(card, step, status, why) {
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  appendFileSync(STATUS_LOG, `${ts} ${card} ${step} ${status} ${why}`.trimEnd() + "\n");
}

async function next() {
  const last = lastEntries();
  for (const [card, e] of last) {
    if (STOPS.includes(e.status)) out(`stopped: ${card} ${e.step} ${e.status} ${e.why}`.trimEnd());
  }
  const skipped = new Set([...last].filter(([, e]) => e.status === "skipped").map(([card]) => card));
  const cards = existsSync(CARDS_DIR)
    ? readdirSync(CARDS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !skipped.has(e.name))
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
      for (const step of stage) {
        const why = await problem(card, step);
        if (!why) continue;
        // Only a missing output is launched. One that exists but isn't done would be
        // a rerun, which only the owner decides.
        if (!existsSync(join(card, STEPS[step].out))) todo.push(step);
        else out(`stopped: ${basename(card)} ${step} not done: ${why}`);
      }
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
    appendLog(basename(cardPath(card)), step, status, why.join(" "));
    out("ok");
  }
  if ((cmd === "resume" || cmd === "skip") && rest.length === 1) {
    const card = basename(cardPath(rest[0]));
    const e = lastEntries().get(card);
    if (!e) out(`failed: ${card} has no log entries`, EXIT.failed);
    appendLog(card, e.step, cmd === "resume" ? "resumed" : "skipped", "by the owner");
    out("ok");
  }
  log("Usage: state.mjs next | check <card> <step> | log <card> <step> <done|failed|dropped|blocked> \"<why>\" | resume <card> | skip <card>");
  log(`Steps: ${Object.keys(STEPS).join(", ")}`);
  process.exit(2);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: state crashed: ${e.message}`, EXIT.failed);
});
