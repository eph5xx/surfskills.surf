import type { SkillContent } from "../types";

export const detail: SkillContent = {
  "slug": "make-interfaces-feel-better",
  "tagline": "Great interfaces aren't one big thing — they're 16 small details that compound.",
  "glyph": "bars",
  "command": "/make-interfaces-feel-better",
  "flow": {
    "write": {
      "label": "You write",
      "head": "Paste your component",
      "body": "Drop in any UI component — a card, button, modal — and run /make-interfaces-feel-better. Works on React, HTML, or Tailwind code."
    },
    "between": {
      "label": "It works",
      "head": "16 principles, one pass",
      "body": "Checks your code against 16 design-engineering rules: concentric border radius, shadow depth, optical alignment, tabular numbers, text wrapping, icon animations, scale on press, transition specificity, minimum hit area, and more."
    },
    "get": {
      "label": "You get",
      "head": "Before/After table, ready to apply",
      "body": "A grouped markdown table — one section per triggered principle, exact code fixes in each row. The demo caught 9 issues in a ProductCard: concentric radius, shadow depth, optical alignment, font smoothing, tabular numbers, text-wrap on headings, image outline, scale on press, and transition-all replaced — plus a revised component file."
    }
  },
  "worksWith": [
    "Claude Code",
    "Cursor",
    "Codex"
  ],
  "worksWithNote": "or any AI coding assistant that supports skills",
  "setup": [
    "npx skills add jakubkrehel/make-interfaces-feel-better",
    "No MCP servers",
    "No API keys"
  ],
  "author": {
    "name": "Jakub Krehel",
    "githubUrl": "https://github.com/jakubkrehel",
    "repoLabel": "jakubkrehel/make-interfaces-feel-better"
  },
  "github": "https://github.com/jakubkrehel/make-interfaces-feel-better",
  "relatedSlugs": [
    "taste-skill",
    "understand-anything"
  ]
};
