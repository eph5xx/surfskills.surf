import {
  directoryCollections,
  directoryEntries,
  directorySkills,
  skillSlugFromId,
} from "./skill-model";
import { SkillAudience, SkillTask } from "./skill-model/types";
import { formatUpdatedFull } from "./directory";

export interface Skill {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  category: string;
  tools: string[];
  free: boolean;
  featured?: boolean;
  thumbLabel: string;
  curatorNote?: string;
  testedDate?: string;
  verified: boolean;
  video?: string;
  available: boolean;
}

// Curated homepage "example section" (SkillShowcase). This is an explicit
// allowlist, NOT derived from directoryEntries, so newly-onboarded skills
// (e.g. via create-surf-skill) never auto-appear in the homepage example
// section. Add an id here by hand to feature a skill.
const FEATURED_SKILL_IDS = new Set<string>([
  "greensock/gsap-skills/gsap-scrolltrigger",
  "jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better",
  "Leonxlnx/taste-skill/design-taste-frontend",
  "Egonex-AI/Understand-Anything/understand",
  "eph5xx/tweakidea/tweak-evaluate",
  "heygen-com/hyperframes/hyperframes",
]);

export const author = {
  name: "Sasha S.",
  initial: "S",
  avatarBg: "#3D5A80",
};

const mapCategory = (audiences: SkillAudience[], tasks: SkillTask[]): string => {
  if (tasks.includes(SkillTask.Video)) return "Motion";
  if (audiences.includes(SkillAudience.Founder)) return "Startups";
  if (audiences.includes(SkillAudience.Design)) return "Design";
  if (tasks.includes(SkillTask.Research)) return "Research";
  if (tasks.includes(SkillTask.Website)) return "Design";
  if (tasks.includes(SkillTask.Audit)) return "Research";
  return "Research";
};

const mapTools = (slug: string, audiences: SkillAudience[]): string[] => {
  const tools = new Set<string>(["Claude Code"]);
  if (audiences.includes(SkillAudience.Developer) || audiences.includes(SkillAudience.Design)) {
    tools.add("Cursor");
    tools.add("Gemini");
  }
  if (slug === "design-taste-frontend") tools.add("Lovable");
  return Array.from(tools);
};

const mapThumbLabel = (tasks: SkillTask[]): string => {
  if (tasks.includes(SkillTask.Video)) return "Prompt -> rendered video";
  if (tasks.includes(SkillTask.Research)) return "Repo -> knowledge graph";
  if (tasks.includes(SkillTask.Audit)) return "Input -> scored report";
  if (tasks.includes(SkillTask.Website)) return "Input -> improved UI";
  return "Input -> output";
};

export const skills: Skill[] = directoryEntries.map(({ skill }) => {
  const slug = skillSlugFromId(skill.id);
  return {
    id: skill.id,
    slug,
    title: skill.name,
    blurb: skill.description.short,
    category: mapCategory(skill.audiences, skill.tasks),
    tools: mapTools(slug, skill.audiences),
    free: true,
    featured: FEATURED_SKILL_IDS.has(skill.id),
    thumbLabel: mapThumbLabel(skill.tasks),
    testedDate: "Jun 2026",
    verified: true,
    available: true,
    video: skill.previewVideo,
  };
});

export const skillsById: Record<string, Skill> = Object.fromEntries(
  skills.map((s) => [s.id, s]),
);

export const categories = Array.from(new Set(skills.map((skill) => skill.category))).map(
  (name) => ({ name, emoji: "•" }),
);

export const supportedTools = Array.from(
  new Set(directorySkills.flatMap((skill) => mapTools(skillSlugFromId(skill.id), skill.audiences))),
);

// ISO "YYYY-MM-DD" strings sort lexicographically == chronologically, so the
// last entry after sorting is the most recent update across all collections.
const lastUpdatedISO = directoryCollections
  .map((c) => c.updatedAt)
  .filter((d): d is string => Boolean(d))
  .sort()
  .at(-1);

export const stats = {
  lastUpdated: formatUpdatedFull(lastUpdatedISO),
} as const;
