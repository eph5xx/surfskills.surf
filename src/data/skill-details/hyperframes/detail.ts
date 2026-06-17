import type { SkillContent } from "../types";

export const detail: SkillContent = {
  "slug": "hyperframes",
  "tagline": "Write HTML, render video, built for agents — describe the video you want and HyperFrames teaches your coding agent to compose it in HTML/CSS/JS and render a deterministic MP4.",
  "glyph": "bars",
  "command": "Using `/hyperframes`, create a 10-second product intro with a fade-in title, a background video, and subtle background music.",
  "flow": {
    "write": {
      "label": "You write",
      "head": "A plain-language video brief",
      "body": "Describe the video you want — \"a 10-second product intro with a fade-in title, a background video, and subtle background music\" — by prompting `/hyperframes` in your coding agent."
    },
    "between": {
      "label": "It works",
      "head": "It routes, composes, and renders",
      "body": "The read-first skill routes the intent to the right workflow, scaffolds a project, writes a seekable HTML composition (timed `clip` tracks + a paused GSAP timeline, fully deterministic), then previews and renders frame-by-frame in headless Chrome through FFmpeg."
    },
    "get": {
      "label": "You get",
      "head": "A real 1080p MP4 you can re-render",
      "body": "The demo produced a 1920×1080, 10-second product intro — background video under a readability overlay, breathing accent glows, a staged title reveal, and a fade-to-black resolve — rendered to a ~1.6 MB H.264 MP4 (300 frames). Same input renders the same video, every time."
    }
  },
  "worksWith": [
    "Claude Code",
    "Cursor",
    "Gemini CLI",
    "Codex"
  ],
  "worksWithNote": "and other coding agents that support skills",
  "setup": [
    "Node.js 22+ and FFmpeg",
    "No MCP servers, no API keys for basic use",
    "Install with: npx skills add heygen-com/hyperframes"
  ],
  "author": {
    "name": "HeyGen",
    "githubUrl": "https://github.com/heygen-com",
    "repoLabel": "heygen-com/hyperframes"
  },
  "github": "https://github.com/heygen-com/hyperframes",
  "relatedSlugs": [
    "gsap-skills",
    "validate-startup-idea"
  ]
};
