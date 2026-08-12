import { getCollection } from "astro:content";
import {
  type Collection,
  type DirectorySkill,
  type SkillDescription,
  type SkillTool,
  type WhenToUseItem,
  type FaqItem,
  SkillKind,
  SkillUseCase,
} from "./types";
import { type DirectoryEntry, skillSlugFromId } from "./index";

// Frozen catalog source (Discover, /s/**, sitemap, llms.txt). Rows live in two
// content collections (src/data/catalog/*.json, defined in src/content.config.ts)
// and are mapped back to the SAME Collection / DirectorySkill / DirectoryEntry
// shapes the app already used, so every downstream view-model and component is
// reused unchanged — only the *source* moved (Supabase -> build-time JSON).
//
// Enum-ish columns store the canonical enum KEY strings ("Action", "Design",
// "Research"). Mapping stays defensive: an unknown key is dropped (arrays) or the
// whole row is skipped-and-logged (kind), never allowed to surface as `undefined`.

interface CollectionRow {
  id: string;
  name: string;
  short_description: string;
  repository_url: string;
  website_url: string | null;
  external_links: string[] | null;
  author_name: string;
  author_url: string;
  author_avatar_url: string | null;
  license: string | null;
  github_stars: number | null;
  updated_at: string | null;
  install_command: string;
  skills: string[] | null;
  long_description: string | null;
  when_to_use: unknown;
  faq: unknown;
}

interface SkillRow {
  id: string;
  collection_id: string;
  name: string;
  description: SkillDescription;
  reference_file: string | null;
  install_command: string | null;
  tools: SkillTool[] | null;
  preview_video: string | null;
  preview_image: string | null;
  kind: string;
  use_cases: string[] | null;
  related_slugs: string[] | null;
  sort_order: number | null;
  created_at: string;
  long_description: string | null;
  when_to_use: unknown;
  faq: unknown;
}

/** jsonb columns are hand-editable in Studio; keep only well-formed entries. */
const cleanWhenToUse = (raw: unknown): WhenToUseItem[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.filter(
    (x): x is WhenToUseItem =>
      !!x && typeof x === "object" &&
      typeof (x as WhenToUseItem).title === "string" &&
      typeof (x as WhenToUseItem).body === "string",
  );
  return items.length > 0 ? items : undefined;
};

const cleanFaq = (raw: unknown): FaqItem[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.filter(
    (x): x is FaqItem =>
      !!x && typeof x === "object" &&
      typeof (x as FaqItem).q === "string" &&
      typeof (x as FaqItem).a === "string",
  );
  return items.length > 0 ? items : undefined;
};

const KIND_BY_KEY: Record<string, SkillKind | undefined> = {
  Action: SkillKind.Action,
  Mode: SkillKind.Mode,
  Knowledge: SkillKind.Knowledge,
  Router: SkillKind.Router,
};
const USE_CASE_BY_KEY: Record<string, SkillUseCase | undefined> = {
  Design: SkillUseCase.Design,
  Video: SkillUseCase.Video,
  Images: SkillUseCase.Images,
  Writing: SkillUseCase.Writing,
  SEO: SkillUseCase.SEO,
  Development: SkillUseCase.Development,
  Research: SkillUseCase.Research,
  Meta: SkillUseCase.Meta,
};

const mapCollection = (row: CollectionRow): Collection => ({
  name: row.name,
  id: row.id,
  shortDescription: row.short_description,
  repositoryURL: row.repository_url,
  websiteURL: row.website_url ?? undefined,
  externalLinks: row.external_links ?? [],
  author: {
    url: row.author_url,
    name: row.author_name,
    avatarURL: row.author_avatar_url ?? undefined,
  },
  license: row.license ?? undefined,
  githubStars: row.github_stars ?? undefined,
  updatedAt: row.updated_at ?? undefined,
  installCommand: row.install_command,
  skills: row.skills ?? [],
  longDescription: row.long_description ?? undefined,
  whenToUse: cleanWhenToUse(row.when_to_use),
  faq: cleanFaq(row.faq),
});

/** Map a skill row to a DirectorySkill, or null if it's unusable (bad `kind`). */
const mapSkill = (row: SkillRow): DirectorySkill | null => {
  const kind = KIND_BY_KEY[row.kind];
  if (kind === undefined) {
    console.warn(`[skills/db] skipping "${row.id}": unknown kind "${row.kind}"`);
    return null;
  }
  const useCases = (row.use_cases ?? [])
    .map((u) => USE_CASE_BY_KEY[u])
    .filter((u): u is SkillUseCase => u !== undefined);
  return {
    name: row.name,
    id: row.id,
    collection: row.collection_id,
    description: row.description,
    referenceFile: row.reference_file ?? undefined,
    installCommand: row.install_command ?? undefined,
    tools: row.tools ?? undefined,
    previewVideo: row.preview_video ?? undefined,
    previewImage: row.preview_image ?? undefined,
    kind,
    useCases,
    createdAt: row.created_at,
    longDescription: row.long_description ?? undefined,
    whenToUse: cleanWhenToUse(row.when_to_use),
    faq: cleanFaq(row.faq),
  };
};

