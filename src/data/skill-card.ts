import { skillSlugFromId } from "./skill-model";
import type { DirectorySkill } from "./skill-model/types";
import { SkillAudience, SkillTask } from "./skill-model/types";

// The flattened card view-model shared by the landing grid, the Discover-adjacent
// collection roster, and skill-detail "related" cards. `toSkillCard` is the ONE
// place that derives a card from a DirectorySkill, so the static (code-driven)
// landing and the DB-driven catalog pages produce byte-identical cards.

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

const mapCategory = (audiences: SkillAudience[], tasks: SkillTask[]): string => {
  if (tasks.includes(SkillTask.Video)) return "Motion";
  if (audiences.includes(SkillAudience.Founder)) return "Startups";
  if (audiences.includes(SkillAudience.Design)) return "Design";
  if (audiences.includes(SkillAudience.Writing)) return "Writing";
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
  if (tasks.includes(SkillTask.Integrate)) return "App -> persistent memory";
  return "Input -> output";
};

export interface ToSkillCardOptions {
  featured?: boolean;
  /** Whether the skill has a live detail page. DB rows are live; static catalog
   *  entries are too. Coming-soon roster tiles are built without `toSkillCard`. */
  available?: boolean;
  testedDate?: string;
}

export const toSkillCard = (skill: DirectorySkill, opts: ToSkillCardOptions = {}): Skill => {
  const slug = skillSlugFromId(skill.id);
  return {
    id: skill.id,
    slug,
    title: skill.name,
    blurb: skill.description.short,
    category: mapCategory(skill.audiences, skill.tasks),
    tools: mapTools(slug, skill.audiences),
    free: true,
    featured: opts.featured ?? false,
    thumbLabel: mapThumbLabel(skill.tasks),
    testedDate: opts.testedDate ?? "Jun 2026",
    verified: true,
    available: opts.available ?? true,
    video: skill.previewVideo,
  };
};
