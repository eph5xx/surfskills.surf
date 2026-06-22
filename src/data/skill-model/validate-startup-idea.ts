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
  name: "Validate Startup Idea",
  id: "eph5xx/tweakidea/tweak:evaluate",
  collection: "eph5xx/tweakidea",
  description: {
    short:
      "14 independent evaluators score your pitch, each doing its own web research. An honest scorecard tells you GO, PIVOT, or STOP.",
    input:
      "Describe the problem and the solution. Point it at a file, or run it bare to be interviewed.",
    process:
      "It extracts ~12 hidden assumptions for you to confirm, then asks 5 founder-market-fit questions - each backed by its own live web research.",
    output:
      "A shareable HTML or PDF scorecard: 14 independent dimension scores, the evidence behind each, and a single clear verdict.",
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

