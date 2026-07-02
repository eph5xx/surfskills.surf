import {
  type DirectoryEntry,
  skillSlugFromId,
  KIND_LABELS,
  USE_CASE_LABELS,
} from "./skill-model";

// View-model for the Discover *directory* (/discover).
//
// Unlike `skills.ts` — which flattens each skill onto a single derived `category`
// string for the landing grid — this model exposes the REAL structured fields the
// directory filters on: use case (primary axis), kind, plus the collection's
// author / stars / updated date. `skills.ts` and the landing page are untouched.

export interface DirectoryItem {
  id: string;
  slug: string;
  href: string;
  title: string;
  blurb: string;
  /** Primary facet axis — what you'd use the skill for. */
  useCases: string[];
  /** How you work with the skill (single value). */
  kind: string;
  video?: string;
  image?: string;
  author: { name: string; url: string; avatarURL?: string };
  collectionName: string;
  githubStars?: number;
  updatedAt?: string;
  /** When the skill was added to the site — the "Newest" sort key. */
  createdAt?: string;
  license?: string;
  available: boolean;
}

/** Map fetched directory entries to the Discover view-model. `availableIds` is the
 *  set of skill ids that have a live page (all of them, in the DB world). */
export const buildDirectoryItems = (
  entries: DirectoryEntry[],
  availableIds: Set<string>,
): DirectoryItem[] =>
  entries.map(({ collection, skill }) => ({
    id: skill.id,
    slug: skillSlugFromId(skill.id),
    href: `/s/${skill.id}`,
    title: skill.name,
    blurb: skill.description.short,
    useCases: skill.useCases.map((u) => USE_CASE_LABELS[u]),
    kind: KIND_LABELS[skill.kind],
    video: skill.previewVideo,
    image: skill.previewImage,
    author: {
      name: collection.author.name,
      url: collection.author.url,
      avatarURL: collection.author.avatarURL,
    },
    collectionName: collection.name,
    githubStars: collection.githubStars,
    updatedAt: collection.updatedAt,
    createdAt: skill.createdAt,
    license: collection.license,
    available: availableIds.has(skill.id),
  }));

export const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "stars", label: "Most stars" },
  { value: "title", label: "A–Z" },
] as const;

// ---- config-driven facets -------------------------------------------------
//
// THE single place to add a filterable field. Add one entry below (plus the field
// on DirectoryItem above) and it flows automatically into every facet-driven shell:
// the engine reads it generically, cards emit it, sidebars / menus render it, and
// result counts compute — no per-shell or per-engine edits. `license` is included
// as a worked example of adding a brand-new field.

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetDef {
  key: string;
  label: string;
  /** false → single-select (radios / segmented + an "All"); true → multi-select. */
  multi: boolean;
  values: FacetValue[];
}

const FACET_REGISTRY: {
  key: string;
  label: string;
  multi: boolean;
  get: (i: DirectoryItem) => string[];
}[] = [
  { key: "use_case", label: "Use case", multi: true, get: (i) => i.useCases },
  { key: "kind", label: "Kind", multi: true, get: (i) => [i.kind] },
  // ↓ Adding a filterable field is one line — this is the whole extension point.
  { key: "license", label: "License", multi: true, get: (i) => [i.license || "None"] },
];

// Facet definitions with present values + catalog counts, ordered most-common first
// so the useful values stay at the top of a list as it grows. Built per request
// from the fetched items.
export const buildFacets = (items: DirectoryItem[]): FacetDef[] =>
  FACET_REGISTRY.map((f) => {
    const counts = new Map<string, number>();
    for (const item of items)
      for (const v of f.get(item)) counts.set(v, (counts.get(v) ?? 0) + 1);
    const values = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    return { key: f.key, label: f.label, multi: f.multi, values };
  });

/** Per-card data attributes the engine reads — every facet value + search/sort fields. */
export const itemDataAttrs = (item: DirectoryItem): Record<string, string> => {
  const attrs: Record<string, string> = {
    "data-dir-item": "",
    "data-title": item.title.toLowerCase(),
    "data-blurb": item.blurb.toLowerCase(),
    "data-author": item.author.name.toLowerCase(),
    "data-collection": item.collectionName.toLowerCase(),
    "data-slug": item.id.toLowerCase(),
    "data-stars": String(item.githubStars ?? 0),
    "data-updated": item.updatedAt ?? "",
    "data-created": item.createdAt ?? "",
  };
  for (const f of FACET_REGISTRY) attrs[`data-facet-${f.key}`] = f.get(item).join(",");
  return attrs;
};

// ---- formatting helpers (shared by the shells) ----------------------------

/** 65949 → "65.9k" (matches the collection page). */
export const compactNumber = (n: number): string =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
    .format(n)
    .toLowerCase();

/** "2026-06-25" → "Jun 25, 2026". */
export const formatUpdatedFull = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
};
