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
  /** Long-form "What this collection does" body (collections.long_description). SEO content. */
  longDescription?: string;
  /** "When to use it" entries (collections.when_to_use). */
  whenToUse?: WhenToUseItem[];
  /** FAQ entries (collections.faq) — also emitted as FAQPage structured data. */
  faq?: FaqItem[];
}

export interface SkillDescription {
  short: string;
  // Legacy "how it works" beats — stored on older rows but never rendered (only
  // `short` is shown). No longer authored by the create-surf-skill pipeline.
  input?: string;
  process?: string;
  output?: string;
}

export interface SkillTool {
  name: string;
  blocking: boolean;
}

/** One "When to use it" entry — a short outcome title plus a one-line explanation. */
export interface WhenToUseItem {
  title: string;
  body: string;
}

/** One FAQ entry — feeds both the on-page accordion and FAQPage structured data. */
export interface FaqItem {
  q: string;
  a: string;
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
  Meta, // improve the agent itself (memory, workflow observation, skill-building)
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
  /** When the skill was added to the site (skills.created_at). */
  createdAt?: string;
  /** Long-form "What it does" body (skills.long_description). SEO content. */
  longDescription?: string;
  /** "When to use it" entries (skills.when_to_use). */
  whenToUse?: WhenToUseItem[];
  /** FAQ entries (skills.faq) — also emitted as FAQPage structured data. */
  faq?: FaqItem[];
}

