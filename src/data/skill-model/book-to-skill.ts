import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "book-to-skill",
  id: "virgiliojr94/book-to-skill",
  shortDescription: "Turns any technical book, document folder, or stack of sources into a structured agent skill your agent loads on demand — a compact SKILL.md core plus per-chapter files, glossary, patterns, and cheatsheet. Answers one question at 24×–51× fewer tokens than dumping the book into context, and works in Claude Code, GitHub Copilot CLI, and Amp.",
  readme: "https://github.com/virgiliojr94/book-to-skill/blob/master/README.md",
  repositoryURL: "https://github.com/virgiliojr94/book-to-skill",
  license: "MIT",
  githubStars: 6836,
  updatedAt: "2026-06-26",
  externalLinks: [],
  author: { url: "https://github.com/virgiliojr94", name: "Virgilio Junior", avatarURL: "https://github.com/virgiliojr94.png" },
  installCommand: "Install this skill collection or give me an instruction how to install it: https://github.com/virgiliojr94/book-to-skill",
  skills: [
    "virgiliojr94/book-to-skill/book-to-skill",
  ],
};

export const skill: DirectorySkill = {
  name: "Turn a Book Into a Skill",
  id: "virgiliojr94/book-to-skill/book-to-skill",
  collection: "virgiliojr94/book-to-skill",
  description: {
    short: "Turn any technical book, document folder, or stack of sources into a structured agent skill your agent loads on demand — answering questions at 24×–51× fewer tokens than dumping the whole book into context.",
    input: "Point it at a PDF, EPUB, DOCX, Markdown, folder, or glob — `/book-to-skill ~/books/your-book.pdf` — with an optional skill-name slug. Works in Claude Code, GitHub Copilot CLI, and Amp.",
    process: "It extracts the text (Docling for technical books with tables and code, pdftotext for prose), analyzes the chapter structure, then distills the author's named frameworks, principles, techniques, and anti-patterns — structure, not a summary.",
    output: "A ready-to-use skill in your agent's skills directory: a compact ~4K-token SKILL.md core plus one on-demand file per chapter, a glossary, a patterns file, and a cheatsheet. Ask `/your-book replication` and it loads just the right chapter and answers from the real text — no hallucination, ~5K tokens per question instead of the whole book.",
  },
  example: "/book-to-skill ~/books/designing-data-intensive-apps.pdf",
  referenceFile: "https://github.com/virgiliojr94/book-to-skill/blob/master/SKILL.md",
  installCommand: "Install the skill or give me an instruction how to install it - book-to-skill from https://github.com/virgiliojr94/book-to-skill",
  tools: [],
  previewVideo: "/skills/book-to-skill-demo.mp4",
  previewImage: "/skills/book-to-skill-demo.jpg",
  externalLinks: [],
  kind: SkillKind.Action,
  audiences: [SkillAudience.Developer],
  tasks: [SkillTask.Research],
};
