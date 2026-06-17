import type { SkillContent } from "../types";

export const detail: SkillContent = {
  slug: "hyperframes",
  tagline:
    "Routes video requests to the right HyperFrames workflow, then helps your agent author HTML-native motion and render deterministic MP4 output.",
  glyph: "bars",
  command:
    'Using `/hyperframes`, create a 10-second product intro with a fade-in title, a background video, and subtle background music.',
  flow: {
    write: {
      label: "You write",
      head: "A clear video brief",
      body: "Describe the video you need: promo, website walkthrough, PR explainer, captions, or motion graphic.",
    },
    between: {
      label: "It works",
      head: "It routes and builds",
      body: "The read-first skill picks the right HyperFrames workflow, then drives planning, composition, animation, preview, and render.",
    },
    get: {
      label: "You get",
      head: "A reproducible video project",
      body: "A working HyperFrames composition plus rendered MP4 output that you can iterate locally or in CI.",
    },
  },
  worksWith: ["Cursor", "Claude Code", "Gemini CLI", "Codex"],
  worksWithNote: "and other coding agents with skill support",
  setup: ["Node.js 22+", "FFmpeg", "Install with npx skills add heygen-com/hyperframes"],
  author: {
    name: "HeyGen",
    githubUrl: "https://github.com/heygen-com",
    repoLabel: "heygen-com/hyperframes",
  },
  github: "https://github.com/heygen-com/hyperframes",
  relatedSlugs: ["design-your-landing", "validate-startup-idea"],
};
