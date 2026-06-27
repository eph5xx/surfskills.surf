import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Last30Days",
  id: "mvanhorn/last30days-skill",
  shortDescription: "Researches any topic across Reddit, X, YouTube, TikTok, Hacker News, Polymarket, and GitHub in parallel, then synthesizes one grounded brief - ranked by what real people actually engage with (upvotes, likes, views, prediction-market odds), not editorial picks.",
  readme: "https://github.com/mvanhorn/last30days-skill/blob/main/README.md",
  repositoryURL: "https://github.com/mvanhorn/last30days-skill",
  license: "MIT",
  githubStars: 47056,
  updatedAt: "2026-06-27",
  externalLinks: [],
  author: { url: "https://github.com/mvanhorn", name: "Matt Van Horn", avatarURL: "https://github.com/mvanhorn.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/mvanhorn/last30days-skill",
  skills: [
    "mvanhorn/last30days-skill/last30days",
  ],
};

export const skill: DirectorySkill = {
  name: "Research the web",
  id: "mvanhorn/last30days-skill/last30days",
  collection: "mvanhorn/last30days-skill",
  description: {
    short: "See what people actually say about any topic right now - ranked by real engagement across Reddit, X, YouTube, TikTok, Hacker News, Polymarket, and GitHub, not editorial picks.",
    input: "Run /last30days {topic} - a person, company, product, or \"X vs Y\" comparison. Add flags like --emit=html, --competitors, or --hiring-signals to shape the brief.",
    process: "It first resolves who matters - the right handles, subreddits, repos, and hashtags - then searches every source in parallel, scores results by engagement, merges duplicate stories, and has an agent judge synthesize them.",
    output: "One grounded prose brief with cited sources and verbatim community quotes, a \"Best Takes\" section of the sharpest reactions, and an optional self-contained HTML file saved to disk.",
  },
  example: "/last30days OpenAI vs Anthropic vs xAI",
  referenceFile: "https://github.com/mvanhorn/last30days-skill/blob/main/skills/last30days/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - last30days from https://github.com/mvanhorn/last30days-skill",
  tools: [{ name: "Bash", blocking: false }, { name: "Read", blocking: false }, { name: "Write", blocking: false }, { name: "AskUserQuestion", blocking: false }, { name: "WebSearch", blocking: false }],
  previewVideo: "/skills/last30days-demo.mp4",
  previewImage: "/skills/last30days-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Action,
  audiences: [SkillAudience.Founder, SkillAudience.Developer],
  tasks: [SkillTask.Research],
};
