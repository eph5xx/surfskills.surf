export interface Beat {
  label: string;
  head: string;
  body: string;
}

export interface SkillContent {
  slug: string;
  tagline: string;
  glyph?: string;
  command: string;
  /** Monospace label shown above the H1 (e.g. "tweak:evaluate"). */
  commandLabel: string;
  flow: { write: Beat; between: Beat; get: Beat };
  installCommand: string;
  author: { name: string; githubUrl: string; repoLabel: string };
  /** Collection this skill belongs to — powers the sidebar Collection card. */
  collection: {
    name: string;
    id: string;
    handle: string;
    handleUrl: string;
    avatarURL?: string;
    stars?: number;
    installs?: number;
  };
  /** Outbound links shown in the sidebar Links card. */
  links: { github: string; website?: string; external: string[] };
  github: string;
  relatedSlugs: string[];
}
