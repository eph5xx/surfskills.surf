import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "TweakIdea",
  id: "eph5xx/tweakidea",
  shortDescription:
    "An honest startup-idea validation suite: 14 independent evaluators score your pitch, each running its own live web research.",
  readme: "https://github.com/eph5xx/tweakidea/blob/main/README.md",
  repositoryURL: "https://github.com/eph5xx/tweakidea",
  license: "MIT",
  githubStars: 19,
  updatedAt: "2026-04-30",
  externalLinks: [],
  author: {
    url: "https://github.com/eph5xx",
    name: "eph5xx",
    avatarURL: "https://github.com/eph5xx.png",
  },
  installCommand:
    "Install this skill collection or give me an instruction how to install it: https://github.com/eph5xx/tweakidea",
  skills: ["eph5xx/tweakidea/tweak:evaluate"],
};

export const skill: DirectorySkill = {
  name: "Validate Your Idea",
  id: "eph5xx/tweakidea/tweak:evaluate",
  collection: "eph5xx/tweakidea",
  description: {
    short:
      "14 independent evaluators score your pitch, each doing its own web research. An honest scorecard tells you GO, PIVOT, or STOP.",
    input:
      "Describe the problem and solution, point it at a file, or run it bare to be interviewed.",
    process:
      "It surfaces your hidden assumptions to confirm, then runs 14 evaluators — each backed by its own live web research.",
    output:
      "A shareable scorecard: 14 dimension scores, the evidence behind each, and one clear verdict — GO, PIVOT, or STOP.",
  },
  example: '/tweak:evaluate "An app that lets restaurants sell unsold food"',
  installCommand:
    "Install the skill or give me an instruction how to install it - tweak:evaluate from https://github.com/eph5xx/tweakidea",
  tools: [],
  previewVideo: "/skills/validate-startup-idea-demo.mp4",
  externalLinks: [],
  kind: SkillKind.Workflow,
  audiences: [SkillAudience.Founder],
  tasks: [SkillTask.Audit],
};

