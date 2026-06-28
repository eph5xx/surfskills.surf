import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillUseCase,
} from "./types";

// Shared shapes and label maps for the skill catalog. The catalog data itself now
// lives in Supabase (fetched by ./db.ts for Discover and /s/**); the homepage uses
// its own code-driven set (../featured-skills). What remains here is the structure
// and the enum→label maps that both worlds depend on.

export interface DirectoryEntry {
  collection: Collection;
  skill: DirectorySkill;
  relatedSkillSlugs: string[];
}

export const skillSlugFromId = (id: string): string => {
  const parts = id.split("/");
  return parts[parts.length - 1] ?? id;
};

// Human labels for the SkillKind / SkillUseCase enums — used by the collection
// page facet chips and anywhere an enum needs a display string.
export const KIND_LABELS: Record<SkillKind, string> = {
  [SkillKind.Action]: "Action",
  [SkillKind.Mode]: "Mode",
  [SkillKind.Knowledge]: "Knowledge",
  [SkillKind.Router]: "Router",
};
export const USE_CASE_LABELS: Record<SkillUseCase, string> = {
  [SkillUseCase.Design]: "Design",
  [SkillUseCase.Video]: "Video",
  [SkillUseCase.Images]: "Images",
  [SkillUseCase.Writing]: "Writing",
  [SkillUseCase.SEO]: "SEO",
  [SkillUseCase.Development]: "Development",
  [SkillUseCase.Research]: "Research",
};

// URL slug for each use case (the /discover/<slug> landing pages + sitemap).
// `useCaseFromSlug` is the reverse lookup used by the dynamic route.
export const USE_CASE_SLUGS: Record<SkillUseCase, string> = {
  [SkillUseCase.Design]: "design",
  [SkillUseCase.Video]: "video",
  [SkillUseCase.Images]: "images",
  [SkillUseCase.Writing]: "writing",
  [SkillUseCase.SEO]: "seo",
  [SkillUseCase.Development]: "development",
  [SkillUseCase.Research]: "research",
};

// All use cases in display order — the canonical list for nav strips + sitemap.
export const USE_CASES: SkillUseCase[] = [
  SkillUseCase.Design,
  SkillUseCase.Video,
  SkillUseCase.Images,
  SkillUseCase.Writing,
  SkillUseCase.SEO,
  SkillUseCase.Development,
  SkillUseCase.Research,
];

const USE_CASE_BY_SLUG: Record<string, SkillUseCase | undefined> = Object.fromEntries(
  USE_CASES.map((u) => [USE_CASE_SLUGS[u], u]),
);
export const useCaseFromSlug = (slug: string): SkillUseCase | undefined =>
  USE_CASE_BY_SLUG[slug];
