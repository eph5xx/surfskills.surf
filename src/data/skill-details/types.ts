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
  flow: { write: Beat; between: Beat; get: Beat };
  installCommand: string;
  author: { name: string; githubUrl: string; repoLabel: string };
  github: string;
  relatedSlugs: string[];
}
