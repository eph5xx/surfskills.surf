import {
  collection as understandCollection,
  skill as understandSkill,
} from "./understand-anything";
import {
  collection as tasteCollection,
  skill as tasteSkill,
} from "./taste-skill";
import {
  collection as hyperframesCollection,
  skill as hyperframesSkill,
} from "./hyperframes";
import {
  collection as interfacesCollection,
  skill as interfacesSkill,
} from "./make-interfaces-feel-better";
import {
  collection as gsapCollection,
  skill as gsapScrolltriggerSkill,
} from "./gsap-scrolltrigger";
import {
  collection as tweakideaCollection,
  skill as tweakideaSkill,
} from "./validate-startup-idea";
import {
  collection as websiteToVideoCollection,
  skill as websiteToVideoSkill,
} from "./website-to-video";
import {
  collection as ponytailAuditCollection,
  skill as ponytailAuditSkill,
} from "./ponytail-audit";
import {
  collection as grillMeCollection,
  skill as grillMeSkill,
} from "./grill-me";
import {
  collection as taskObserverCollection,
  skill as taskObserverSkill,
} from "./task-observer";
import {
  collection as supermemoryCollection,
  skill as supermemorySkill,
} from "./supermemory";
import {
  collection as stopSlopCollection,
  skill as stopSlopSkill,
} from "./stop-slop";
import {
  collection as cloneWebsiteCollection,
  skill as cloneWebsiteSkill,
} from "./clone-website";
import {
  collection as bookToSkillCollection,
  skill as bookToSkillSkill,
} from "./book-to-skill";
import {
  collection as seoAuditCollection,
  skill as seoAuditSkill,
} from "./seo-audit";
import {
  collection as illoCollection,
  skill as illoSkill,
} from "./illo";
import {
  collection as humanizerCollection,
  skill as humanizerSkill,
} from "./humanizer";
import {
  collection as last30daysCollection,
  skill as last30daysSkill,
} from "./last30days";
import {
  collection as brandkitCollection,
  skill as brandkitSkill,
} from "./brandkit";
import {
  collection as imagegenFrontendWebCollection,
  skill as imagegenFrontendWebSkill,
} from "./imagegen-frontend-web";
import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export interface DirectoryEntry {
  collection: Collection;
  skill: DirectorySkill;
  relatedSkillSlugs: string[];
}

export const skillSlugFromId = (id: string): string => {
  const parts = id.split("/");
  return parts[parts.length - 1] ?? id;
};

export const directoryEntries: DirectoryEntry[] = [
  {
    collection: imagegenFrontendWebCollection,
    skill: imagegenFrontendWebSkill,
    relatedSkillSlugs: ["design-taste-frontend", "gsap-scrolltrigger"],
  },
  {
    collection: brandkitCollection,
    skill: brandkitSkill,
    relatedSkillSlugs: ["illo", "design-taste-frontend"],
  },
  {
    collection: last30daysCollection,
    skill: last30daysSkill,
    relatedSkillSlugs: ["understand", "tweak-evaluate"],
  },
  {
    collection: humanizerCollection,
    skill: humanizerSkill,
    relatedSkillSlugs: ["stop-slop", "seo-audit"],
  },
  {
    collection: illoCollection,
    skill: illoSkill,
    relatedSkillSlugs: ["design-taste-frontend", "hyperframes"],
  },
  {
    collection: seoAuditCollection,
    skill: seoAuditSkill,
    relatedSkillSlugs: ["stop-slop", "ponytail-audit"],
  },
  {
    collection: bookToSkillCollection,
    skill: bookToSkillSkill,
    relatedSkillSlugs: ["understand", "supermemory"],
  },
  {
    collection: cloneWebsiteCollection,
    skill: cloneWebsiteSkill,
    relatedSkillSlugs: ["design-taste-frontend", "gsap-scrolltrigger"],
  },
  {
    collection: stopSlopCollection,
    skill: stopSlopSkill,
    relatedSkillSlugs: ["make-interfaces-feel-better", "ponytail-audit"],
  },
  {
    collection: supermemoryCollection,
    skill: supermemorySkill,
    relatedSkillSlugs: ["understand", "gsap-scrolltrigger"],
  },
  {
    collection: taskObserverCollection,
    skill: taskObserverSkill,
    relatedSkillSlugs: ["grill-me", "ponytail-audit"],
  },
  {
    collection: grillMeCollection,
    skill: grillMeSkill,
    relatedSkillSlugs: ["understand", "tweak-evaluate"],
  },
  {
    collection: ponytailAuditCollection,
    skill: ponytailAuditSkill,
    relatedSkillSlugs: ["understand", "tweak-evaluate"],
  },
  {
    collection: websiteToVideoCollection,
    skill: websiteToVideoSkill,
    relatedSkillSlugs: ["hyperframes", "gsap-scrolltrigger"],
  },
  {
    collection: tweakideaCollection,
    skill: tweakideaSkill,
    relatedSkillSlugs: ["understand", "hyperframes"],
  },
  {
    collection: hyperframesCollection,
    skill: hyperframesSkill,
    relatedSkillSlugs: ["gsap-scrolltrigger", "tweak-evaluate"],
  },
  {
    collection: interfacesCollection,
    skill: interfacesSkill,
    relatedSkillSlugs: ["design-taste-frontend", "understand"],
  },
  {
    collection: understandCollection,
    skill: understandSkill,
    relatedSkillSlugs: ["tweak-evaluate"],
  },
  {
    collection: gsapCollection,
    skill: gsapScrolltriggerSkill,
    relatedSkillSlugs: ["hyperframes"],
  },
  {
    collection: tasteCollection,
    skill: tasteSkill,
    relatedSkillSlugs: ["make-interfaces-feel-better", "hyperframes"],
  },
];

