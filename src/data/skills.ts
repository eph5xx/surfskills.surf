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
  /** Real output screenshot: messy input → finished deliverable. */
  image: string;
  imageAlt: string;
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
];

/** AI tools every skill is built to run in. */
export const supportedTools = ["Claude", "ChatGPT", "Cursor", "Lovable", "Gemini"];

export const skills: Skill[] = [
  {
    slug: "where-to-relocate",
    title: "Where to Relocate",
    blurb:
      "Your constraints in, a ranked shortlist of cities that fit — with the why for each.",
    category: "Relocation",
    tools: ["Claude", "ChatGPT"],
    free: true,
    featured: true,
    image: "/skills/where-to-relocate.jpg",
    imageAlt:
      "Before and after: a handwritten note of life constraints turned into a ranked shortlist of cities with fit bars and reasons",
    thumbLabel: "Your life → cities ranked",
    curatorNote:
      "The one I run before every move. Real constraints in, a defensible shortlist out.",
    testedDate: "Jun 2026",
    verified: true,
    available: false,
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
    image: "/skills/validate-startup-idea.jpg",
    imageAlt:
      "Before and after: a one-paragraph pitch turned into an honest scorecard weighing demand, risks and pull, stamped worth a pilot",
    thumbLabel: "Pitch → honest verdict",
    testedDate: "Jun 2026",
    verified: true,
    available: true,
    video: "/skills/validate-startup-idea-demo.mp4",
  },
  {
    slug: "design-your-landing",
    title: "Design Your Landing",
    blurb:
      "One line of vibe in, a full landing wireframe and copy out — ready to build.",
    category: "Design",
    tools: ["Claude", "Cursor", "Lovable"],
    free: false,
    image: "/skills/design-your-landing.jpg",
    imageAlt:
      "Before and after: a one-line vibe prompt turned into an annotated landing page wireframe with hero, proof and CTA blocks plus draft copy",
    thumbLabel: "Vibe → landing page",
    verified: false,
    available: false,
  },
  {
    slug: "deep-market-research",
    title: "Deep Market Research",
    blurb:
      "Name a space, get a sourced map: players, gaps, where it's growing.",
    category: "Research",
    tools: ["Claude", "ChatGPT", "Gemini"],
    free: false,
    image: "/skills/deep-market-research.jpg",
    imageAlt:
      "Before and after: a niche named in chat turned into a sourced market map of player clusters with one highlighted gap",
    thumbLabel: "A space → sourced map",
    testedDate: "May 2026",
    verified: true,
    available: false,
  },
  {
    slug: "cold-email-engine",
    title: "Cold Email Engine",
    blurb:
      "Your offer and list in, a sequence out that doesn't read like a bot wrote it.",
    category: "Marketing",
    tools: ["Claude", "ChatGPT"],
    free: true,
    image: "/skills/cold-email-engine.jpg",
    imageAlt:
      "Before and after: an offer and list scribble turned into a four-step email sequence with real subject lines",
    thumbLabel: "Offer → email sequence",
    verified: false,
    available: false,
  },
  {
    slug: "pitch-deck-narrative",
    title: "Pitch Deck Narrative",
    blurb:
      "Messy founder brain in, a tight slide-by-slide story arc out — ready to design.",
    category: "Startups",
    tools: ["Claude", "ChatGPT", "Gemini"],
    free: false,
    image: "/skills/pitch-deck-narrative.jpg",
    imageAlt:
      "Before and after: messy founder notes turned into a numbered slide-by-slide story arc rising to the payoff",
    thumbLabel: "Brain dump → deck arc",
    testedDate: "May 2026",
    verified: true,
    available: false,
  },
];

/** Honest site stats. Counts derive from real data so they can't drift. */
export const stats = {
  skillsLive: skills.filter((s) => s.available).length,
} as const;
