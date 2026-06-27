import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Humanizer",
  id: "blader/humanizer",
  shortDescription: "Removes the tells of AI-generated writing, from em-dash overuse and rule-of-three to inflated significance and AI vocabulary, and rewrites your text to read like a person wrote it. Built on Wikipedia's 'Signs of AI writing' guide, with optional voice-matching from a sample of your own work.",
  readme: "https://github.com/blader/humanizer/blob/main/README.md",
  repositoryURL: "https://github.com/blader/humanizer",
  license: "MIT",
  githubStars: 26333,
  updatedAt: "2026-06-07",
  externalLinks: [],
  author: { url: "https://github.com/blader", name: "Siqi Chen", avatarURL: "https://github.com/blader.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/blader/humanizer",
  skills: [
    "blader/humanizer/humanizer",
  ],
};

export const skill: DirectorySkill = {
  name: "Humanize AI Writing",
  id: "blader/humanizer/humanizer",
  collection: "blader/humanizer",
  description: {
    short: "Paste in text that reads like a chatbot wrote it and get back a version that sounds human: same meaning, same length, none of the tells.",
    input: "Run /humanizer and paste the text you want to fix. Optionally give it a sample of your own writing so the rewrite matches your voice.",
    process: "It scans for 33 documented AI patterns across content, grammar, style, and tone, drafts a rewrite, audits that draft for any tells it missed, then revises to a final version with zero em or en dashes.",
    output: "A clean rewrite that keeps your meaning and paragraph count, plus a short list of the AI tells it caught and what it changed.",
  },
  example: "/humanizer Our groundbreaking platform serves as a testament to innovation, seamlessly empowering teams to unlock their full potential.",
  referenceFile: "https://github.com/blader/humanizer/blob/main/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - humanizer from https://github.com/blader/humanizer",
  tools: [{ name: "Read", blocking: false }, { name: "Write", blocking: false }, { name: "Edit", blocking: false }, { name: "Grep", blocking: false }, { name: "Glob", blocking: false }, { name: "AskUserQuestion", blocking: false }],
  previewVideo: "/skills/humanizer-demo.mp4",
  previewImage: "/skills/humanizer-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Action,
  audiences: [SkillAudience.Writing],
  tasks: [SkillTask.Review],
};
