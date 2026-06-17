import type { SkillContent } from "../types";

export const detail: SkillContent = {
  "slug": "gsap-skills",
  "tagline": "The official GreenSock skills that teach your coding agent to animate anything — the way GSAP is actually meant to be written.",
  "glyph": "bars",
  "command": "/gsap-scrolltrigger \"Build a HeroSection with a scroll-triggered stagger entrance\"",
  "flow": {
    "write": {
      "label": "You write",
      "head": "Describe the animation you want",
      "body": "Ask in plain language — \"stagger a hero headline in word-by-word, then count up three stats as they scroll into view.\" Trigger a focused skill directly with /gsap-core, /gsap-scrolltrigger, /gsap-react, and five more, or just describe it and the right skill activates."
    },
    "between": {
      "label": "It works",
      "head": "Eight skills guide the agent precisely",
      "body": "Core API, timelines, ScrollTrigger, plugins, utils, React, performance, and Vue/Svelte — each a focused reference. The agent registers plugins correctly, animates transforms instead of layout, batches ScrollTriggers, and adds prefers-reduced-motion handling, instead of the broken GSAP models guess at."
    },
    "get": {
      "label": "You get",
      "head": "Production-ready animation, first try",
      "body": "The demo produced a launch hero in two prompts: a headline staggering in word-by-word on masked spans via a gsap.timeline(), then three stat counters (10M+, 98%, 3x) that count up from zero with ScrollTrigger.batch() as they scroll into view — all behind a single gsap.matchMedia() that respects reduced-motion. Opens and runs in any browser."
    }
  },
  "worksWith": [
    "Claude Code",
    "Cursor",
    "Copilot",
    "Windsurf",
    "Codex",
    "Gemini CLI"
  ],
  "worksWithNote": "and 40+ coding agents via the skills CLI",
  "setup": [
    "No MCP servers, no API keys",
    "Install in Claude Code: /plugin marketplace add greensock/gsap-skills",
    "Or any agent: npx skills add https://github.com/greensock/gsap-skills"
  ],
  "author": {
    "name": "GreenSock",
    "githubUrl": "https://github.com/greensock",
    "repoLabel": "greensock/gsap-skills"
  },
  "github": "https://github.com/greensock/gsap-skills",
  "relatedSlugs": [
    "hyperframes"
  ]
};
