#!/usr/bin/env node
// Pick entry point: source -> repo scan -> basic checks -> candidate pool.
//
// The pool is cached per day at cards/.pick/<date>-<source>.json, so a batch of
// cards fetches the lists once. Every run rewrites the digest next to it
// (<date>-<source>.md) without skills that have a card folder, and prints a
// short summary.
//
// Usage: node pick-candidates.mjs --source trending|catalog [--refresh]

import { writeFileSync } from "node:fs";
import { catalogIndex, catalogRepos } from "./pick-catalog.mjs";
import { scanRepo } from "./pick-check.mjs";
import { hypeScore, trendingRepos } from "./pick-trending.mjs";
import { featuredSkillIds } from "./pick-lib.mjs";
import { PICK_DIR, existsSync, join, log, mapLimit, parseArgs, readJSON, today, writeJSON } from "./shared/core.mjs";

export function poolPath(source, date = today()) {
  return join(PICK_DIR, `${date}-${source}.json`);
}

async function buildPool(source) {
  const entries = source === "trending" ? await trendingRepos() : await catalogRepos();
  const index = await catalogIndex();
  log(`scanning ${entries.length} repos from ${source}…`);
  const results = await mapLimit(entries, 6, async (entry) => {
    try {
      return await scanRepo(entry, index);
    } catch (e) {
      return { dropped: `scan failed: ${e.message}` };
    }
  });
  const repos = [];
  const dropped = [];
  results.forEach((r, i) => {
    if (r.dropped) dropped.push({ repo: entries[i].repo, reason: r.dropped });
    else repos.push(r);
  });
  return { generated_at: new Date().toISOString(), source, repos, dropped };
}

const HYPE_LABEL = {
  trendshift_daily: (v) => `trendshift today #${v}`,
  trendshift_weekly: (v) => `trendshift this week #${v}`,
  github_stars_today: (v) => `+${v} stars today`,
  github_stars_week: (v) => `+${v} stars this week`,
};

function clip(s, n) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/** Short Markdown view of the passing skills: what the picker reads first. */
function digest(pool) {
  const out = [`# Candidates: ${pool.source} (${pool.generated_at.slice(0, 10)})`, ""];
  out.push("Only skills that passed the basic checks. Full data: the .json file next to this one.", "");
  for (const r of pool.repos) {
    const pass = r.skills.filter((s) => s.status === "pass");
    if (!pass.length) continue;
    const hype = r.hype ? Object.entries(r.hype).filter(([, v]) => v != null).map(([k, v]) => HYPE_LABEL[k](v)) : [];
    const facts = [
      r.in_catalog ? "in catalog" : "NEW to catalog",
      `${r.stars} stars`,
      ...hype,
      `created ${r.created_at}`,
      r.license || "no license",
      `${Math.round(r.skill_share * 100)}% skill files`,
    ];
    out.push(`## ${r.repo}`, "", facts.join(" · "));
    if (r.description) out.push("", clip(r.description, 300));
    if (r.flags.length) out.push("", `Repo flags: ${r.flags.join("; ")}`);
    out.push("", `Files: ${r.files_dir}`, "");
    for (const s of pass) {
      const bits = [`${s.lines} lines`, s.has_page ? "has page" : null].filter(Boolean).join(", ");
      out.push(`- \`${s.skill_id}\` (${s.path || "repo root"}; ${bits}): ${clip(s.description, 220)}`);
      if (s.flags.length) out.push(`  Flags: ${s.flags.join("; ")}`);
    }
    out.push("");
  }
  return out.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = args.source;
  if (source !== "trending" && source !== "catalog") {
    log("Usage: pick-candidates.mjs --source trending|catalog [--refresh]");
    process.exit(2);
  }

  const path = poolPath(source);
  let pool;
  if (existsSync(path) && !args.refresh) pool = readJSON(path);
  else {
    pool = await buildPool(source);
    if (source === "trending") pool.repos.sort((a, b) => hypeScore(b.hype) - hypeScore(a.hype));
    writeJSON(path, pool);
  }

  // The cached pool stays complete; the digest and summary hide featured skills.
  const featured = featuredSkillIds();
  const open = {
    ...pool,
    repos: pool.repos
      .map((r) => ({ ...r, skills: r.skills.filter((s) => !featured.has(s.skill_id.toLowerCase())) }))
      .filter((r) => r.skills.length),
  };
  const digestPath = path.replace(/\.json$/, ".md");
  writeFileSync(digestPath, digest(open));

  const passing = open.repos.map((r) => ({ r, n: r.skills.filter((s) => s.status === "pass").length })).filter((x) => x.n);
  const total = passing.reduce((sum, x) => sum + x.n, 0);
  const lines = [`pool: ${path}`, `digest: ${digestPath}`, `${source}: ${total} skill(s) pass in ${passing.length} repo(s); ${pool.dropped.length} repo(s) dropped`];
  for (const { r, n } of passing) {
    const hype = r.hype ? Object.entries(r.hype).map(([k, v]) => `${k}=${v}`).join(" ") : `stars=${r.stars}`;
    lines.push(`  ${r.repo}  ${n}/${r.skills.length} pass  ${r.in_catalog ? "in catalog" : "NEW"}  ${hype}`);
  }
  if (!total) lines.push("no candidates");
  process.stdout.write(lines.join("\n") + "\n");
}

main().catch((e) => {
  log(e.stack || e.message);
  process.exit(1);
});
