import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "illo",
  id: "tmchow/illo-skill",
  shortDescription: "Generate original print-style editorial illustrations for articles and blogs, where a recurring mascot acts out each idea. Pick one of ten bundled looks (riso, blueprint, woodcut, clay, and more) or design your own character, and render free through your Codex CLI or via OpenRouter.",
  readme: "https://github.com/tmchow/illo-skill/blob/main/README.md",
  repositoryURL: "https://github.com/tmchow/illo-skill",
  websiteURL: "https://illo-skill.com",
  license: "MIT",
  githubStars: 230,
  updatedAt: "2026-06-23",
  externalLinks: [],
  author: { url: "https://github.com/tmchow", name: "Trevin Chow", avatarURL: "https://github.com/tmchow.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/tmchow/illo-skill",
  skills: [
    "tmchow/illo-skill/illo",
  ],
};

export const skill: DirectorySkill = {
  name: "Illustrate Your Ideas",
  id: "tmchow/illo-skill/illo",
  collection: "tmchow/illo-skill",
  description: {
    short: "Turn a concept or an article into an original print-style editorial illustration — a recurring mascot acting out the idea in one clean scene, not generic stock art.",
    input: "You invoke illo with an idea, a one-liner, or an article URL, optionally naming a character pack, look, or palette. It needs python3 plus either a logged-in Codex CLI (free on your subscription) or an OpenRouter API key.",
    process: "It locks the thesis in a sentence, routes the idea to the right shape — a single editorial scene, a 2–4 panel mini-comic, a hand-built explainer diagram, or a transparent cutout — then renders the recurring mascot on-model in one of sixteen bundled looks (riso, blueprint, clay, woodcut, and more), re-rolling anything off-model or off-palette against a quality bar.",
    output: "Publication-ready illustrations held to one idea per image: article sets you can interleave through a post, social-ready 16:9 or 1:1 art, or a transparent PNG cutout — with palettes matched to your blog or brand colors.",
  },
  example: "/illo \"we replatform with zero downtime\"",
  referenceFile: "https://github.com/tmchow/illo-skill/blob/main/skills/illo/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - illo from https://github.com/tmchow/illo-skill",
  tools: [],
  previewVideo: "/skills/illo-demo.mp4",
  previewImage: "/skills/illo-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Action,
  audiences: [SkillAudience.Design],
  tasks: [SkillTask.Image],
};
