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

// How you work with a skill (its operational mode) — an expectation-setter shown
// on the skill page, not a browse filter. Backbone: does-a-task-and-stops vs stays-on.
export enum SkillKind {
  Action, // run it -> does a task -> done (generators, audits, interviews, setup)
  Mode, // turn it on; it persists, reshaping or observing your work (ponytail, tdd, task-observer)
  Knowledge, // never run; the agent consults it as knowledge (gsap, reference docs)
  Router, // doesn't do the work; routes you to the right skill / orchestrates sub-skills
}

// What you'd use a skill for — the primary browse axis (the SEO/GEO landing-page
// axis). Outcome/task-oriented and multi-select: a skill can serve several. This
// replaced the old Audience + Task axes (which overlapped and mis-named personas).
export enum SkillUseCase {
  Design, // UI/UX, frontend, brand, websites
  Video, // generate/edit video, motion graphics, captions
  Images, // generate static imagery / illustrations
  Writing, // content / copy / prose (humanizer)
  SEO, // search / growth / marketing
  Development, // build & integrate code (backend/API/SDK, infra)
  Research, // research, understand, audit & review work
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
  useCases: SkillUseCase[];
}

