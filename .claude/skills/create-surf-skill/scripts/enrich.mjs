#!/usr/bin/env node
// Step 1 — enrich. Everything that needs no LLM: GitHub metadata, a shallow
// clone, SKILL.md discovery, per-skill facts (frontmatter, tools, invocation
// signals), and a live-catalog probe (is this collection already in Supabase,
// and with which sibling skills?). Writes it ALL into run.json (steps.enrich)
// and leaves the checkout at .fill/<owner>__<repo>__<pageSlug>/repo/ for the card step.
// Idempotent: reuses a complete checkout; re-running refreshes the facts.
//
// Usage: node enrich.mjs <repoUrl | owner/repo> [<pageSlug>]

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { relative } from "node:path";
import {
  eqId,
  existsSync,
  FILL_ROOT,
  fillDirFor,
  ghJSON,
  join,
  kebab,
  loadRun,
  loadSupabaseEnv,
  pageSlug,
  parseRepoUrl,
  resolveSiteRoot,
  run,
  runPathFor,
  saveRun,
  sbSelect,
} from "./lib.mjs";

// ---- repo facts (gh) -------------------------------------------------------

function fetchCollectionFacts(owner, repo, repoDir) {
  const meta = ghJSON(`repos/${owner}/${repo}`);
  let authorName = meta.owner.login;
  try {
    const user = ghJSON(`users/${meta.owner.login}`);
    if (user && user.name) authorName = user.name;
  } catch {
    /* keep login */
  }
  const defaultBranch = meta.default_branch || "main";
  const spdx = meta.license && meta.license.spdx_id;

  if (!existsSync(join(repoDir, ".git"))) {
    if (existsSync(repoDir)) rmSync(repoDir, { recursive: true, force: true });
    run("git", ["clone", "--depth", "1", "--branch", defaultBranch,
      `https://github.com/${owner}/${repo}.git`, repoDir]);
  }
  const readmeName =
    (existsSync(repoDir) && readdirSync(repoDir).find((f) => /^readme(\.|$)/i.test(f))) ||
    "README.md";

  return {
    id: meta.full_name, // canonical casing
    repositoryURL: meta.html_url,
    readme: `${meta.html_url}/blob/${defaultBranch}/${readmeName}`,
    defaultBranch,
    homepage: meta.homepage || null,
    license: spdx && spdx !== "NOASSERTION" ? spdx : null,
    githubStars: typeof meta.stargazers_count === "number" ? meta.stargazers_count : null,
    updatedAt: (meta.pushed_at || meta.updated_at || "").slice(0, 10) || null,
    author: {
      url: meta.owner.html_url,
      name: authorName,
      avatarURL: `https://github.com/${meta.owner.login}.png`,
    },
    installCommand: `Install this skill collection or give me an instruction how to install it: ${meta.html_url}`,
    externalLinks: [],
  };
}

// ---- SKILL.md discovery + per-skill facts ----------------------------------

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === ".git" || ent.name === "node_modules") continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (/^skill\.md$/i.test(ent.name)) acc.push(full);
  }
  return acc;
}

