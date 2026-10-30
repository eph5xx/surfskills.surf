#!/usr/bin/env node
// Mechanical checks on a card's plan.json and inputs/. Implements
// references/2-plan/checks.md and the path rules in references/2-plan/task.md;
// keep them in sync.
//
// Prints `ok` and a summary, or every problem it found and exits 1.
//
// Usage: node plan-check.mjs <card folder>

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { listFiles } from "./pick-check.mjs";
import { existsSync, join, log, parseFrontmatter, readJSON, validateSchema } from "./lib.mjs";

const UA = "Mozilla/5.0 (compatible; surfskills-plan/1.0; +https://surfskills.surf)";
const URL_TIMEOUT_MS = 10_000;
const MIN_MARK = 6;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const NO_VALUE = new Set(["exists", "valid_html"]);
// Path-like tokens in the prompt. Trailing punctuation is sentence text, not path.
const PATH_TOKEN = /(?<![\w./-])(?:inputs|result)\/[^\s"'`<>()[\]{},;]*/g;
const URL_TOKEN = /\bhttps?:\/\/[^\s"'`<>()[\]{}]+/g;
const ABS_PATH = /(?<![\w.])(?:~\/|\/(?:Users|home|tmp|var|private|etc|opt|root|mnt|workspace)\/)/;

function trimPunct(s) {
  return s.replace(/[.:!?]+$/, "");
}

function unsafePath(p) {
  return p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) || p.split(/[\\/]/).includes("..");
}

/** Text files under `dir` (relative paths), skipping binaries. */
function textFiles(dir) {
  if (!existsSync(dir)) return [];
  return listFiles(dir)
    .filter((f) => !f.symlink)
    .map((f) => ({ rel: f.rel, buf: readFileSync(f.abs) }))
    .filter((f) => !f.buf.subarray(0, 8000).includes(0));
}

async function urlStatus(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(URL_TIMEOUT_MS),
    });
    res.body?.cancel().catch(() => {});
    return res.status < 400 ? null : `status ${res.status}`;
  } catch (e) {
    return e.name === "TimeoutError" ? `no answer within ${URL_TIMEOUT_MS / 1000}s` : e.message;
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: plan-check.mjs <card folder>");
    process.exit(2);
  }
  const card = resolve(arg);
  const problems = [];
  const bad = (s) => problems.push(s);
  const finish = () => {
    process.stdout.write(`${problems.length} problem(s) in ${join(card, "plan.json")}:\n  - ${problems.join("\n  - ")}\n`);
    process.exit(1);
  };

  const planPath = join(card, "plan.json");
  if (!existsSync(planPath)) bad("plan.json is missing");
  if (!existsSync(join(card, "skill", "SKILL.md"))) bad("skill/SKILL.md is missing");
  if (problems.length) finish();

  let plan;
  try {
    plan = readJSON(planPath);
  } catch (e) {
    bad(`plan.json is not valid JSON: ${e.message}`);
    finish();
  }
  const schemaErrors = await validateSchema("plan", plan);
  for (const e of schemaErrors) bad(`schema: ${e}`);
  // The rules below assume the schema's shape.
  if (schemaErrors.length) finish();

  const { task, deliverable, done } = plan;
  const prompt = task.prompt;

  // 1. Title and first line.
  const { data } = parseFrontmatter(readFileSync(join(card, "skill", "SKILL.md"), "utf8"));
  const name = data?.name;
  if (!name) bad("skill/SKILL.md has no frontmatter name");
  if (/[\r\n]/.test(task.title)) bad("task.title must be one line");
  else if (name && !task.title.startsWith(`/${name} `)) bad(`task.title must start with "/${name} " (got "${task.title}")`);
  else if (name && !task.title.slice(name.length + 2).trim()) bad("task.title says nothing after the command");
  const firstLine = prompt.split(/\r?\n/)[0];
  if (firstLine !== task.title) bad(`the prompt's first line must equal task.title (got "${firstLine}")`);

  // 2. Paths.
  const promptPaths = [...prompt.matchAll(PATH_TOKEN)].map((m) => trimPunct(m[0]));
  const allPaths = [
    deliverable.path,
    ...(deliverable.before ? [deliverable.before] : []),
    ...done.map((c) => c.path),
    ...done.filter((c) => c.check === "differs" && typeof c.value === "string").map((c) => c.value),
    ...promptPaths,
  ];
  for (const p of new Set(allPaths)) if (unsafePath(p)) bad(`path must be relative with no "..": ${p}`);
  const abs = prompt.match(ABS_PATH);
  if (abs) bad(`the prompt names an absolute path (${abs[0]}…); use paths relative to the working folder`);

  for (const p of new Set([deliverable.path, ...done.map((c) => c.path)])) {
    if (!prompt.includes(p)) bad(`the prompt must name ${p}`);
  }

  const inputsDir = join(card, "inputs");
  const named = new Set(allPaths.filter((p) => p.startsWith("inputs/")).map((p) => p.replace(/\/+$/, "")));
  for (const p of named) {
    if (p === "inputs" || unsafePath(p)) continue;
    if (!existsSync(join(card, p))) bad(`${p} is named in the plan but does not exist`);
  }
  const inputFiles = existsSync(inputsDir) ? listFiles(inputsDir).map((f) => `inputs/${f.rel}`) : [];
  for (const f of inputFiles) {
    const covered = [...named].some((p) => f === p || f.startsWith(p + "/"));
    if (!covered) bad(`${f} is not named in the plan (prompt, before or differs)`);
  }

  // 3. Each check's value.
  for (const [i, c] of done.entries()) {
    const at = `done[${i}] ${c.check} ${c.path}`;
    if (NO_VALUE.has(c.check) && c.value !== undefined) bad(`${at}: takes no value`);
    if (c.check === "contains" && (typeof c.value !== "string" || !c.value)) bad(`${at}: value must be a non-empty string`);
    if (c.check === "min_bytes" && !(Number.isInteger(c.value) && c.value > 0)) bad(`${at}: value must be a positive integer`);
    if (c.check === "differs") {
      if (typeof c.value !== "string" || !c.value.startsWith("inputs/")) bad(`${at}: value must be an inputs/ file`);
      else if (!unsafePath(c.value) && !(existsSync(join(card, c.value)) && statSync(join(card, c.value)).isFile())) {
        bad(`${at}: ${c.value} is not an existing file`);
      }
    }
    if (c.check === "valid_html" && !/\.html$/i.test(c.path)) bad(`${at}: valid_html works only on .html files`);
  }

  // 4. Deliverable type and required checks.
  if (deliverable.type === "web_page" && !/\.html$/i.test(deliverable.path)) bad(`a web_page deliverable must be .html (got ${deliverable.path})`);
  if (deliverable.type === "image" && !IMAGE_EXT.test(deliverable.path)) bad(`an image deliverable needs an image extension (got ${deliverable.path})`);
  const onDeliverable = done.filter((c) => c.path === deliverable.path);
  if (!onDeliverable.length) bad(`no check targets the deliverable ${deliverable.path}`);
  if (!onDeliverable.some((c) => c.check === "min_bytes")) bad(`the deliverable needs a size floor (min_bytes on ${deliverable.path})`);
  if (deliverable.type === "web_page" && !onDeliverable.some((c) => c.check === "valid_html")) {
    bad(`a web_page deliverable needs valid_html on ${deliverable.path}`);
  }
  if (deliverable.before && !onDeliverable.some((c) => c.check === "differs" && c.value === deliverable.before)) {
    bad(`before is ${deliverable.before}, so the plan needs { "check": "differs", "path": "${deliverable.path}", "value": "${deliverable.before}" }`);
  }

  // 5. The skill-specific check.
  // SKILL.md first, so the reported source is the skill's own instructions when it can be.
  const skillFiles = textFiles(join(card, "skill")).sort((a, b) => (b.rel === "SKILL.md") - (a.rel === "SKILL.md"));
  const inputTexts = textFiles(inputsDir);
  let mark = null;
  const rejected = [];
  for (const c of done) {
    if (c.check !== "contains" || typeof c.value !== "string" || !c.value) continue;
    const v = c.value;
    const why = [];
    if (v.length < MIN_MARK) why.push(`shorter than ${MIN_MARK} characters`);
    const source = skillFiles.find((f) => f.buf.includes(v));
    if (!source) why.push("not found in skill/");
    if (prompt.includes(v)) why.push("appears in the prompt");
    const inInput = inputTexts.find((f) => f.buf.includes(v));
    if (inInput) why.push(`appears in inputs/${inInput.rel}`);
    if (!why.length) {
      mark = { value: v, path: c.path, from: `skill/${source.rel}` };
      break;
    }
    rejected.push(`"${v}": ${why.join(", ")}`);
  }
  if (!mark) {
    bad(
      `no skill-specific check: needs a contains check whose text (${MIN_MARK}+ chars) is in skill/ and in neither the prompt nor inputs/` +
        (rejected.length ? ` (rejected ${rejected.join("; ")})` : ""),
    );
  }

  // 6. Live URLs.
  const urls = [...new Set([...prompt.matchAll(URL_TOKEN)].map((m) => m[0].replace(/[.,:;!?]+$/, "")))];
  const statuses = await Promise.all(urls.map(urlStatus));
  urls.forEach((u, i) => statuses[i] && bad(`${u} does not load: ${statuses[i]}`));

  if (problems.length) finish();

  const lines = [
    "ok",
    `  title: ${task.title}`,
    `  deliverable: ${deliverable.path} (${deliverable.type}${deliverable.before ? `, before ${deliverable.before}` : ""})`,
    `  checks: ${done.map((c) => c.check).join(", ")}`,
    `  mark: "${mark.value}" in ${mark.path}, from ${mark.from}`,
    `  inputs: ${inputFiles.length ? inputFiles.join(", ") : "none"}`,
    `  urls: ${urls.length ? urls.join(", ") : "none"}`,
    `  prompt: ${prompt.length}/2000 chars`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

main().catch((e) => {
  log(e.stack || e.message);
  process.exit(1);
});
