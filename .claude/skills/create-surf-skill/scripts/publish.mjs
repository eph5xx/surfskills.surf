#!/usr/bin/env node
// Step 6 — publish to Supabase, the only writer to the live catalog. Builds the
// collection + skill rows straight from run.json (enrich facts + approved card
// + video previews), validates, and upserts. Idempotent (upsert by id); takes
// effect immediately — Supabase is the live source, no redeploy.
//
//   node publish.mjs --review <owner/repo>   validate + field diff vs live rows; writes NOTHING
//   node publish.mjs <owner/repo>            upsert (run ONLY after the user approved the review)

import {
  SITE_ROOT_HINT,
  collectionRow,
  eqId,
  loadSupabaseEnv,
  parseRepoUrl,
  requireRun,
  requireStep,
  resolveSiteRoot,
  runPathFor,
  saveRun,
  sbSelect,
  sbUpsert,
  skillRow,
  validateCollection,
  validateSkill,
} from "./lib.mjs";

const out = (s) => process.stdout.write(s + "\n");

// ---- assemble the record from run.json ---------------------------------------

function assemble(repoArg, slugArg) {
  const { owner, repo } = parseRepoUrl(repoArg);
  if (!slugArg) {
    process.stderr.write("Missing <pageSlug>. Usage: publish.mjs [--review] <owner/repo> <pageSlug>\n");
    process.exit(2);
  }
  const run = requireRun(owner, repo, slugArg);
  const enrich = requireStep(run, "enrich", ["done"]);
  const card = requireStep(run, "card", ["approved"]);

  const entry = enrich.skills.find((s) => s.pageSlug === run.skill);
  if (!entry) {
    process.stderr.write(`run.skill "${run.skill}" not among enriched skills.\n`);
    process.exit(1);
  }

  const collection = {
    ...enrich.collection,
    name: card.collection.name,
    shortDescription: card.collection.shortDescription,
    websiteURL: card.collection.websiteURL ?? null,
    longDescription: card.collection.longDescription ?? null,
    whenToUse: card.collection.whenToUse ?? [],
    faq: card.collection.faq ?? [],
    skills: enrich.skills.map((s) => s.id),
  };

  const video = run.steps.video?.status === "done" ? run.steps.video : null;
  const skill = {
    name: card.skill.name,
    id: entry.id,
    collection: enrich.collection.id,
    description: card.skill.description,
    longDescription: card.skill.longDescription ?? null,
    whenToUse: card.skill.whenToUse ?? [],
    faq: card.skill.faq ?? [],
    relatedSkills: card.skill.relatedSkills ?? [],
    referenceFile: entry.referenceFile,
    installCommand: entry.installCommand,
    tools: entry.tools || [],
    kind: card.skill.kind,
    useCases: card.skill.useCases,
    previewVideo: video?.previewVideo ?? null,
    previewImage: video?.previewImage ?? null,
  };

  return { owner, repo, run, entry, collection, skill, videoDone: !!video };
}

function validate(collection, skill) {
  return [
    ...validateCollection(collection).map((e) => `collection: ${e}`),
    ...validateSkill(skill, collection.id).map((e) => `skill: ${e}`),
  ];
}

function tryEnv() {
  const siteRoot = resolveSiteRoot();
  if (!siteRoot) return null;
  try {
    return loadSupabaseEnv(siteRoot);
  } catch {
    return null;
  }
}

// ---- review -------------------------------------------------------------------

function short(v) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s == null) return "—";
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

function printDiff(label, existing, proposed) {
  out(`\n${label} (${existing ? "update" : "NEW"})  id=${proposed.id}`);
  let changed = 0;
  for (const k of Object.keys(proposed)) {
    if (JSON.stringify(existing?.[k]) === JSON.stringify(proposed[k])) continue;
    changed++;
    if (existing) out(`  ~ ${k}: ${short(existing[k])}  ->  ${short(proposed[k])}`);
    else out(`  + ${k}: ${short(proposed[k])}`);
  }
  if (existing && changed === 0) out("  (no changes — row already matches)");
}