function frontmatterBlock(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

// Frontmatter is hand-written by whoever authored the skill, so all four YAML
// scalar spellings show up in the wild. Block scalars (`description: >`) are
// common in agent skills — taking the rest of the line would record ">" as the
// description and poison every signal derived from it.
function parseScalar(fm, key) {
  const lines = fm.split("\n");
  const i = lines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
  if (i < 0) return null;
  const head = lines[i].replace(new RegExp(`^${key}\\s*:`), "").trim();

  // Continuation lines are indented; the first unindented line ends the value.
  const continuation = () => {
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") {
        body.push("");
        continue;
      }
      if (!/^\s/.test(lines[j])) break;
      body.push(lines[j].trim());
    }
    while (body.length && body[body.length - 1] === "") body.pop();
    return body;
  };

  // Block scalar: "|" or ">", with optional chomping/indent indicators ("|-", ">2").
  const block = head.match(/^([|>])[\d+-]*$/);
  if (block) {
    const body = continuation();
    // Folded (">") joins lines with spaces; literal ("|") keeps the newlines.
    const text = block[1] === ">" ? body.join(" ").replace(/\s+/g, " ") : body.join("\n");
    return text.trim() || null;
  }

  // Plain or quoted, possibly wrapped across indented lines.
  const value = [head.replace(/^["']|["']$/g, ""), ...(head ? continuation() : [])]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return value || null;
}

function parseAllowedTools(fm) {
  const lines = fm.split("\n");
  const i = lines.findIndex((l) => /^allowed-tools\s*:/.test(l));
  if (i < 0) return [];
  let inline = lines[i].replace(/^allowed-tools\s*:/, "").trim().replace(/^\[|\]$/g, "");
  let names = [];
  if (inline) {
    names = inline.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  } else {
    for (let j = i + 1; j < lines.length && /^\s*-\s+/.test(lines[j]); j++) {
      names.push(lines[j].replace(/^\s*-\s+/, "").trim().replace(/^["']|["']$/g, ""));
    }
  }
  return names.filter(Boolean).map((name) => ({ name, blocking: false }));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Surface invocation SIGNALS; the card step decides the operational `kind`.
// Not every skill is a slash command, so `command` stays null when the skill
// reads as reference-only — a fabricated "/name" would skew that call.
function detectInvocation(body, description, name, slug) {
  const text = String(body || "");
  const desc = String(description || "");
  const slugRe = new RegExp(`/(?:${escapeRe(name)}|${escapeRe(slug || name)})\\b`, "i");
  const hasExplicitCommand = slugRe.test(text) || /\b(trigger|usage)\s*:\s*\//i.test(text);
  const autoTriggered =
    /\b(use this skill|use when|when the user)\b/i.test(desc) || /\bduring any\b/i.test(desc);
  const referenceLike = /^\s*reference\b/i.test(desc) || /\bread this first\b/i.test(text);
  const modeLike = /\bmode\b/i.test(desc) || /\bforces?\b/i.test(desc) || /\bpersistent\b/i.test(text);
  const command = referenceLike && !hasExplicitCommand ? null : `/${name}`;
  return { command, signals: { hasExplicitCommand, autoTriggered, referenceLike, modeLike } };
}

function readSkillFacts(repoDir, abs, facts) {
  const skillMdPath = relative(repoDir, abs).split("\\").join("/");
  const dirRel = skillMdPath.replace(/\/?skill\.md$/i, "");
  const text = readFileSync(abs, "utf8");
  const fm = frontmatterBlock(text);
  const dirBase = dirRel ? dirRel.split("/").pop() : facts.id.split("/")[1];
  const segment = parseScalar(fm, "name") || dirBase;
  const slug = pageSlug(segment);
  const inv = detectInvocation(text, parseScalar(fm, "description"), segment, slug);
  return {
    id: `${facts.id}/${segment}`,
    pageSlug: slug,
    moduleSlugDefault: kebab(segment),
    dir: dirRel || ".",
    skillMdPath,
    frontmatter: { name: parseScalar(fm, "name"), description: parseScalar(fm, "description") },
    command: inv.command,
    invocation: inv.signals,
    referenceFile: `${facts.repositoryURL}/blob/${facts.defaultBranch}/${skillMdPath}`,
    installCommand: `Install the skill or give me an instruction how to install it - ${segment} from ${facts.repositoryURL}`,
    tools: parseAllowedTools(fm),
  };
}

// ---- live-catalog probe ------------------------------------------------------

// The collection may already be live (an earlier run, or a sibling skill's).
// Probe Supabase so the card step starts from the live values instead of
// drafting blind — publish upserts, and a blind draft would overwrite the live
// row shared by every sibling page. Best-effort: degrades to { checked: false }.
async function probeLiveCatalog(collectionId) {
  const siteRoot = resolveSiteRoot();
  if (!siteRoot) return { checked: false, reason: "site root not found (missing src/data/skill-model/index.ts)" };
  try {
    const env = loadSupabaseEnv(siteRoot);
    const [collection] = await sbSelect(env, "collections", eqId(collectionId));
    const skills = await sbSelect(
      env,
      "skills",
      `collection_id=eq.${encodeURIComponent(collectionId)}&select=id,name,kind,use_cases`,
    );
    return { checked: true, collection: collection ?? null, skills };
  } catch (err) {
    return { checked: false, reason: String(err.message).split("\n")[0] };
  }
}

// ---- main -------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    process.stderr.write("Usage: enrich.mjs <repoUrl|owner/repo> [<pageSlug>]\n");
    process.exit(2);
  }
  const slugArg = process.argv[3];
  const { owner, repo } = parseRepoUrl(arg);

  // Clone into a temp checkout to discover the skills — the folder can only be
  // named once we know which skill (pageSlug) this run is for.
  mkdirSync(FILL_ROOT, { recursive: true });
  const tmpRepo = mkdtempSync(join(FILL_ROOT, ".enrich-"));
  const collection = fetchCollectionFacts(owner, repo, tmpRepo);
  const skills = walk(tmpRepo).sort().map((abs) => readSkillFacts(tmpRepo, abs, collection));

  const slug = slugArg || (skills.length === 1 ? skills[0].pageSlug : null);
  if (!slug) {
    rmSync(tmpRepo, { recursive: true, force: true });
    process.stdout.write(
      `discovered ${skills.length} skills in ${collection.id} — re-run enrich for the one you want:\n` +
        skills.map((s) => `  node enrich.mjs ${owner}/${repo} ${s.pageSlug}`).join("\n") +
        "\n",
    );
    process.exit(0);
  }
  if (!skills.some((s) => s.pageSlug === slug)) {
    rmSync(tmpRepo, { recursive: true, force: true });
    process.stderr.write(
      `pageSlug "${slug}" not among discovered skills: ${skills.map((s) => s.pageSlug).join(", ")}\n`,
    );
    process.exit(1);
  }

  const live = await probeLiveCatalog(collection.id);

  // Move the checkout into this skill's own folder, then record the run there.
  const runState = loadRun(owner, repo, slug); // preserves an existing run.json
  const fill = fillDirFor(owner, repo, slug);
  const repoDir = join(fill, "repo");
  mkdirSync(fill, { recursive: true });
  if (existsSync(repoDir)) rmSync(repoDir, { recursive: true, force: true });
  renameSync(tmpRepo, repoDir);

  runState.skill = slug;
  runState.steps.enrich = { status: "done", collection, skills, live };
  saveRun(owner, repo, runState);

  const liveLine = !live.checked
    ? `  live: check skipped (${live.reason}) — the publish --review diff is the only overwrite guard\n`
    : live.collection
      ? `  live: collection EXISTS with ${live.skills.length} live skill(s)` +
        (live.skills.length
          ? ` (kinds: ${[...new Set(live.skills.map((s) => s.kind))].join(", ")})`
          : "") +
        ` — card step must mirror its values\n`
      : `  live: not in catalog yet\n`;

  process.stdout.write(
    `enriched ${collection.id} -> ${runPathFor(owner, repo, slug)}\n` +
      `  stars=${collection.githubStars} license=${collection.license} branch=${collection.defaultBranch} updated=${collection.updatedAt}\n` +
      liveLine +
      `  checkout: ${repoDir}\n` +
      `  discovered ${skills.length} skill(s):\n` +
      skills.map((s) => `    - ${s.id}  (page slug: ${s.pageSlug})`).join("\n") +
      "\n" +
      `  run.skill = ${slug}\n`,
  );
}

await main();
