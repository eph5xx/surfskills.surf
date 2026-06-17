import type { SkillContent } from "../types";

export const detail: SkillContent = {
  "slug": "understand-anything",
  "tagline": "Other tools show you a hairball. This one teaches you the codebase — every file, function, and dependency, mapped into a graph you can explore.",
  "glyph": "bars",
  "command": "/understand",
  "flow": {
    "write": {
      "label": "You write",
      "head": "Point it at a repo",
      "body": "Open any project in Claude Code and run /understand — no arguments, no setup. It reads the current directory; pass a subpath like /understand src/frontend to scope a monorepo."
    },
    "between": {
      "label": "It works",
      "head": "A multi-agent pipeline maps it",
      "body": "Tree-sitter parses the real structure while five agents analyze files in parallel — extracting functions, classes, imports, architectural layers, and a dependency-ordered tour. Re-runs are incremental: only changed files get re-analyzed."
    },
    "get": {
      "label": "You get",
      "head": "An explorable knowledge graph",
      "body": "Running it on surfskills-web mapped 71 files into an 85-node graph across 8 layers (UI, Pages, API Routes, Services, Data, Database, Types, Config) with a 15-step guided tour from Project Overview through the Auth Flow, Billing, and Webhooks. A dashboard launches automatically — pan, zoom, search by meaning, and click any node for a plain-English summary."
    }
  },
  "worksWith": [
    "Claude Code",
    "Cursor",
    "Codex",
    "Gemini CLI",
    "GitHub Copilot"
  ],
  "worksWithNote": "Native plugin in Claude Code; one-line install for 15+ other platforms.",
  "setup": [
    "No MCP servers",
    "No API keys",
    "Install via /plugin marketplace add Egonex-AI/Understand-Anything",
    "Needs Node.js ≥ 22 and pnpm ≥ 10"
  ],
  "author": {
    "name": "Egonex",
    "githubUrl": "https://github.com/Egonex-AI",
    "repoLabel": "Egonex-AI/Understand-Anything"
  },
  "github": "https://github.com/Egonex-AI/Understand-Anything",
  "relatedSlugs": [
    "validate-startup-idea"
  ]
};