async function review(repoArg, slugArg) {
  const { owner, repo, entry, collection, skill, videoDone } = assemble(repoArg, slugArg);
  const errs = validate(collection, skill);

  const env = tryEnv();
  if (!env) out("! no Supabase creds — showing proposed rows without a live diff.");
  const related = skill.relatedSkills; // curated in the card (step 2), not auto-derived
  const cRow = collectionRow(collection);
  const sRow = skillRow(skill, { relatedSkillSlugs: related });

  let exC = null, exS = null;
  if (env) {
    [exC] = await sbSelect(env, "collections", eqId(cRow.id));
    [exS] = await sbSelect(env, "skills", eqId(sRow.id));
  }
  if (exC) {
    // skills/stars/updated_at drift routinely; the rest is shared display copy.
    const routine = new Set(["skills", "github_stars", "updated_at"]);
    const shared = Object.keys(cRow).filter(
      (k) => !routine.has(k) && JSON.stringify(exC[k]) !== JSON.stringify(cRow[k]),
    );
    if (shared.length) {
      const n = Array.isArray(exC.skills) ? exC.skills.length : 0;
      out(
        `\n⚠ collection is already LIVE${n ? ` (${n} skill(s) reference it)` : ""} and this run changes ` +
          `${shared.join(", ")} — shown on every sibling page. Mirror live values unless the change is deliberate.`,
      );
    }
  }
  printDiff("collection", exC, cRow);
  printDiff("skill", exS, sRow);

  out("\n— validation —");
  if (!videoDone) out("  ! video step not done — preview_video/preview_image will be null.");
  if (errs.length) {
    for (const e of errs) out(`  ✗ ${e}`);
    out(`\nFAIL: ${errs.length} problem(s). Fix run.json (re-run the relevant step) and re-review. Nothing was written.`);
    process.exit(1);
  }
  out("  ✓ all required fields present; kind/use_cases valid.");
  out(`\nOK to publish (after user approval):  node publish.mjs ${owner}/${repo} ${entry.pageSlug}`);
}

// ---- publish ------------------------------------------------------------------

async function publish(repoArg, slugArg) {
  const { owner, repo, run, entry, collection, skill, videoDone } = assemble(repoArg, slugArg);

  // Re-validate at the gate even if review was skipped — never write bad data.
  const errs = validate(collection, skill);
  if (errs.length) {
    process.stderr.write("Refusing to publish — validation failed:\n");
    for (const e of errs) process.stderr.write(`  ✗ ${e}\n`);
    process.exit(1);
  }
  if (!videoDone) out("! publishing without previews (video step not done).");

  const siteRoot = resolveSiteRoot();
  if (!siteRoot) {
    process.stderr.write(SITE_ROOT_HINT + "\n");
    process.exit(1);
  }
  const env = loadSupabaseEnv(siteRoot);
  const related = skill.relatedSkills; // curated in the card (step 2), not auto-derived

  // Collections first (skills FK-reference them).
  await sbUpsert(env, "collections", [collectionRow(collection)]);
  out(`✓ upserted collection ${collection.id}`);
  await sbUpsert(env, "skills", [skillRow(skill, { relatedSkillSlugs: related })]);
  out(`✓ upserted skill ${skill.id}`);

  // Read back so the report reflects the live row, not just our intent.
  const [row] = await sbSelect(env, "skills", `${eqId(skill.id)}&select=id,kind,preview_video,preview_image`);
  const verifyUrl = `/s/${owner}/${repo}/${entry.pageSlug}`;
  out(`\nLive row: ${JSON.stringify(row)}`);
  out(`Verify:   open ${verifyUrl} (or Discover) — served from Supabase, no redeploy.`);
  if (videoDone)
    out(`Note:     previews serve from the media CDN — already live, no deploy.`);

  run.steps.publish = {
    status: "done",
    collectionId: collection.id,
    skillId: skill.id,
    relatedSkillSlugs: related,
    verifyUrl,
    liveRow: row ?? null,
  };
  saveRun(owner, repo, run);
  out(`\nrun.json updated: ${runPathFor(owner, repo, run.skill)}`);
}

// ---- dispatch -----------------------------------------------------------------

const args = process.argv.slice(2);
const main = args[0] === "--review" ? review(args[1], args[2]) : args[0] ? publish(args[0], args[1]) : null;
if (!main) {
  process.stderr.write("Usage:\n  publish.mjs --review <owner/repo> <pageSlug>\n  publish.mjs <owner/repo> <pageSlug>\n");
  process.exit(2);
}
main.catch((err) => {
  process.stderr.write(`${args[0] === "--review" ? "review" : "publish"} failed: ${err.message}\n`);
  process.exit(1);
});