// Dedupe by collection id: a collection can back more than one directory entry
// (multiple skills from the same repo), but it must appear once for collection
// routes/sitemap. Keeps one Collection object per id.
export const directoryCollections = [
  ...new Map(directoryEntries.map((entry) => [entry.collection.id, entry.collection])).values(),
];
export const directorySkills = directoryEntries.map((entry) => entry.skill);

export const directorySkillsById: Record<string, DirectorySkill> = Object.fromEntries(
  directorySkills.map((skill) => [skill.id, skill]),
);

// Human labels for the SkillKind / SkillAudience / SkillTask enums — used by the
// collection page facet chips and anywhere an enum needs a display string.
export const KIND_LABELS: Record<SkillKind, string> = {
  [SkillKind.Action]: "Action",
  [SkillKind.Mode]: "Mode",
  [SkillKind.Knowledge]: "Knowledge",
  [SkillKind.Router]: "Router",
};
export const AUDIENCE_LABELS: Record<SkillAudience, string> = {
  [SkillAudience.Founder]: "Startups",
  [SkillAudience.Design]: "Design",
  [SkillAudience.SEO]: "SEO",
  [SkillAudience.Developer]: "Development",
  [SkillAudience.Writing]: "Writing",
};
export const TASK_LABELS: Record<SkillTask, string> = {
  [SkillTask.Audit]: "Audit",
  [SkillTask.Website]: "Website",
  [SkillTask.Video]: "Video",
  [SkillTask.Research]: "Research",
  [SkillTask.Review]: "Review",
  [SkillTask.Integrate]: "Integrate",
  [SkillTask.Image]: "Image",
};

export interface CollectionFacets {
  kinds: string[];
  audiences: string[];
  tasks: string[];
}

/** Union of kind/audience/task labels across a collection's member skills. */
export const collectionFacets = (skills: DirectorySkill[]): CollectionFacets => {
  const kinds = new Set<SkillKind>();
  const audiences = new Set<SkillAudience>();
  const tasks = new Set<SkillTask>();
  for (const s of skills) {
    kinds.add(s.kind);
    s.audiences.forEach((a) => audiences.add(a));
    s.tasks.forEach((t) => tasks.add(t));
  }
  return {
    kinds: [...kinds].map((k) => KIND_LABELS[k]),
    audiences: [...audiences].map((a) => AUDIENCE_LABELS[a]),
    tasks: [...tasks].map((t) => TASK_LABELS[t]),
  };
};

// Collection lookup keyed by id ("owner/repo"), with its member skills resolved
// from the registered directory entries (the skills we actually have pages for).
export const directoryCollectionsById: Record<
  string,
  { collection: Collection; skills: DirectorySkill[] }
> = directoryEntries.reduce(
  (acc, entry) => {
    const id = entry.collection.id;
    if (!acc[id]) acc[id] = { collection: entry.collection, skills: [] };
    acc[id].skills.push(entry.skill);
    return acc;
  },
  {} as Record<string, { collection: Collection; skills: DirectorySkill[] }>,
);

export const directoryEntryBySkillId: Record<string, DirectoryEntry> = Object.fromEntries(
  directoryEntries.map((entry) => [entry.skill.id, entry]),
);

const directorySkillsBySlug = new Map(
  directorySkills.map((skill) => [skillSlugFromId(skill.id), skill]),
);

/** Resolve relatedSkillSlugs from a directory entry to live skill records. */
export const resolveRelatedSkills = (relatedSkillSlugs: string[]): DirectorySkill[] =>
  relatedSkillSlugs
    .map((slug) => directorySkillsBySlug.get(slug))
    .filter((skill): skill is DirectorySkill => skill !== undefined);

