import type { SupabaseClient } from "@supabase/supabase-js";
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

// Supabase-backed source for the catalog (Discover, /s/**, sitemap). Rows are
// mapped back to the SAME Collection / DirectorySkill / DirectoryEntry shapes the
// static model used, so every downstream view-model and component is reused
// unchanged — only the *source* moves from a static array to an async fetch.
//
// Enum-ish columns store the canonical enum KEY strings ("Action", "Design",
// "Research"). They're hand-editable in Studio, so mapping is defensive: an unknown
// key is dropped (arrays) or the whole row is skipped-and-logged (kind), never
// allowed to surface as `undefined` and 500 a page.

interface CollectionRow {
  id: string;
  name: string;
  short_description: string;
  readme: string | null;
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
  install_count: number | null;
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
  example: string;
  reference_file: string | null;
  install_command: string | null;
  tools: SkillTool[] | null;
  preview_video: string | null;
  preview_image: string | null;
  external_links: string[] | null;
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
  readme: row.readme ?? undefined,
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
  installCount: row.install_count ?? undefined,
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
    example: row.example,
    referenceFile: row.reference_file ?? undefined,
    installCommand: row.install_command ?? undefined,
    tools: row.tools ?? undefined,
    previewVideo: row.preview_video ?? undefined,
    previewImage: row.preview_image ?? undefined,
    externalLinks: row.external_links ?? [],
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

/** Single fetch primitive: two selects, mapped into the familiar aggregates. */
export async function loadDirectory(supabase: SupabaseClient): Promise<Directory> {
  const [collectionsRes, skillsRes] = await Promise.all([
    supabase.from("collections").select("*"),
    supabase
      .from("skills")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);
  if (collectionsRes.error) throw collectionsRes.error;
  if (skillsRes.error) throw skillsRes.error;

  const collectionsByIdRaw = new Map<string, Collection>();
  for (const row of (collectionsRes.data ?? []) as CollectionRow[]) {
    collectionsByIdRaw.set(row.id, mapCollection(row));
  }

  const entries: DirectoryEntry[] = [];
  const skillsById: Record<string, DirectorySkill> = {};
  const relatedBySkillId: Record<string, string[]> = {};
  const skillsBySlug = new Map<string, DirectorySkill>();
  const grouped: Record<string, DirectorySkill[]> = {};

  for (const row of (skillsRes.data ?? []) as SkillRow[]) {
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

export async function loadSkill(
  supabase: SupabaseClient,
  id: string,
): Promise<{
  skill: DirectorySkill;
  collection: Collection;
  related: DirectoryEntry[];
  availableIds: Set<string>;
} | null> {
  const dir = await loadDirectory(supabase);
  const skill = dir.skillsById[id];
  if (!skill) return null;
  const collection = dir.collectionsById[skill.collection]?.collection;
  if (!collection) return null;
  return { skill, collection, related: resolveRelatedEntries(dir, id), availableIds: dir.availableIds };
}

export async function loadCollection(
  supabase: SupabaseClient,
  id: string,
): Promise<{ collection: Collection; skills: DirectorySkill[] } | null> {
  const dir = await loadDirectory(supabase);
  return dir.collectionsById[id] ?? null;
}
