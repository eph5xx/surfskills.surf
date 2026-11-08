import { featuredSkills } from "./featured-skills";
import { toSkillCard, type Skill } from "./skill-card";

// Landing-page catalog model. The showcase stays CODE-DRIVEN — the featured set
// lives in ./featured-skills; the card shape itself is derived by the shared
// `toSkillCard` (see ./skill-card), which the DB-driven catalog pages reuse so
// cards render identically in both worlds. (The hero "last updated" badge is
// DB-driven and lives in pages/index.astro.)

export type { Skill } from "./skill-card";

export const author = {
  name: "Aleksandr Sarantsev",
  initial: "A",
  avatarBg: "#3D5A80",
  url: "https://ephx.dev",
};

export const skills: Skill[] = featuredSkills.map((skill) =>
  toSkillCard(skill, { featured: true, available: true }),
);
