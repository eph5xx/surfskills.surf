import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Collection,
  type DirectorySkill,
  type SkillDescription,
  type SkillTool,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";
import { type DirectoryEntry, skillSlugFromId } from "./index";

// Supabase-backed source for the catalog (Discover, /s/**, sitemap). Rows are
// mapped back to the SAME Collection / DirectorySkill / DirectoryEntry shapes the
// static model used, so every downstream view-model and component is reused
// unchanged — only the *source* moves from a static array to an async fetch.
//
// Enum-ish columns store the canonical enum KEY strings ("Action", "Founder",
// "Audit"). They're hand-editable in Studio, so mapping is defensive: an unknown
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
  audiences: string[] | null;
  tasks: string[] | null;
  related_slugs: string[] | null;
  sort_order: number | null;
}

const KIND_BY_KEY: Record<string, SkillKind | undefined> = {
  Action: SkillKind.Action,
  Mode: SkillKind.Mode,
  Knowledge: SkillKind.Knowledge,
  Router: SkillKind.Router,
};
const AUDIENCE_BY_KEY: Record<string, SkillAudience | undefined> = {
  Founder: SkillAudience.Founder,
  Design: SkillAudience.Design,
  SEO: SkillAudience.SEO,
  Developer: SkillAudience.Developer,
  Writing: SkillAudience.Writing,
};
const TASK_BY_KEY: Record<string, SkillTask | undefined> = {
  Audit: SkillTask.Audit,
  Website: SkillTask.Website,
  Video: SkillTask.Video,
  Research: SkillTask.Research,
  Review: SkillTask.Review,
  Integrate: SkillTask.Integrate,
  Image: SkillTask.Image,
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
});

/** Map a skill row to a DirectorySkill, or null if it's unusable (bad `kind`). */
const mapSkill = (row: SkillRow): DirectorySkill | null => {
  const kind = KIND_BY_KEY[row.kind];
  if (kind === undefined) {
    console.warn(`[skills/db] skipping "${row.id}": unknown kind "${row.kind}"`);
    return null;
  }
  const audiences = (row.audiences ?? [])
    .map((a) => AUDIENCE_BY_KEY[a])
    .filter((a): a is SkillAudience => a !== undefined);
  const tasks = (row.tasks ?? [])
    .map((t) => TASK_BY_KEY[t])
    .filter((t): t is SkillTask => t !== undefined);
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
    audiences,
    tasks,
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

/** Resolve a skill's related slugs to live skill records (port of resolveRelatedSkills). */
export const resolveRelated = (dir: Directory, id: string): DirectorySkill[] =>
  (dir.relatedBySkillId[id] ?? [])
    .map((slug) => dir.skillsBySlug.get(slug))
    .filter((skill): skill is DirectorySkill => skill !== undefined);

export async function loadSkill(
  supabase: SupabaseClient,
  id: string,
): Promise<{ skill: DirectorySkill; collection: Collection; related: DirectorySkill[] } | null> {
  const dir = await loadDirectory(supabase);
  const skill = dir.skillsById[id];
  if (!skill) return null;
  const collection = dir.collectionsById[skill.collection]?.collection;
  if (!collection) return null;
  return { skill, collection, related: resolveRelated(dir, id) };
}

export async function loadCollection(
  supabase: SupabaseClient,
  id: string,
): Promise<{ collection: Collection; skills: DirectorySkill[] } | null> {
  const dir = await loadDirectory(supabase);
  return dir.collectionsById[id] ?? null;
}
