import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Supermemory",
  id: "supermemoryai/supermemory",
  shortDescription: "Gives your AI persistent memory behind one API — it learns facts from conversations, keeps live user profiles, and runs RAG over your knowledge base. Ranked #1 on the LongMemEval, LoCoMo, and ConvoMem memory benchmarks.",
  readme: "https://github.com/supermemoryai/supermemory/blob/main/README.md",
  repositoryURL: "https://github.com/supermemoryai/supermemory",
  websiteURL: "https://supermemory.ai",
  license: "MIT",
  githubStars: 27700,
  updatedAt: "2026-06-27",
  externalLinks: [],
  author: { url: "https://github.com/supermemoryai", name: "supermemory", avatarURL: "https://github.com/supermemoryai.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/supermemoryai/supermemory",
  skills: [
    "supermemoryai/supermemory/supermemory",
  ],
};

export const skill: DirectorySkill = {
  name: "Give Your Agent Memory",
  id: "supermemoryai/supermemory/supermemory",
  collection: "supermemoryai/supermemory",
  description: {
    short: "Your AI forgets everything between conversations — this gives it persistent memory, live user profiles, and RAG over your knowledge base, all behind one API.",
    input: "Tell Claude you're building an app that needs to remember users, personalize responses, or search a knowledge base — in TypeScript or Python.",
    process: "Claude consults Supermemory's SDK guide, REST API reference, and architecture notes, then picks the right primitive — Memory API, User Profiles, or RAG — and writes the integration for your stack.",
    output: "Working integration code keyed to your SUPERMEMORY_API_KEY: store memories with add(), pull personalized context with profile() in ~50ms, and run hybrid RAG — plus connectors (Drive, Gmail, Notion) and multi-modal extractors when you need them.",
  },
  example: "/supermemory add persistent memory to my chatbot so it remembers each user across sessions",
  referenceFile: "https://github.com/supermemoryai/supermemory/blob/main/skills/supermemory/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - supermemory from https://github.com/supermemoryai/supermemory",
  tools: [],
  previewVideo: "/skills/supermemory-demo.mp4",
  previewImage: "/skills/supermemory-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Knowledge,
  audiences: [SkillAudience.Developer],
  tasks: [SkillTask.Integrate],
};
