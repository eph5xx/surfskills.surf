import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Stop Slop",
  id: "hardikpandya/stop-slop",
  shortDescription: "Strips the predictable phrases, structures, and rhythms that mark writing as AI-generated, so your drafts read like a person wrote them. It rewrites prose against concrete banned-pattern rules and scores the result across five dimensions of human voice.",
  readme: "https://github.com/hardikpandya/stop-slop/blob/main/README.md",
  repositoryURL: "https://github.com/hardikpandya/stop-slop",
  license: "MIT",
  githubStars: 12619,
  updatedAt: "2026-03-17",
  externalLinks: [],
  author: { url: "https://github.com/hardikpandya", name: "Hardik Pandya", avatarURL: "https://github.com/hardikpandya.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/hardikpandya/stop-slop",
  skills: [
    "hardikpandya/stop-slop/stop-slop",
  ],
};

export const skill: DirectorySkill = {
  name: "Cut the AI Tells",
  id: "hardikpandya/stop-slop/stop-slop",
  collection: "hardikpandya/stop-slop",
  description: {
    short: "Rewrites your draft so it stops reading like AI and sounds like a person wrote it.",
    input: "Hand it any draft, or keep it on while you write; it engages whenever you are drafting, editing, or reviewing prose.",
    process: "Checks the text against concrete rules for banned phrases, formulaic structures, and flat rhythm, then rewrites the offenders: it cuts throat-clearing and adverbs, breaks binary contrasts, and swaps passive voice and false agency for a named actor.",
    output: "Revised prose with the AI tells gone, plus a 1-to-10 score on five dimensions (directness, rhythm, trust, authenticity, density) and the specific edits to make when the total lands below 35 of 50.",
  },
  example: "Make this sound human, not AI: In today's fast-paced landscape, we lean into discomfort and navigate uncertainty with clarity.",
  referenceFile: "https://github.com/hardikpandya/stop-slop/blob/main/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - stop-slop from https://github.com/hardikpandya/stop-slop",
  tools: [],
  previewVideo: "/skills/stop-slop-demo.mp4",
  previewImage: "/skills/stop-slop-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Mode,
  audiences: [SkillAudience.Founder, SkillAudience.SEO],
  tasks: [SkillTask.Audit],
};
