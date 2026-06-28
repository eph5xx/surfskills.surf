import { directoryCollections, directoryEntries } from "./skill-model";
import { toSkillCard, type Skill } from "./skill-card";
import { formatUpdatedFull } from "./directory";

// Landing-page catalog model. This stays CODE-DRIVEN and prerendered — the
// homepage hero/showcase is intentionally independent of the Supabase catalog,
// so it never breaks if the DB changes. The card shape itself is derived by the
// shared `toSkillCard` (see ./skill-card), which the DB-driven catalog pages
// reuse so cards render identically in both worlds.

export type { Skill } from "./skill-card";

// Curated homepage "example section" (SkillShowcase). This is an explicit
// allowlist, NOT derived from directoryEntries, so newly-onboarded skills
// (e.g. via create-surf-skill) never auto-appear in the homepage example
// section. Add an id here by hand to feature a skill.
const FEATURED_SKILL_IDS = new Set<string>([
  "greensock/gsap-skills/gsap-scrolltrigger",
  "jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better",
  "Leonxlnx/taste-skill/design-taste-frontend",
  "Egonex-AI/Understand-Anything/understand",
  "eph5xx/tweakidea/tweak-evaluate",
  "heygen-com/hyperframes/hyperframes",
]);

export const author = {
  name: "Sasha S.",
  initial: "S",
  avatarBg: "#3D5A80",
};

export const skills: Skill[] = directoryEntries.map(({ skill }) =>
  toSkillCard(skill, { featured: FEATURED_SKILL_IDS.has(skill.id), available: true }),
);

export const skillsById: Record<string, Skill> = Object.fromEntries(
  skills.map((s) => [s.id, s]),
);

export const categories = Array.from(new Set(skills.map((skill) => skill.category))).map(
  (name) => ({ name, emoji: "•" }),
);

export const supportedTools = Array.from(new Set(skills.flatMap((s) => s.tools)));

// ISO "YYYY-MM-DD" strings sort lexicographically == chronologically, so the
// last entry after sorting is the most recent update across all collections.
const lastUpdatedISO = directoryCollections
  .map((c) => c.updatedAt)
  .filter((d): d is string => Boolean(d))
  .sort()
  .at(-1);

export const stats = {
  lastUpdated: formatUpdatedFull(lastUpdatedISO),
} as const;
