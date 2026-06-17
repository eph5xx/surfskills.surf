import type { SkillContent } from "./types";
import { detail as validateStartupIdea } from "./validate-startup-idea/detail";
import { detail as hyperframes } from "./hyperframes/detail";
import { detail as tasteSkill } from "./taste-skill/detail";
import { detail as makeInterfacesFeelBetter } from "./make-interfaces-feel-better/detail";
import { detail as understandAnything } from "./understand-anything/detail";
import { detail as gsapSkills } from "./gsap-skills/detail";

/** Registry of skills that have a full detail page at /skills/<slug>. */
export const skillDetails: Record<string, SkillContent> = {
  [validateStartupIdea.slug]: validateStartupIdea,
  [hyperframes.slug]: hyperframes,
  [tasteSkill.slug]: tasteSkill,
  [makeInterfacesFeelBetter.slug]: makeInterfacesFeelBetter,
  [understandAnything.slug]: understandAnything,
  [gsapSkills.slug]: gsapSkills,
};
