import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Ponytail",
  id: "DietrichGebert/ponytail",
  shortDescription: "Makes your AI agent write only the code a task needs: before adding anything it climbs a decision ladder — does this need to exist, does the stdlib or platform already do it — and the bundled review, audit, and debt commands hunt down over-engineering you've already shipped. About 54% less code on a real agentic benchmark, with validation, security, and accessibility never on the chopping block.",
  readme: "https://github.com/DietrichGebert/ponytail/blob/main/README.md",
  repositoryURL: "https://github.com/DietrichGebert/ponytail",
  license: "MIT",
  githubStars: 54169,
  updatedAt: "2026-06-24",
  externalLinks: [],
  author: { url: "https://github.com/DietrichGebert", name: "DietrichGebert", avatarURL: "https://github.com/DietrichGebert.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/DietrichGebert/ponytail",
  skills: [
    "DietrichGebert/ponytail/ponytail",
    "DietrichGebert/ponytail/ponytail-review",
    "DietrichGebert/ponytail/ponytail-audit",
    "DietrichGebert/ponytail/ponytail-debt",
    "DietrichGebert/ponytail/ponytail-gain",
    "DietrichGebert/ponytail/ponytail-help",
  ],
};

export const skill: DirectorySkill = {
  name: "Audit Your Repo for Bloat",
  id: "DietrichGebert/ponytail/ponytail-audit",
  collection: "DietrichGebert/ponytail",
  description: {
    short: "Scans your entire codebase and hands back a ranked list of what to delete, simplify, or replace with stdlib and native equivalents — biggest cut first.",
    input: "Run /ponytail-audit on a repo. No arguments — it reads the whole tree, not just the current diff.",
    process: "It hunts the usual over-engineering traps: dependencies the stdlib or platform already ships, single-implementation interfaces, factories with one product, wrappers that only delegate, files exporting one thing, and dead flags — tagging each finding with why it should go.",
    output: "A ranked, one-line-per-finding report tagged delete / stdlib / native / yagni / shrink, each with its replacement and file path, closing with the net lines and dependencies you could remove. It reports only — it never edits your code, and leaves correctness, security, and performance to a normal review.",
  },
  example: "/ponytail-audit",
  referenceFile: "https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail-audit/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - ponytail-audit from https://github.com/DietrichGebert/ponytail",
  tools: [],
  previewVideo: "/skills/ponytail-audit-demo.mp4",
  previewImage: "/skills/ponytail-audit-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Workflow,
  audiences: [SkillAudience.Developer],
  tasks: [SkillTask.Audit],
};
