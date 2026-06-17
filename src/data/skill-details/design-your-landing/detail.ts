import type { SkillContent } from "../types";

// TEMPLATE detail page — placeholder copy. Edit every field to describe the real
// skill. Registered in skill-details/index.ts; lives at /skills/design-your-landing.
export const detail: SkillContent = {
  slug: "design-your-landing",
  tagline: "One-line summary of what this skill does. Replace me.",
  glyph: "bars",
  command: "/your-command \"your example input here\"",

  flow: {
    write: {
      label: "You write",
      head: "What you hand it",
      body: "Describe the plain input the user provides. Replace this placeholder.",
    },
    between: {
      label: "It works",
      head: "What it does",
      body: "Describe the work the skill performs. Replace this placeholder.",
    },
    get: {
      label: "You get",
      head: "What you take home",
      body: "Describe the finished deliverable. Replace this placeholder.",
    },
  },

  worksWith: ["Claude"],
  worksWithNote: "",
  setup: ["No MCP servers", "No API keys"],

  author: {
    name: "Your Name",
    githubUrl: "https://github.com/your-handle",
    repoLabel: "your-handle/your-repo",
  },
  github: "https://github.com/your-handle/your-repo",

  relatedSlugs: ["validate-startup-idea", "hyperframes"],
};
