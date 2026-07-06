import { skillSlugFromId, USE_CASE_LABELS } from "./skill-model";
import type { DirectorySkill, SkillDescription } from "./skill-model/types";
import { SkillUseCase } from "./skill-model/types";

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
  /** Still frame — the video's poster, and the thumb when there's no video. */
  image?: string;
  available: boolean;
}

// The card badge shows the skill's *primary* use case — first match by priority,
// falling back to "Research".
const CATEGORY_PRIORITY: SkillUseCase[] = [
  SkillUseCase.Video,
  SkillUseCase.Images,
  SkillUseCase.Design,
  SkillUseCase.Writing,
  SkillUseCase.SEO,
  SkillUseCase.Meta,
  SkillUseCase.Research,
  SkillUseCase.Development, // broadest — only wins when nothing more specific matches
];

const mapCategory = (useCases: SkillUseCase[]): string => {
  const primary = CATEGORY_PRIORITY.find((u) => useCases.includes(u));
  return primary !== undefined ? USE_CASE_LABELS[primary] : "Research";
};

const mapTools = (slug: string, useCases: SkillUseCase[]): string[] => {
  const tools = new Set<string>(["Claude Code"]);
  if (useCases.includes(SkillUseCase.Development) || useCases.includes(SkillUseCase.Design)) {
    tools.add("Cursor");
    tools.add("Gemini");
  }
  if (slug === "design-taste-frontend") tools.add("Lovable");
  return Array.from(tools);
};

const mapThumbLabel = (useCases: SkillUseCase[]): string => {
  if (useCases.includes(SkillUseCase.Video)) return "Prompt -> rendered video";
  if (useCases.includes(SkillUseCase.Images)) return "Prompt -> generated image";
  if (useCases.includes(SkillUseCase.Research)) return "Repo -> knowledge graph";
  if (useCases.includes(SkillUseCase.Design)) return "Input -> improved UI";
  if (useCases.includes(SkillUseCase.Development)) return "App -> persistent memory";
  return "Input -> output";
};

export interface ToSkillCardOptions {
  featured?: boolean;
  /** Whether the skill has a live detail page. DB rows are live; static catalog
   *  entries are too. Coming-soon roster tiles are built without `toSkillCard`. */
  available?: boolean;
  testedDate?: string;
}

// The subset of a DirectorySkill this card derives from. Full DirectorySkill rows
// (DB-driven catalog) satisfy it structurally; the code-driven homepage can pass a
// minimal object (see ./featured-skills) without carrying the unused catalog fields.
type SkillCardInput = Pick<DirectorySkill, "id" | "name" | "useCases" | "previewVideo"> & {
  description: Pick<SkillDescription, "short">;
  previewImage?: string;
};

export const toSkillCard = (skill: SkillCardInput, opts: ToSkillCardOptions = {}): Skill => {
  const slug = skillSlugFromId(skill.id);
  return {
    id: skill.id,
    slug,
    title: skill.name,
    blurb: skill.description.short,
    category: mapCategory(skill.useCases),
    tools: mapTools(slug, skill.useCases),
    free: true,
    featured: opts.featured ?? false,
    thumbLabel: mapThumbLabel(skill.useCases),
    testedDate: opts.testedDate ?? "Jun 2026",
    verified: true,
    available: opts.available ?? true,
    video: skill.previewVideo,
    image: skill.previewImage,
  };
};
