export interface CollectionOwner {
  url: string;
  name: string;
  avatarURL?: string;
}

export interface Collection {
  name: string;
  id: string;
  shortDescription: string;
  readme?: string;
  repositoryURL: string;
  websiteURL?: string;
  externalLinks: string[];
  author: CollectionOwner;
  license?: string;
  githubStars?: number;
  updatedAt?: string;
  installCommand: string;
  installCount?: number;
  skills: string[];
}

export interface SkillDescription {
  short: string;
  input: string;
  process: string;
  output: string;
}

export interface SkillTool {
  name: string;
  blocking: boolean;
}

export enum SkillKind {
  Guidance,
  Workflow,
  Tool,
  Reference,
  Integration,
}

export enum SkillAudience {
  Founder,
  Design,
  SEO,
  Developer,
}

export enum SkillTask {
  Audit,
  Website,
  Video,
  Research,
  Review,
}

export interface DirectorySkill {
  name: string;
  id: string;
  collection: string;
  description: SkillDescription;
  example: string;
  referenceFile?: string;
  installCommand?: string;
  tools?: SkillTool[];
  previewVideo?: string;
  previewImage?: string;
  externalLinks: string[];
  kind: SkillKind;
  audiences: SkillAudience[];
  tasks: SkillTask[];
}