export interface Directory {
  entries: DirectoryEntry[];
  collectionsById: Record<string, { collection: Collection; skills: DirectorySkill[] }>;
  skillsById: Record<string, DirectorySkill>;
  /** Skill ids that have a live page — for the directory `available` flag. */
  availableIds: Set<string>;
  relatedBySkillId: Record<string, string[]>;
  skillsBySlug: Map<string, DirectorySkill>;
}

// Reproduce the ordering the Supabase query guaranteed: sort_order ascending with
// nulls last, then created_at descending. Content collections don't preserve any
// source order, so the sort has to be explicit here.
const compareSkillRows = (a: SkillRow, b: SkillRow): number => {
  const sa = a.sort_order;
  const sb = b.sort_order;
  if (sa !== sb) {
    if (sa === null || sa === undefined) return 1;
    if (sb === null || sb === undefined) return -1;
    return sa - sb;
  }
  return b.created_at.localeCompare(a.created_at);
};

/** Single load primitive: two content collections, mapped into the familiar aggregates. */
export async function loadDirectory(): Promise<Directory> {
  const [collectionEntries, skillEntries] = await Promise.all([
    getCollection("collections"),
    getCollection("skills"),
  ]);
  const collectionRows = collectionEntries.map((e) => e.data) as CollectionRow[];
  const skillRows = (skillEntries.map((e) => e.data) as SkillRow[]).sort(
    compareSkillRows,
  );

  const collectionsByIdRaw = new Map<string, Collection>();
  for (const row of collectionRows) {
    collectionsByIdRaw.set(row.id, mapCollection(row));
  }

  const entries: DirectoryEntry[] = [];
  const skillsById: Record<string, DirectorySkill> = {};
  const relatedBySkillId: Record<string, string[]> = {};
  const skillsBySlug = new Map<string, DirectorySkill>();
  const grouped: Record<string, DirectorySkill[]> = {};

  for (const row of skillRows) {
    const skill = mapSkill(row);
    if (!skill) continue;
    const collection = collectionsByIdRaw.get(row.collection_id);
    if (!collection) {
      console.warn(`[skills/db] skipping "${row.id}": no collection "${row.collection_id}"`);
      continue;
    }
    const relatedSkillSlugs = row.related_slugs ?? [];
    entries.push({ collection, skill, relatedSkillSlugs });
    skillsById[skill.id] = skill;
    relatedBySkillId[skill.id] = relatedSkillSlugs;
    skillsBySlug.set(skillSlugFromId(skill.id), skill);
    (grouped[collection.id] ??= []).push(skill);
  }

  const collectionsById: Record<
    string,
    { collection: Collection; skills: DirectorySkill[] }
  > = {};
  for (const [id, skills] of Object.entries(grouped)) {
    collectionsById[id] = { collection: collectionsByIdRaw.get(id)!, skills };
  }

  return {
    entries,
    collectionsById,
    skillsById,
    availableIds: new Set(Object.keys(skillsById)),
    relatedBySkillId,
    skillsBySlug,
  };
}

/** Resolve a skill's related slugs to full directory entries (skill + its collection),
 *  ready for buildDirectoryItems — so "Pairs well with" reuses the Discover card. */
export const resolveRelatedEntries = (dir: Directory, id: string): DirectoryEntry[] =>
  (dir.relatedBySkillId[id] ?? [])
    .map((slug) => dir.skillsBySlug.get(slug))
    .filter((skill): skill is DirectorySkill => skill !== undefined)
    .map((skill) => ({
      collection: dir.collectionsById[skill.collection]!.collection,
      skill,
      relatedSkillSlugs: [],
    }));

export async function loadSkill(id: string): Promise<{
  skill: DirectorySkill;
  collection: Collection;
  related: DirectoryEntry[];
  availableIds: Set<string>;
} | null> {
  const dir = await loadDirectory();
  const skill = dir.skillsById[id];
  if (!skill) return null;
  const collection = dir.collectionsById[skill.collection]?.collection;
  if (!collection) return null;
  return { skill, collection, related: resolveRelatedEntries(dir, id), availableIds: dir.availableIds };
}

export async function loadCollection(
  id: string,
): Promise<{ collection: Collection; skills: DirectorySkill[] } | null> {
  const dir = await loadDirectory();
  return dir.collectionsById[id] ?? null;
}
