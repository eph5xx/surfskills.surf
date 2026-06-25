import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "One Skill to Rule Them All",
  id: "rebelytics/one-skill-to-rule-them-all",
  shortDescription: "A meta-skill that watches your real work sessions and turns the corrections and patterns it catches into new and improved skills — so your whole skill library keeps getting better as you use it.",
  readme: "https://github.com/rebelytics/one-skill-to-rule-them-all/blob/main/README.md",
  repositoryURL: "https://github.com/rebelytics/one-skill-to-rule-them-all",
  websiteURL: "https://www.rebelytics.com/task-observer/",
  license: "CC-BY-4.0",
  githubStars: 729,
  updatedAt: "2026-05-24",
  externalLinks: [],
  author: { url: "https://github.com/rebelytics", name: "Eoghan Henn", avatarURL: "https://github.com/rebelytics.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/rebelytics/one-skill-to-rule-them-all",
  skills: [
    "rebelytics/one-skill-to-rule-them-all/task-observer",
  ],
};

export const skill: DirectorySkill = {
  name: "Task Observer",
  id: "rebelytics/one-skill-to-rule-them-all/task-observer",
  collection: "rebelytics/one-skill-to-rule-them-all",
  description: {
    short: "Watches how you actually work and turns the corrections and patterns it catches into new and improved skills.",
    input: "Invoke it at the start of any multi-step, tool-using work session — no arguments; it runs quietly alongside whatever you're doing.",
    process: "It logs friction points, your corrections, and reusable methods to a persistent observation log, then sorts them into new-skill candidates versus improvements to skills you already have.",
    output: "A reviewed set of recommendations — new skills, concrete edits to existing ones, and cross-cutting principles — that you approve before anything touches your skill library.",
  },
  example: "Refactor the checkout flow and add tests for it",
  referenceFile: "https://github.com/rebelytics/one-skill-to-rule-them-all/blob/main/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - task-observer from https://github.com/rebelytics/one-skill-to-rule-them-all",
  tools: [],
  previewVideo: "/skills/task-observer-demo.mp4",
  previewImage: "/skills/task-observer-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Workflow,
  audiences: [SkillAudience.Developer, SkillAudience.Founder],
  tasks: [SkillTask.Review],
};
