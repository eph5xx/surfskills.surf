import type { SkillContent } from "./types";
import { detail as validateStartupIdea } from "./validate-startup-idea/detail";
import { detail as designYourLanding } from "./design-your-landing/detail";
import { detail as deepMarketResearch } from "./deep-market-research/detail";
import { detail as coldEmailEngine } from "./cold-email-engine/detail";
import { detail as pitchDeckNarrative } from "./pitch-deck-narrative/detail";
import { detail as hyperframes } from "./hyperframes/detail";

/** Registry of skills that have a full detail page at /skills/<slug>. */
export const skillDetails: Record<string, SkillContent> = {
  [validateStartupIdea.slug]: validateStartupIdea,
  [designYourLanding.slug]: designYourLanding,
  [deepMarketResearch.slug]: deepMarketResearch,
  [coldEmailEngine.slug]: coldEmailEngine,
  [pitchDeckNarrative.slug]: pitchDeckNarrative,
  [hyperframes.slug]: hyperframes,
};
