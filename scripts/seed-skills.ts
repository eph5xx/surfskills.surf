/**
 * One-time seed: import the static skill catalog (src/data/skill-model) into
 * Supabase. Idempotent (upsert by id), so it's safe to re-run after editing the
 * TS files. After seeding, the DB is the source for Discover / /s/** / sitemap;
 * the TS files remain only as the landing's source and this seed input.
 *
 *   npm run seed:skills
 *
 * Reads PUBLIC_SUPABASE_URL from .env and SUPABASE_SECRET_KEY from .dev.vars
 * (service role — bypasses RLS). Run from the project root.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { directoryEntries } from "../src/data/skill-model/index";
import { SkillKind, SkillAudience, SkillTask } from "../src/data/skill-model/types";

// Minimal KEY=VALUE loader (Node-version agnostic) for .env / .dev.vars.
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".dev.vars");

const url = process.env.PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Missing PUBLIC_SUPABASE_URL (.env) or SUPABASE_SECRET_KEY (.dev.vars). Cannot seed.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // Dedupe collections by id (a collection can back several directory entries).
  const collectionRows = [
    ...new Map(
      directoryEntries.map(({ collection: c }) => [
        c.id,
        {
          id: c.id,
          name: c.name,
          short_description: c.shortDescription,
          readme: c.readme ?? null,
          repository_url: c.repositoryURL,
          website_url: c.websiteURL ?? null,
          external_links: c.externalLinks ?? [],
          author_name: c.author.name,
          author_url: c.author.url,
          author_avatar_url: c.author.avatarURL ?? null,
          license: c.license ?? null,
          github_stars: c.githubStars ?? null,
          updated_at: c.updatedAt ?? null,
          install_command: c.installCommand,
          install_count: c.installCount ?? null,
          skills: c.skills ?? [],
        },
      ]),
    ).values(),
  ];

  const skillRows = directoryEntries.map(({ skill: s, relatedSkillSlugs }, i) => ({
    id: s.id,
    collection_id: s.collection,
    name: s.name,
    description: s.description,
    example: s.example,
    reference_file: s.referenceFile ?? null,
    install_command: s.installCommand ?? null,
    tools: s.tools ?? [],
    preview_video: s.previewVideo ?? null,
    preview_image: s.previewImage ?? null,
    external_links: s.externalLinks ?? [],
    // numeric enum -> canonical key name (the DB stores keys, not labels)
    kind: SkillKind[s.kind],
    audiences: s.audiences.map((a) => SkillAudience[a]),
    tasks: s.tasks.map((t) => SkillTask[t]),
    related_slugs: relatedSkillSlugs,
    sort_order: i, // preserve the hand-curated directoryEntries order
  }));

  // Collections first (skills FK-reference them).
  const c = await supabase.from("collections").upsert(collectionRows, { onConflict: "id" });
  if (c.error) throw c.error;
  console.log(`✓ upserted ${collectionRows.length} collections`);

  const s = await supabase.from("skills").upsert(skillRows, { onConflict: "id" });
  if (s.error) throw s.error;
  console.log(`✓ upserted ${skillRows.length} skills`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
