import { SkillUseCase } from "./skill-model/types";

// Code-driven data for the homepage "examples" showcase (SkillShowcase) and the
// Hero "last updated" badge. This is intentionally INDEPENDENT of the Supabase
// catalog — the homepage must never break when the DB changes — and is the
// explicit allowlist of which skills get featured (add/remove an entry by hand).
//
// Only the fields `toSkillCard` actually reads are kept (see ./skill-card); the
// full catalog lives in Supabase and is fetched by ./skill-model/db.ts for the
// Discover and /s/** pages. Order here drives render order: the first entry with
// a video becomes the large spotlight card.

export interface FeaturedSkill {
  id: string;
  name: string;
  description: { short: string };
  useCases: SkillUseCase[];
  previewVideo?: string;
  /** Parent collection's updatedAt — feeds the homepage "last updated" badge. */
  updatedAt?: string;
}

export const featuredSkills: FeaturedSkill[] = [
  {
    id: "eph5xx/tweakidea/tweak-evaluate",
    name: "Validate Startup Idea",
    description: {
      short:
        "14 independent evaluators score your pitch, each doing its own web research. An honest scorecard tells you GO, PIVOT, or STOP.",
    },
    useCases: [SkillUseCase.Research],
    previewVideo: "/skills/validate-startup-idea-demo.mp4",
    updatedAt: "2026-04-30",
  },
  {
    id: "heygen-com/hyperframes/hyperframes",
    name: "Make a Video",
    description: {
      short:
        "Describe the video you want and HyperFrames teaches your coding agent to compose it in HTML/CSS/JS. It renders a deterministic MP4, the same every time.",
    },
    useCases: [SkillUseCase.Video, SkillUseCase.Design, SkillUseCase.Development],
    previewVideo: "/skills/hyperframes-demo.mp4",
    updatedAt: "2026-06-29",
  },
  {
    id: "jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better",
    name: "Polish Your UI",
    description: {
      short:
        "Great interfaces aren't one big thing - they're 16 small details that compound.",
    },
    useCases: [SkillUseCase.Design, SkillUseCase.Development],
    previewVideo: "/skills/make-interfaces-feel-better-demo.mp4",
    updatedAt: "2026-04-19",
  },
  {
    id: "Egonex-AI/Understand-Anything/understand",
    name: "Map Any Codebase",
    description: {
      short:
        "Other tools show you a hairball. This one teaches you the codebase - every file, function, and dependency, mapped into a graph you can explore.",
    },
    useCases: [SkillUseCase.Research, SkillUseCase.Development],
    previewVideo: "/skills/understand-anything-demo.mp4",
    updatedAt: "2026-06-20",
  },
  {
    id: "greensock/gsap-skills/gsap-scrolltrigger",
    name: "Animate on Scroll",
    description: {
      short:
        "The official GreenSock skill for scroll-driven motion - pinning, scrub, and batched entrances. ScrollTrigger written the way it's actually meant to be.",
    },
    useCases: [SkillUseCase.Design, SkillUseCase.Development],
    previewVideo: "/skills/gsap-skills-demo.mp4",
    updatedAt: "2026-04-21",
  },
  {
    id: "Leonxlnx/taste-skill/design-taste-frontend",
    name: "Design With Taste",
    description: {
      short:
        "An anti-slop frontend skill: your agent reads the brief, infers the right design direction, and ships interfaces that don't look templated.",
    },
    useCases: [SkillUseCase.Design, SkillUseCase.Development],
    previewVideo: "/skills/taste-skill-demo.mp4",
    updatedAt: "2026-06-20",
  },
];
