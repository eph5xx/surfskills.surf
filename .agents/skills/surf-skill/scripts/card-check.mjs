#!/usr/bin/env node
// Mechanical checks on a card's card.json. Implements the rules in
// references/4-card/copy.md; keep them in sync.
//
// Prints `ok` and a summary, or every problem it found and exits 1.
//
// Usage: node card-check.mjs <card folder>

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { repoOnSite, siteNames, skillFrontmatter } from "./card-facts.mjs";
import { existsSync, join, log, readJSON, validateSchema } from "./shared/core.mjs";

// The same split the skill and collection pages use for their meta description.
const SENTENCE_END = /(?<=[.!?])\s/;
const MIN_FIRST_SENTENCE = 40;

const MARKDOWN = [
  [/\*\*|__/, "bold markers (** or __)"],
  [/(^|\s)\*[^\s*][^*\n]*\*(?=[\s.,;:!?]|$)/, "italic markers (*text*)"],
  [/`/, "backticks"],
  [/^\s{0,3}#{1,6}\s/m, "a heading (#)"],
  [/^\s*(?:[-*+•]|\d+[.)])\s/m, "a list item"],
  [/^\s*>\s/m, "a quote (>)"],
  [/\]\(|\[[^\]\n]+\]\[/, "a link ([text](url))"],
  [/<\/?[a-z][^>]*>/i, "an HTML tag"],
];

// AI tells and hype words. Word stems with their usual endings.
const BANNED = [
  /\bdelv(?:e|es|ed|ing)\b/i,
  /\btapestr(?:y|ies)\b/i,
  /\btestaments?\b/i,
  /\bseamless(?:ly)?\b/i,
  /\bleverag(?:e|es|ed|ing)\b/i,
  /\bunlock(?:s|ed|ing)?\b/i,
  /\bunleash(?:es|ed|ing)?\b/i,
  /\belevat(?:e|es|ed|ing)\b/i,
  /\bempower(?:s|ed|ing|ment)?\b/i,
  /\bsupercharg(?:e|es|ed|ing)\b/i,
  /\bgame[- ]?changers?\b/i,
  /\brevolutioni[sz](?:e|es|ed|ing)\b/i,
  /\bcutting[- ]edge\b/i,
  /\bstate[- ]of[- ]the[- ]art\b/i,
  /\beffortless(?:ly)?\b/i,
  /\bharness(?:es|ed|ing)?\b/i,
  /\bstreamlin(?:e|es|ed|ing)\b/i,
  /\brobust(?:ly|ness)?\b/i,
  /\bpowerful(?:ly)?\b/i,
  /\bdiv(?:e|es|ing) into\b/i,
  /\blook no further\b/i,
  /\bwhether you(?:'|’)?re\b|\bwhether you are\b/i,
  /\bthis skill (?:allows|helps)\b/i,
];
const PLACEHOLDERS = [/\b(?:TODO|TBD|FIXME|FILL)\b/, /\blorem\b/i, /\{\{|\}\}/];

// Title Case: every word but these starts with a capital or a digit.
const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "nor", "but", "for", "to", "of", "in", "on", "at", "by", "vs", "via", "with", "from", "into", "as", "per"]);

const lower = (s) => s.trim().toLowerCase();

/** Every string in a card section with its field path, for the text rules. */
function strings(section, prefix) {
  const out = [];
  for (const k of ["name", "short_description", "long_description"]) {
    if (typeof section[k] === "string") out.push([`${prefix}${k}`, section[k]]);
  }
  (section.when_to_use || []).forEach((w, i) => {
    out.push([`${prefix}when_to_use[${i}].title`, w.title], [`${prefix}when_to_use[${i}].body`, w.body]);
  });
  (section.faq || []).forEach((f, i) => {
    out.push([`${prefix}faq[${i}].q`, f.q], [`${prefix}faq[${i}].a`, f.a]);
  });
  return out;
}

function textRules(path, s, bad) {
  for (const [re, what] of MARKDOWN) if (re.test(s)) bad(`${path}: markdown is not rendered; remove ${what}`);
  for (const re of BANNED) {
    const m = s.match(re);
    if (m) bad(`${path}: banned word "${m[0]}"`);
  }
  for (const re of PLACEHOLDERS) {
    const m = s.match(re);
    if (m) bad(`${path}: placeholder "${m[0]}"`);
  }
  if (s !== s.trim()) bad(`${path}: leading or trailing whitespace`);
  if (/ {2,}/.test(s)) bad(`${path}: double space`);
  if (/[\t\r]/.test(s)) bad(`${path}: tab or carriage return`);
  if (!path.endsWith("long_description") && /\n/.test(s)) bad(`${path}: must be one line`);
}

/** -> { paragraphs, firstSentence } and reports layout problems. */
function longRules(path, s, bad) {
  if (/\n{3,}/.test(s)) bad(`${path}: paragraphs are separated by exactly one blank line`);
  const paragraphs = s.split(/\n{2,}/);
  paragraphs.forEach((p, i) => {
    if (/\n/.test(p)) bad(`${path}: paragraph ${i + 1} has a line break inside it; join it into one line`);
  });
  if (paragraphs.length < 2 || paragraphs.length > 3) bad(`${path}: needs 2-3 paragraphs (got ${paragraphs.length})`);
  const firstSentence = s.trim().split(SENTENCE_END)[0];
  if (firstSentence.length < MIN_FIRST_SENTENCE) {
    bad(`${path}: the first sentence is the meta description and needs ${MIN_FIRST_SENTENCE}+ chars (got ${firstSentence.length}: "${firstSentence}")`);
  }
  return { paragraphs: paragraphs.length, firstSentence };
}

function dupes(path, items, key, bad) {
  const seen = new Set();
  items.forEach((it, i) => {
    const k = lower(it[key]).replace(/[^\p{L}\p{N} ]/gu, "");
    if (seen.has(k)) bad(`${path}[${i}].${key}: duplicate of an earlier one ("${it[key]}")`);
    seen.add(k);
  });
}

function namesIt(answers, names) {
  const wanted = names.filter(Boolean).map(lower);
  return answers.some((a) => wanted.some((n) => lower(a).includes(n)));
}

/**
 * The rules after the schema. `ctx`: { skillId, repo, fmName, inCatalog (true|false|null),
 * site ({ reachable, skills, collections }), liveCollection ({id,name}|null) }.
 * -> { problems, warnings, summary }.
 */
export function checkCard(card, ctx) {
  const problems = [];
  const warnings = [];
  const bad = (s) => problems.push(s);
  const summary = {};

  const sections = [["", card]];
  if (card.collection) sections.push(["collection.", card.collection]);
  for (const [prefix, sec] of sections) {
    for (const [path, s] of strings(sec, prefix)) textRules(path, s, bad);
    summary[`${prefix}long`] = longRules(`${prefix}long_description`, sec.long_description, bad);
    dupes(`${prefix}when_to_use`, sec.when_to_use, "title", bad);
    dupes(`${prefix}faq`, sec.faq, "q", bad);
  }

  // The skill's name.
  const slugish = (s) => lower(s).replace(/[\s_]+/g, "-");
  if (ctx.fmName && slugish(card.name) === slugish(ctx.fmName)) bad(`name: "${card.name}" is the slug; name the outcome instead`);
  const words = card.name.split(/\s+/);
  const lowerWords = words.filter((w, i) => (i === 0 || !SMALL_WORDS.has(w.toLowerCase())) && /^\p{Ll}/u.test(w));
  if (lowerWords.length) bad(`name: use Title Case (lowercase: ${lowerWords.join(", ")})`);

  // At least one FAQ answer names the skill.
  const collectionName = card.collection?.name || ctx.liveCollection?.name;
  const skillNames = [card.name, ctx.fmName, ctx.fmName?.replace(/-/g, " "), collectionName];
  if (!namesIt(card.faq.map((f) => f.a), skillNames)) {
    bad(`faq: no answer names the skill (use "${ctx.fmName || card.name}" or "${card.name}" in at least one)`);
  }

  // The collection is written exactly when the repo is new to the site.
  if (ctx.inCatalog === false && !card.collection) bad(`collection: ${ctx.repo} is not on the site yet, so card.json needs "collection"`);
  if (ctx.inCatalog === true && card.collection) bad(`collection: ${ctx.repo} is already on the site; remove "collection"`);
  if (ctx.inCatalog === null) warnings.push("can't tell whether the repo is on the site; collection not checked");

  // Names already taken on the site (the card's own rows don't count).
  if (ctx.site?.reachable) {
    const clash = ctx.site.skills.find((s) => lower(s.name) === lower(card.name) && lower(s.id) !== lower(ctx.skillId));
    if (clash) bad(`name: "${card.name}" is taken by ${clash.id}`);
    if (card.collection) {
      const c = ctx.site.collections.find((c) => lower(c.name) === lower(card.collection.name) && lower(c.id) !== lower(ctx.repo));
      if (c) bad(`collection.name: "${card.collection.name}" is taken by ${c.id}`);
    }
  } else if (ctx.site) {
    warnings.push(`the site can't be read (${ctx.site.why}); name clashes not checked`);
  }

  return { problems, warnings, summary };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: card-check.mjs <card folder>");
    process.exit(2);
  }
  const card = resolve(arg);
  const cardPath = join(card, "card.json");
  const problems = [];
  const finish = (warnings = []) => {
    const w = warnings.map((s) => `\n  warning: ${s}`).join("");
    process.stdout.write(`${problems.length} problem(s) in ${cardPath}:\n  - ${problems.join("\n  - ")}${w}\n`);
    process.exit(1);
  };

  for (const f of ["card.json", "pick.json", "skill/SKILL.md"]) if (!existsSync(join(card, f))) problems.push(`${f} is missing`);
  if (problems.length) finish();

  let data;
  try {
    data = readJSON(cardPath);
  } catch (e) {
    problems.push(`card.json is not valid JSON: ${e.message}`);
    finish();
  }
  for (const e of await validateSchema("card", data)) problems.push(`schema: ${e}`);
  // The rules below assume the schema's shape.
  if (problems.length) finish();

  const pick = readJSON(join(card, "pick.json"));
  const fm = skillFrontmatter(card);
  const site = await siteNames();
  const on = repoOnSite(pick, site);
  const r = checkCard(data, {
    skillId: pick.skill_id,
    repo: pick.repo,
    fmName: fm.name,
    inCatalog: on.inCatalog,
    site,
    liveCollection: on.collection,
  });
  problems.push(...r.problems);
  if (problems.length) finish(r.warnings);

  const s = r.summary;
  const lines = [
    "ok",
    `  name: ${data.name}`,
    `  kind: ${data.kind}; use cases: ${data.use_cases.join(", ")}`,
    `  meta: "${s.long.firstSentence}" (${s.long.firstSentence.length} chars)`,
    `  long: ${s.long.paragraphs} paragraphs, ${data.long_description.length}/1200 chars; short: ${data.short_description.length}/200`,
    `  when_to_use: ${data.when_to_use.length}; faq: ${data.faq.length}`,
    data.collection
      ? `  collection: "${data.collection.name}", ${s["collection.long"].paragraphs} paragraphs, when_to_use ${data.collection.when_to_use.length}, faq ${data.collection.faq.length}`
      : `  collection: none (${on.inCatalog === true ? "already on the site" : "unknown"}, ${on.source})`,
    ...r.warnings.map((w) => `  warning: ${w}`),
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    log(e.stack || e.message);
    process.exit(1);
  });
}
