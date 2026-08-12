import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

// Frozen catalog snapshot. Was Supabase (collections + skills tables); now two
// JSON files loaded at build time. The schemas mirror the DB row shapes so
// db.ts's existing mappers (mapCollection / mapSkill) run unchanged — the only
// thing that moved is the source. Enum-ish columns (kind, use_cases) stay plain
// strings here: the mapper does the key -> enum conversion and still skips/logs
// an unknown key rather than crashing the build.

const whenToUse = z
  .array(z.object({ title: z.string(), body: z.string() }))
  .nullable()
  .optional();

const faq = z
  .array(z.object({ q: z.string(), a: z.string() }))
  .nullable()
  .optional();

const collectionsCollection = defineCollection({
  loader: file("src/data/catalog/collections.json"),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    short_description: z.string(),
    repository_url: z.string(),
    website_url: z.string().nullable(),
    external_links: z.array(z.string()).nullable(),
    author_name: z.string(),
    author_url: z.string(),
    author_avatar_url: z.string().nullable(),
    license: z.string().nullable(),
    github_stars: z.number().nullable(),
    updated_at: z.string().nullable(),
    install_command: z.string(),
    skills: z.array(z.string()).nullable(),
    long_description: z.string().nullable(),
    when_to_use: whenToUse,
    faq,
    // present in the export, unused by mapCollection — allowed so validation passes.
    created_at: z.string().optional(),
  }),
});

const skillsCollection = defineCollection({
  loader: file("src/data/catalog/skills.json"),
  schema: z.object({
    id: z.string(),
    collection_id: z.string(),
    name: z.string(),
    // TS type is { short }, but rows carry input/output/process too — keep them.
    description: z.object({ short: z.string() }).catchall(z.string()),
    reference_file: z.string().nullable(),
    install_command: z.string().nullable(),
    tools: z.array(z.object({ name: z.string() })).nullable(),
    preview_video: z.string().nullable(),
    preview_image: z.string().nullable(),
    kind: z.string(),
    use_cases: z.array(z.string()).nullable(),
    related_slugs: z.array(z.string()).nullable(),
    sort_order: z.number().nullable(),
    created_at: z.string(),
    long_description: z.string().nullable(),
    when_to_use: whenToUse,
    faq,
  }),
});

export const collections = {
  collections: collectionsCollection,
  skills: skillsCollection,
};
