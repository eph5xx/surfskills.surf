import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "AI Website Cloner Template",
  id: "JCodesMore/ai-website-cloner-template",
  shortDescription: "A pre-scaffolded Next.js 16 + Tailwind v4 + shadcn/ui template that ships the /clone-website skill: point an AI coding agent at any URL and rebuild the site section-by-section as clean, real code.",
  readme: "https://github.com/JCodesMore/ai-website-cloner-template/blob/master/README.md",
  repositoryURL: "https://github.com/JCodesMore/ai-website-cloner-template",
  license: "MIT",
  githubStars: 21530,
  updatedAt: "2026-06-01",
  externalLinks: [],
  author: { url: "https://github.com/JCodesMore", name: "JCodesMore", avatarURL: "https://github.com/JCodesMore.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/JCodesMore/ai-website-cloner-template",
  skills: [
    "JCodesMore/ai-website-cloner-template/clone-website",
  ],
};

export const skill: DirectorySkill = {
  name: "Clone Any Website",
  id: "JCodesMore/ai-website-cloner-template/clone-website",
  collection: "JCodesMore/ai-website-cloner-template",
  description: {
    short: "Point it at any live URL and get back a clean, pixel-perfect Next.js codebase — real assets, real content, real interactions, not a screenshot.",
    input: "You run /clone-website with one or more target URLs. It needs a browser-automation MCP (Chrome, Playwright, Browserbase, or Puppeteer) and the repo's pre-scaffolded Next.js + shadcn/ui + Tailwind v4 base.",
    process: "It works like a foreman walking the page: screenshots plus a mandatory interaction sweep capture every scroll, hover, and click behavior; then it extracts exact getComputedStyle values section-by-section into auditable spec files and dispatches parallel builder agents in git worktrees, merging and re-verifying the build as it goes.",
    output: "A buildable React/TypeScript clone: section components in src/components, downloaded images, videos, fonts, and favicons in public/, per-component spec files plus BEHAVIORS.md and PAGE_TOPOLOGY.md in docs/research, and a final visual QA pass against the original at desktop, tablet, and mobile.",
  },
  example: "/clone-website https://linear.app",
  referenceFile: "https://github.com/JCodesMore/ai-website-cloner-template/blob/master/.claude/skills/clone-website/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - clone-website from https://github.com/JCodesMore/ai-website-cloner-template",
  tools: [],
  previewVideo: "/skills/clone-website-demo.mp4",
  previewImage: "/skills/clone-website-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Action,
  audiences: [SkillAudience.Developer],
  tasks: [SkillTask.Website],
};
