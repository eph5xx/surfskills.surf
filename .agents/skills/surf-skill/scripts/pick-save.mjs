#!/usr/bin/env node
// Lock in the picker's choice: create the card folder, copy the skill's files
// (as checked, at the pool's commit) into skill/, and write pick.json.
//
// Usage: node pick-save.mjs <skill_id> --why "1-3 sentences"

import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { listFiles } from "./pick-check.mjs";
import {
  CARDS_DIR,
  PICK_DIR,
  cardDirName,
  existsSync,
  featuredSkillIds,
  join,
  log,
  parseArgs,
  readJSON,
  validateSchema,
  writeJSON,
} from "./lib.mjs";

function die(msg) {
  log(msg);
  process.exit(1);
}

/** Newest pool that lists `skillId` -> { pool, repo, skill }. */
function findInPools(skillId) {
  if (!existsSync(PICK_DIR)) return null;
  const pools = readdirSync(PICK_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-(trending|catalog)\.json$/.test(f))
    .map((f) => join(PICK_DIR, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  const want = skillId.toLowerCase();
  for (const path of pools) {
    const pool = readJSON(path);
    for (const repo of pool.repos) {
      const skill = repo.skills.find((s) => s.skill_id.toLowerCase() === want);
      if (skill) return { pool, repo, skill };
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const skillId = args._[0];
  const why = typeof args.why === "string" ? args.why.trim() : "";
  if (!skillId || !why) die('Usage: pick-save.mjs <skill_id> --why "1-3 sentences"');

  if (featuredSkillIds().has(skillId.toLowerCase())) die(`${skillId} already has a card folder`);
  const found = findInPools(skillId);
  if (!found) die(`${skillId} is not in any candidate pool; run pick-candidates.mjs first`);
  const { pool, repo, skill } = found;
  if (skill.status !== "pass") die(`${skill.skill_id} failed the basic checks: ${skill.reasons.join("; ")}`);

  const card = join(CARDS_DIR, cardDirName(skill.skill_id));
  if (existsSync(card)) die(`${card} already exists`);

  const pick = {
    skill_id: skill.skill_id,
    repo: repo.repo,
    path: skill.path,
    commit: repo.commit,
    source: pool.source,
    in_catalog: repo.in_catalog,
    why,
    hype: repo.hype,
  };
  const errors = await validateSchema("pick", pick);
  if (errors.length) die(`pick.json would be invalid:\n  ${errors.join("\n  ")}`);

  // Copy what was checked: the skill folder minus nested skill folders and symlinks.
  // Any card folder counts as featured, so a failed copy must not leave one behind.
  const src = skill.path ? join(repo.files_dir, skill.path) : repo.files_dir;
  const nested = new Set(
    repo.skills
      .filter((s) => s !== skill && (skill.path === "" || s.path.startsWith(skill.path + "/")))
      .map((s) => join(repo.files_dir, s.path)),
  );
  const files = listFiles(src, nested).filter((f) => !f.symlink);
  try {
    for (const f of files) {
      const out = join(card, "skill", f.rel);
      mkdirSync(dirname(out), { recursive: true });
      copyFileSync(f.abs, out);
    }
    writeJSON(join(card, "pick.json"), pick);
  } catch (e) {
    rmSync(card, { recursive: true, force: true });
    throw e;
  }
  process.stdout.write(`card: ${card}\n  skill/ ${files.length} file(s) from ${repo.repo}@${repo.commit.slice(0, 7)}\n`);
}

main().catch((e) => die(e.stack || e.message));
