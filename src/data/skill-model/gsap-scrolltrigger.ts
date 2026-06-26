import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "GSAP Skills",
  id: "greensock/gsap-skills",
  shortDescription:
    "The official GreenSock skills that teach your coding agent to animate anything - the way GSAP is actually meant to be written.",
  readme: "https://github.com/greensock/gsap-skills/blob/main/README.md",
  repositoryURL: "https://github.com/greensock/gsap-skills",
  license: "MIT",
  githubStars: 9734,
  updatedAt: "2026-04-21",
  externalLinks: [
    "https://www.skills.sh/greensock/gsap-skills",
    "https://claudemarketplaces.com/skills/greensock/gsap-skills",
  ],
  author: {
    url: "https://github.com/greensock",
    name: "GreenSock",
    avatarURL: "https://github.com/greensock.png",
  },
  installCommand:
    "Install this skill collection or give me an instruction how to install it: https://github.com/greensock/gsap-skills",
  skills: [
    "greensock/gsap-skills/gsap-core",
    "greensock/gsap-skills/gsap-timeline",
    "greensock/gsap-skills/gsap-scrolltrigger",
    "greensock/gsap-skills/gsap-plugins",
    "greensock/gsap-skills/gsap-utils",
    "greensock/gsap-skills/gsap-react",
    "greensock/gsap-skills/gsap-performance",
    "greensock/gsap-skills/gsap-frameworks",
  ],
};

export const skill: DirectorySkill = {
  name: "Animate on Scroll",
  id: "greensock/gsap-skills/gsap-scrolltrigger",
  collection: "greensock/gsap-skills",
  description: {
    short:
      "The official GreenSock skill for scroll-driven motion - pinning, scrub, and batched entrances. ScrollTrigger written the way it's actually meant to be.",
    input:
      "Run /gsap-scrolltrigger or describe the scroll motion you want — parallax, pinned sections, scroll-in entrances.",
    process:
      "It wires up ScrollTrigger the right way — triggers, pinning, batched entrances — not the broken patterns models guess.",
    output:
      "Production-ready scroll animation, like a hero with a staggered headline and counting stats, with reduced-motion handling.",
  },
  example:
    '/gsap-scrolltrigger "Build a HeroSection with a scroll-triggered stagger entrance"',
  referenceFile:
    "https://github.com/greensock/gsap-skills/blob/main/skills/gsap-scrolltrigger/SKILL.md",
  installCommand:
    "Install the skill or give me an instruction how to install it - gsap-scrolltrigger from https://github.com/greensock/gsap-skills",
  tools: [],
  previewVideo: "/skills/gsap-skills-demo.mp4",
  externalLinks: [
    "https://www.skills.sh/greensock/gsap-skills/gsap-scrolltrigger",
    "https://claudemarketplaces.com/skills/greensock/gsap-skills/gsap-scrolltrigger",
  ],
  kind: SkillKind.Knowledge,
  audiences: [SkillAudience.Developer, SkillAudience.Design],
  tasks: [SkillTask.Website],
};

