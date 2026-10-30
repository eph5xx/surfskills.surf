#!/usr/bin/env node
// Facts for the Card writer: the skill's frontmatter, whether its repo is on the
// site, the names already taken, and (for a new repo) the repo's metadata and
// README. The README is saved into Pick's cache next to the repo's other files.
//
// Usage: node card-facts.mjs <card folder>

import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PICK_DIR, existsSync, join, log, parseFrontmatter, readJSON } from "./shared/core.mjs";
import { gh } from "./shared/github.mjs";
import { sbSelect, supabaseEnv } from "./shared/supabase.mjs";

/**
 * What the site has now: { reachable, skills: [{id,name}], collections: [{id,name}] }.
 * reachable = false (and empty lists) when Supabase can't be read.
 */
export async function siteNames() {
  const env = supabaseEnv();
  if (!env) return { reachable: false, why: "PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY not set", skills: [], collections: [] };
  try {
    const [skills, collections] = await Promise.all([
      sbSelect(env, "skills", "select=id,name"),
      sbSelect(env, "collections", "select=id,name"),
    ]);
    return { reachable: true, skills, collections };
  } catch (e) {
    return { reachable: false, why: e.message.split("\n")[0], skills: [], collections: [] };
  }
}

/**
 * Is pick.repo on the site? -> { inCatalog: true|false|null, source, collection }.
 * The live read wins; pick.in_catalog (from Pick time) is the fallback.
 */
export function repoOnSite(pick, site) {
  if (site.reachable) {
    const row = site.collections.find((c) => c.id.toLowerCase() === pick.repo.toLowerCase());
    return { inCatalog: !!row, source: "live", collection: row || null };
  }
  return { inCatalog: pick.in_catalog, source: "pick.json", collection: null };
}

/** The skill's frontmatter { name, description } from skill/SKILL.md. */
export function skillFrontmatter(card) {
  const { data } = parseFrontmatter(readFileSync(join(card, "skill", "SKILL.md"), "utf8"));
  return { name: data?.name || null, description: data?.description || null };
}

/** README already in Pick's cache (repos fetched as a tarball have it), or null. */
function cachedReadme(dir) {
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => /^readme(\.(md|markdown|txt|rst))?$/i.test(f));
  return hit ? join(dir, hit) : null;
}

async function fetchReadme(repo, sha, dir) {
  const r = await gh(`repos/${repo}/readme?ref=${sha}`);
  if (!r.path || r.path.startsWith("/") || r.path.split("/").includes("..")) throw new Error(`unsafe README path: ${r.path}`);
  const out = join(dir, r.path);
  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.partial`;
  writeFileSync(tmp, Buffer.from(r.content, r.encoding === "base64" ? "base64" : "utf8"));
  renameSync(tmp, out);
  return out;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: card-facts.mjs <card folder>");
    process.exit(2);
  }
  const card = resolve(arg);
  for (const f of ["pick.json", "skill/SKILL.md"]) {
    if (!existsSync(join(card, f))) {
      log(`${join(card, f)} is missing`);
      process.exit(1);
    }
  }
  const pick = readJSON(join(card, "pick.json"));
  const fm = skillFrontmatter(card);
  const site = await siteNames();
  const on = repoOnSite(pick, site);

  const out = [`card: ${card}`, `skill: ${pick.skill_id} (${pick.repo}@${pick.commit.slice(0, 7)}, path "${pick.path}")`];
  out.push(`  frontmatter name: ${fm.name ?? "(none)"}`);
  out.push(`  frontmatter description: ${fm.description ?? "(none)"}`);

  if (on.inCatalog === true) {
    const name = on.collection ? ` as "${on.collection.name}"` : "";
    out.push(`collection: ${pick.repo} is on the site${name} (${on.source}). Leave "collection" out of card.json.`);
  } else if (on.inCatalog === false) {
    out.push(`collection: ${pick.repo} is not on the site (${on.source}). Write "collection" in card.json.`);
  } else {
    out.push(`collection: unknown (the site can't be read and pick.json has null). Write "collection" in card.json.`);
  }

  if (site.reachable) {
    out.push(`names taken, skills (${site.skills.length}): ${site.skills.map((s) => s.name).sort().join("; ")}`);
    out.push(`names taken, collections (${site.collections.length}): ${site.collections.map((c) => c.name).sort().join("; ")}`);
  } else {
    out.push(`warning: the site can't be read (${site.why}); names taken are unknown`);
  }

  if (on.inCatalog !== true) {
    try {
      const meta = await gh(`repos/${pick.repo}`);
      out.push(`repo: ${meta.full_name}`);
      out.push(`  description: ${meta.description || "(none)"}`);
      out.push(`  license: ${meta.license?.spdx_id && meta.license.spdx_id !== "NOASSERTION" ? meta.license.spdx_id : "(none)"}`);
      out.push(`  homepage: ${meta.homepage || "(none)"}`);
      out.push(`  stars: ${meta.stargazers_count}`);
    } catch (e) {
      out.push(`warning: repo metadata unavailable (${e.message})`);
    }
    const dir = join(PICK_DIR, "repos", pick.repo.replace("/", "__"), pick.commit);
    let readme = cachedReadme(dir);
    if (!readme) {
      try {
        readme = await fetchReadme(pick.repo, pick.commit, dir);
      } catch (e) {
        out.push(`warning: README unavailable (${e.status === 404 ? "the repo has none" : e.message}); write the collection copy from skill/ and the repo description`);
      }
    }
    if (readme) out.push(`readme: ${readme} (${readFileSync(readme).length} bytes, at ${pick.commit.slice(0, 7)})`);
  }

  process.stdout.write(out.join("\n") + "\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    log(e.stack || e.message);
    process.exit(1);
  });
}
