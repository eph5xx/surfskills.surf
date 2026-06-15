// Typed content contract for per-skill detail pages. The catalog `Skill`
// (src/data/skills.ts) stays the thin listing — title, category, free, image,
// video; everything the detail page adds on top lives in a SkillContent module
// under skill-details/<slug>/. Render template: components/skill/SkillPage.astro.

/** One beat of the three-step "How it works" story. */
export interface Beat {
  /** Eyebrow, e.g. "You write" / "It works" / "You get". */
  label: string;
  head: string;
  body: string;
}

export interface SkillContent {
  slug: string;
  /** Hero one-liner under the title. */
  tagline: string;
  /** Header icon-tile keyword (see GLYPHS in SkillPage.astro). Defaults to a bar chart. */
  glyph?: string;
  /** The command shown in the terminal block, verbatim. */
  command: string;
  /** The three-beat flow rendered as "How it works". */
  flow: { write: Beat; between: Beat; get: Beat };
  /** Agent names for the "Works with" rail (curated design copy). */
  worksWith: string[];
  /** e.g. "or any AI coding assistant". */
  worksWithNote: string;
  /** Setup checklist, e.g. ["No MCP servers", "No API keys"]. */
  setup: string[];
  author: { name: string; githubUrl: string; repoLabel: string };
  /** "View on GitHub" target (repo root). */
  github: string;
  relatedSlugs: string[];
}
