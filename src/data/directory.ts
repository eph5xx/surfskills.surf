import {
  directoryEntries,
  directorySkillsById,
  skillSlugFromId,
  AUDIENCE_LABELS,
  KIND_LABELS,
  TASK_LABELS,
} from "./skill-model";

// View-model for the Discover *directory* (/discover).
//
// Unlike `skills.ts` — which flattens each skill onto a single derived `category`
// string for the landing grid — this model exposes the REAL structured fields the
// directory filters on: audience (primary axis), kind, task, plus the collection's
// author / stars / updated date. `skills.ts` and the landing page are untouched.

export interface DirectoryItem {
  id: string;
  slug: string;
  href: string;
  title: string;
  blurb: string;
  /** Primary facet axis — who the skill is for. */
  audiences: string[];
  /** What the skill is (single value). */
  kind: string;
  /** What the skill does. */
  tasks: string[];
  video?: string;
  image?: string;
  author: { name: string; url: string; avatarURL?: string };
  collectionName: string;
  githubStars?: number;
  updatedAt?: string;
  license?: string;
  available: boolean;
}

export const directoryItems: DirectoryItem[] = directoryEntries.map(
  ({ collection, skill }) => ({
    id: skill.id,
    slug: skillSlugFromId(skill.id),
    href: `/s/${skill.id}`,
    title: skill.name,
    blurb: skill.description.short,
    audiences: skill.audiences.map((a) => AUDIENCE_LABELS[a]),
    kind: KIND_LABELS[skill.kind],
    tasks: skill.tasks.map((t) => TASK_LABELS[t]),
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
    license: collection.license,
    available: skill.id in directorySkillsById,
  }),
);

// Facet options, kept in enum order but narrowed to values actually present in the
// catalog — so we never render an empty "SEO" tab while there are no SEO skills.
const audienceUsed = new Set(directoryItems.flatMap((i) => i.audiences));
const kindUsed = new Set(directoryItems.map((i) => i.kind));
const taskUsed = new Set(directoryItems.flatMap((i) => i.tasks));

export const audienceOptions = Object.values(AUDIENCE_LABELS).filter((l) =>
  audienceUsed.has(l),
);
export const kindOptions = Object.values(KIND_LABELS).filter((l) => kindUsed.has(l));
export const taskOptions = Object.values(TASK_LABELS).filter((l) => taskUsed.has(l));

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
  { key: "audience", label: "Audience", multi: false, get: (i) => i.audiences },
  { key: "kind", label: "Kind", multi: true, get: (i) => [i.kind] },
  { key: "task", label: "Task", multi: true, get: (i) => i.tasks },
  // ↓ Adding a filterable field is one line — this is the whole extension point.
  { key: "license", label: "License", multi: true, get: (i) => (i.license ? [i.license] : []) },
];

// Facet definitions with present values + catalog counts, ordered most-common first
// so the useful values stay at the top of a list as it grows.
export const facets: FacetDef[] = FACET_REGISTRY.map((f) => {
  const counts = new Map<string, number>();
  for (const item of directoryItems)
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
    "data-stars": String(item.githubStars ?? 0),
    "data-updated": item.updatedAt ?? "",
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

/** "2026-06-20" → "Jun 2026". */
export const formatUpdated = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(d);
};

/** "2026-06-25" → "Jun 25, 2026". */
export const formatUpdatedFull = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
};
