// Single source of truth for the skill catalog. Reused by the Home page now
// and by future per-skill detail pages. surfskills is a curated library of
// installable AI skills — each skill drops into your own AI tool, no code.

export interface Skill {
  slug: string;
  title: string;
  blurb: string;
  /** Niche category the skill belongs to (drives the category pills/filter). */
  category: string;
  /** AI tools the skill runs in. */
  tools: string[];
  /** Included in the free tier (no card required). */
  free: boolean;
  /** Flagship card on the Trending bento — exactly one skill. */
  featured?: boolean;
  /** Short "input → outcome" caption shown under the thumbnail. */
  thumbLabel: string;
  /** Sasha's one-line "why I picked this" — featured card only. */
  curatorNote?: string;
  /** When Sasha last ran this skill end-to-end on real inputs. */
  testedDate?: string;
  verified: boolean;
  /** Demo clip (mp4 under /public) shown in the spotlight card. */
  video?: string;
  /** Live and installable now — the Discover catalog shows only these.
   *  Hardcoded today; move to a DB column later. Set true only when the card
   *  links somewhere real (a detail page, or /pricing to subscribe). */
  available: boolean;
}

export const author = {
  name: "Sasha S.",
  initial: "S",
  avatarBg: "#3D5A80",
};

/** The niche categories surfskills covers — builder/founder/decision skills,
 *  deliberately distinct from the visual-creative marketplaces. */
export const categories = [
  { name: "Relocation", emoji: "🌍" },
  { name: "Startups", emoji: "🚀" },
  { name: "Research", emoji: "🔬" },
  { name: "Marketing", emoji: "📣" },
  { name: "Design", emoji: "🎨" },
  { name: "Motion", emoji: "🎬" },
];

/** AI tools every skill is built to run in. */
export const supportedTools = ["Claude", "ChatGPT", "Cursor", "Lovable", "Gemini", "Claude Code"];

export const skills: Skill[] = [
  {
    slug: "validate-startup-idea",
    title: "Validate Startup Idea",
    blurb:
      "Your pitch in, an honest read out: demand, risks, and real market pull.",
    category: "Startups",
    // Honest compatibility: the underlying /tweak:evaluate suite needs Claude
    // Code's subagents + local scripts — it does not run elsewhere.
    tools: ["Claude Code"],
    free: true,
    thumbLabel: "Pitch → honest verdict",
    testedDate: "Jun 2026",
    verified: true,
    available: true,
    video: "/skills/validate-startup-idea-demo.mp4",
  },
  {
    slug: "hyperframes",
    title: "HyperFrames Video Agent",
    blurb: "Describe a video, get an HTML-native composition rendered to MP4.",
    category: "Motion",
    tools: ["Cursor", "Claude Code", "Gemini"],
    free: true,
    thumbLabel: "Prompt -> rendered video",
    verified: true,
    available: true,
    video: "/skills/hyperframes-demo.mp4",
  },
  {
    slug: "taste-skill",
    title: "Taste Skill",
    blurb: "Open-source design rules that stop AI coding agents from shipping templated, generic frontends.",
    category: "Design",
    tools: ["Claude Code", "Cursor", "Gemini"],
    free: true,
    thumbLabel: "Brief → polished UI",
    testedDate: "Jun 2026",
    verified: true,
    available: true,
  },
  {
    "slug": "make-interfaces-feel-better",
    "title": "Interfaces Feel Better",
    "blurb": "Paste a UI component, get a Before/After table of design-engineering fixes.",
    "category": "Design",
    "tools": [
      "Claude Code",
      "Cursor"
    ],
    "free": true,
    "image": "",
    "imageAlt": "Placeholder: replace with a before/after of this skill's output",
    "thumbLabel": "Input → outcome",
    "verified": true,
    "available": true,
    "video": "/skills/make-interfaces-feel-better-demo.mp4"
  },
  {
    "slug": "understand-anything",
    "title": "Understand Any Codebase",
    "blurb": "Unfamiliar repo → an interactive knowledge graph that teaches you how every piece fits.",
    "category": "Research",
    "tools": [
      "Claude Code",
      "Cursor",
      "Gemini"
    ],
    "free": true,
    "thumbLabel": "Repo → knowledge graph",
    "testedDate": "Jun 2026",
    "verified": true,
    "available": true,
    "video": "/skills/understand-anything-demo.mp4"
  },
  {
    "slug": "gsap-skills",
    "title": "GSAP Animation Skills",
    "blurb": "Ask for an animation in plain words, get correct, production-ready GSAP — timelines, ScrollTrigger, and reduced-motion handling, first try.",
    "category": "Motion",
    "tools": [
      "Claude Code",
      "Cursor",
      "Gemini"
    ],
    "free": true,
    "thumbLabel": "Prompt → production GSAP",
    "testedDate": "Jun 2026",
    "verified": true,
    "available": true,
    "video": "/skills/gsap-skills-demo.mp4"
  },
];

/** Honest site stats. Counts derive from real data so they can't drift. */
export const stats = {
  skillsLive: skills.filter((s) => s.available).length,
} as const;
