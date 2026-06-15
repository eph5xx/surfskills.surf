import type { SkillContent } from "./types";
import { detail as validateStartupIdea } from "./validate-startup-idea/detail";

/** Registry of skills that have a full detail page at /skills/<slug>. */
export const skillDetails: Record<string, SkillContent> = {
  [validateStartupIdea.slug]: validateStartupIdea,
};

export function hasDetailPage(slug: string): boolean {
  return slug in skillDetails;
}
