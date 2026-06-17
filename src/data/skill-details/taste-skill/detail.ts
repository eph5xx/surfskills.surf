import type { SkillContent } from "../types";

export const detail: SkillContent = {
  slug: "taste-skill",
  tagline: "Design system rules that guide your AI agent away from generic Tailwind defaults and toward intentional, professional interfaces.",
  glyph: "bars",
  command: "npx skills add Leonxlnx/taste-skill",
  flow: {
    write: {
      label: "You write",
      head: "A project brief",
      body: "Describe the UI you want — audience, mood, industry, and any design references. The skill reads it and infers the right design direction before it writes a line.",
    },
    between: {
      label: "It works",
      head: "Infers direction, maps real design systems",
      body: "Taste Skill v2 analyzes your brief to pick an appropriate framework (Material, Fluent, Carbon, Polaris, etc.), enforces dual dark/light mode parity, and runs a hard pre-flight check before shipping any output — no templated Tailwind defaults.",
    },
    get: {
      label: "You get",
      head: "A finished interface that doesn't look AI-generated",
      body: "A complete, non-generic frontend component or screen — grounded in a real design system, consistent across themes, and ready to ship. Same skill works across Claude Code, Cursor, Codex, Gemini CLI, v0, and Lovable.",
    },
  },
  worksWith: ["Claude Code", "Cursor", "Codex", "Gemini CLI", "Lovable", "v0"],
  worksWithNote: "or any agent that supports SKILL.md files",
  setup: [
    "No MCP servers required",
    "No API keys required",
    "Works with your existing AI coding tool",
  ],
  author: {
    name: "Leon Lin & blueemi",
    githubUrl: "https://github.com/Leonxlnx",
    repoLabel: "Leonxlnx/taste-skill",
  },
  github: "https://github.com/Leonxlnx/taste-skill",
  relatedSlugs: ["hyperframes", "validate-startup-idea"],
};
