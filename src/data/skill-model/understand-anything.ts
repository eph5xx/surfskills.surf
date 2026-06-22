import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Understand Anything",
  id: "Egonex-AI/Understand-Anything",
  shortDescription:
    "Teaches you any codebase - every file, function, and dependency mapped into an interactive graph you can explore.",
  readme: "https://github.com/Egonex-AI/Understand-Anything/blob/main/README.md",
  repositoryURL: "https://github.com/Egonex-AI/Understand-Anything",
  websiteURL: "https://understand-anything.com",
  license: "MIT",
  githubStars: 65949,
  updatedAt: "2026-06-20",
  externalLinks: [
    "https://www.skills.sh/Egonex-AI/Understand-Anything",
    "https://claudemarketplaces.com/skills/Egonex-AI/Understand-Anything",
  ],
  author: {
    url: "https://github.com/Egonex-AI",
    name: "Egonex",
    avatarURL: "https://github.com/Egonex-AI.png",
  },
  installCommand:
    "Install this skill collection or give me an instruction how to install it: https://github.com/Egonex-AI/Understand-Anything",
  skills: ["Egonex-AI/Understand-Anything/understand"],
};

export const skill: DirectorySkill = {
  name: "Map Any Codebase",
  id: "Egonex-AI/Understand-Anything/understand",
  collection: "Egonex-AI/Understand-Anything",
  description: {
    short:
      "Other tools show you a hairball. This one teaches you the codebase - every file, function, and dependency, mapped into a graph you can explore.",
    input:
      "Run /understand in any project — no arguments, no setup. Pass a subpath to scope a monorepo.",
    process:
      "It parses the real structure and analyzes files in parallel, mapping functions, imports, and layers. Re-runs only touch changed files.",
    output:
      "An interactive graph and guided tour you can explore — pan, zoom, search by meaning, and click any node for a plain-English summary.",
  },
  example: "/understand",
  referenceFile:
    "https://github.com/Egonex-AI/Understand-Anything/blob/main/understand-anything-plugin/skills/understand/SKILL.md",
  installCommand:
    "Install the skill or give me an instruction how to install it - understand from https://github.com/Egonex-AI/Understand-Anything",
  tools: [],
  previewVideo: "/skills/understand-anything-demo.mp4",
  externalLinks: [
    "https://www.skills.sh/Egonex-AI/Understand-Anything/understand",
    "https://claudemarketplaces.com/skills/Egonex-AI/Understand-Anything/understand",
  ],
  kind: SkillKind.Workflow,
  audiences: [SkillAudience.Developer],
  tasks: [SkillTask.Research],
};

