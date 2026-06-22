import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Make Interfaces Feel Better",
  id: "jakubkrehel/make-interfaces-feel-better",
  shortDescription:
    "Sixteen design-engineering rules your agent applies to any UI component - the small details that compound into interfaces that feel right.",
  readme:
    "https://github.com/jakubkrehel/make-interfaces-feel-better/blob/main/README.md",
  repositoryURL: "https://github.com/jakubkrehel/make-interfaces-feel-better",
  externalLinks: [
    "https://www.skills.sh/jakubkrehel/make-interfaces-feel-better",
    "https://claudemarketplaces.com/skills/jakubkrehel/make-interfaces-feel-better",
  ],
  author: {
    url: "https://github.com/jakubkrehel",
    name: "Jakub Krehel",
    avatarURL: "https://github.com/jakubkrehel.png",
  },
  installCommand:
    "Install this skill collection or give me an instruction how to install it: https://github.com/jakubkrehel/make-interfaces-feel-better",
  skills: ["jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better"],
};

export const skill: DirectorySkill = {
  name: "Interfaces Feel Better",
  id: "jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better",
  collection: "jakubkrehel/make-interfaces-feel-better",
  description: {
    short:
      "Great interfaces aren't one big thing - they're 16 small details that compound.",
    input:
      "Run /make-interfaces-feel-better on any UI component - a card, button, modal. Works on React, HTML, or Tailwind code.",
    process:
      "Checks your code against 16 design-engineering rules: concentric border radius, shadow depth, optical alignment, tabular numbers, text wrapping, icon animations, scale on press, transition specificity, minimum hit area, and more.",
    output:
      "A grouped markdown table - one section per triggered principle, exact code fixes in each row. The demo caught 9 issues in a ProductCard: concentric radius, shadow depth, optical alignment, font smoothing, tabular numbers, text-wrap on headings, image outline, scale on press, and transition-all replaced - plus a revised component file.",
  },
  example:
    '/make-interfaces-feel-better "Audit this ProductCard for design-engineering issues"',
  referenceFile:
    "https://github.com/jakubkrehel/make-interfaces-feel-better/blob/main/skills/make-interfaces-feel-better/SKILL.md",
  installCommand:
    "Install the skill or give me an instruction how to install it - make-interfaces-feel-better from https://github.com/jakubkrehel/make-interfaces-feel-better",
  tools: [],
  previewVideo: "/skills/make-interfaces-feel-better-demo.mp4",
  externalLinks: [
    "https://www.skills.sh/jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better",
    "https://claudemarketplaces.com/skills/jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better",
  ],
  kind: SkillKind.Workflow,
  audiences: [SkillAudience.Design, SkillAudience.Developer],
  tasks: [SkillTask.Audit],
};

