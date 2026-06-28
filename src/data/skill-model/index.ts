import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
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
