import { featuredSkills } from "./featured-skills";
import { toSkillCard, type Skill } from "./skill-card";
import { formatUpdatedFull } from "./directory";

// Landing-page catalog model. This stays CODE-DRIVEN and prerendered — the
// homepage hero/showcase is intentionally independent of the Supabase catalog,
// so it never breaks if the DB changes. The featured set lives in
// ./featured-skills; the card shape itself is derived by the shared `toSkillCard`
// (see ./skill-card), which the DB-driven catalog pages reuse so cards render
// identically in both worlds.

export type { Skill } from "./skill-card";

export const author = {
  name: "Sasha S.",
  initial: "S",
  avatarBg: "#3D5A80",
};

export const skills: Skill[] = featuredSkills.map((skill) =>
  toSkillCard(skill, { featured: true, available: true }),
);

// ISO "YYYY-MM-DD" strings sort lexicographically == chronologically, so the
// last entry after sorting is the most recent update across the featured skills.
const lastUpdatedISO = featuredSkills
  .map((s) => s.updatedAt)
  .filter((d): d is string => Boolean(d))
  .sort()
  .at(-1);

export const stats = {
  lastUpdated: formatUpdatedFull(lastUpdatedISO),
} as const;
