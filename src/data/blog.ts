// One entry per post. Add to the top as new field notes land.
// Shared by the /blog index and the sitemap, so a post can't appear on one
// without the other.
export interface BlogPost {
  href: string;
  title: string;
  blurb: string;
  date: string;
}

export const posts: BlogPost[] = [
  {
    href: "/blog/design-resource-galleries",
    title: "Gradients, hero sections, and free fonts: three galleries worth bookmarking",
    blurb:
      "Three curated galleries — Grainient for gradients, Supahero for hero sections, Free Faces for fonts — for shipping better-looking pages faster.",
    date: "Jun 2026",
  },
  {
    href: "/blog/tweak-idea",
    title: "Tweak Idea: score a startup idea across 14 dimensions",
    blurb:
      "An open-source Claude Code skillset that runs a rough startup idea through a multi-agent pipeline and hands back a weighted scorecard with ranked next steps.",
    date: "Jun 2026",
  },
];
