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
  // --- 5 new skill templates. Placeholder copy — edit title/blurb/category/tools
  //     per skill. Two are `available` (active on the landing + clickable in the
  //     catalog); three are coming-soon teases. ---
  {
    slug: "where-to-relocate",
    title: "New Skill One",
    blurb:
      "Plain input in, a finished deliverable out. Edit this template to describe your skill.",
    category: "Relocation",
    tools: ["Claude", "ChatGPT"],
    free: true,
    thumbLabel: "Input → outcome",
    verified: false,
    available: true,
  },
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
    slug: "design-your-landing",
    title: "New Skill Two",
    blurb:
      "Plain input in, a finished deliverable out. Edit this template to describe your skill.",
    category: "Design",
    tools: ["Claude", "Cursor", "Lovable"],
    free: false,
    thumbLabel: "Input → outcome",
    verified: false,
    available: true,
  },
  {
    slug: "deep-market-research",
    title: "New Skill Three",
    blurb:
      "Plain input in, a finished deliverable out. Edit this template to describe your skill.",
    category: "Research",
    tools: ["Claude", "ChatGPT", "Gemini"],
    free: false,
    thumbLabel: "Input → outcome",
    verified: false,
    available: false,
  },
  {
    slug: "cold-email-engine",
    title: "New Skill Four",
    blurb:
      "Plain input in, a finished deliverable out. Edit this template to describe your skill.",
    category: "Marketing",
    tools: ["Claude", "ChatGPT"],
    free: true,
    thumbLabel: "Input → outcome",
    verified: false,
    available: false,
  },
  {
    slug: "pitch-deck-narrative",
    title: "New Skill Five",
    blurb:
      "Plain input in, a finished deliverable out. Edit this template to describe your skill.",
    category: "Startups",
    tools: ["Claude", "ChatGPT", "Gemini"],
    free: false,
    thumbLabel: "Input → outcome",
    verified: false,
    available: false,
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
  },
];

/** Honest site stats. Counts derive from real data so they can't drift. */
export const stats = {
  skillsLive: skills.filter((s) => s.available).length,
} as const;
