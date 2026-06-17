import type { SkillContent } from "../types";

export const detail: SkillContent = {
  "slug": "taste-skill",
  "tagline": "An anti-slop frontend skill: your agent reads the brief, infers the right design direction, and ships interfaces that don't look templated.",
  "glyph": "bars",
  "command": "/design-taste-frontend Build a premium DTC cookware landing page: calm, editorial, cold-luxury, dual dark/light mode.",
  "flow": {
    "write": {
      "label": "You write",
      "head": "A plain UI brief",
      "body": "Describe the page you want — kind, audience, vibe, any references. Run /design-taste-frontend in your coding agent, or just let it follow the skill on any UI task. The demo brief asked for a premium cookware landing page, 'cold-luxury, NOT the default warm beige + brass + espresso palette.'"
    },
    "between": {
      "label": "It works",
      "head": "It reads the room before it writes code",
      "body": "The skill infers a one-line 'Design Read', sets three dials (variance, motion, density), maps the brief to a real design system when one fits, and runs a 50+ item anti-slop pre-flight check — no AI-purple gradients, no Inter default, no em-dashes, no fake screenshots."
    },
    "get": {
      "label": "You get",
      "head": "A finished interface that dodges the AI tells",
      "body": "The demo produced a full Next.js landing page (8 sections, nav, footer). It rejected the banned beige-and-brass palette for a Cold Luxury slate/zinc system locked to one accent, used Outfit + JetBrains Mono instead of Inter, and shipped class-based dual dark/light mode with motion gated behind prefers-reduced-motion."
    }
  },
  "worksWith": [
    "Claude Code",
    "Cursor",
    "Codex",
    "Gemini CLI",
    "v0",
    "Lovable"
  ],
  "worksWithNote": "or any agent that supports SKILL.md files",
  "setup": [
    "Install with: npx skills add Leonxlnx/taste-skill",
    "No MCP servers",
    "No API keys"
  ],
  "author": {
    "name": "Leon Lin & blueemi",
    "githubUrl": "https://github.com/Leonxlnx",
    "repoLabel": "Leonxlnx/taste-skill"
  },
  "github": "https://github.com/Leonxlnx/taste-skill",
  "relatedSlugs": [
    "make-interfaces-feel-better",
    "hyperframes"
  ]
};
