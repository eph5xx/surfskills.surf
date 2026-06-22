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
  name: "Understand Any Codebase",
  id: "Egonex-AI/Understand-Anything/understand",
  collection: "Egonex-AI/Understand-Anything",
  description: {
    short:
      "Other tools show you a hairball. This one teaches you the codebase - every file, function, and dependency, mapped into a graph you can explore.",
    input:
      "Run /understand in any project - no arguments, no setup. It reads the current directory; pass a subpath like /understand src/frontend to scope a monorepo.",
    process:
      "Tree-sitter parses the real structure while five agents analyze files in parallel - extracting functions, classes, imports, architectural layers, and a dependency-ordered tour. Re-runs are incremental: only changed files get re-analyzed.",
    output:
      "Running it on surfskills-web mapped 71 files into an 85-node graph across 8 layers (UI, Pages, API Routes, Services, Data, Database, Types, Config) with a 15-step guided tour from Project Overview through the Auth Flow, Billing, and Webhooks. A dashboard launches automatically - pan, zoom, search by meaning, and click any node for a plain-English summary.",
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

