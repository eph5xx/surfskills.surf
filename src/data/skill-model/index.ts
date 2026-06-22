import {
  collection as understandCollection,
  skill as understandSkill,
} from "./understand-anything";
import {
  collection as tasteCollection,
  skill as tasteSkill,
} from "./taste-skill";
import {
  collection as hyperframesCollection,
  skill as hyperframesSkill,
} from "./hyperframes";
import {
  collection as interfacesCollection,
  skill as interfacesSkill,
} from "./make-interfaces-feel-better";
import {
  collection as gsapCollection,
  skill as gsapScrolltriggerSkill,
} from "./gsap-scrolltrigger";
import {
  collection as tweakideaCollection,
  skill as tweakideaSkill,
} from "./validate-startup-idea";
import type { Collection, DirectorySkill } from "./types";

export interface DirectoryEntry {
  collection: Collection;
  skill: DirectorySkill;
  relatedSkillSlugs: string[];
}

export const skillSlugFromId = (id: string): string => {
  const parts = id.split("/");
  return parts[parts.length - 1] ?? id;
};

export const directoryEntries: DirectoryEntry[] = [
  {
    collection: tweakideaCollection,
    skill: tweakideaSkill,
    relatedSkillSlugs: ["understand", "hyperframes"],
  },
  {
    collection: hyperframesCollection,
    skill: hyperframesSkill,
    relatedSkillSlugs: ["gsap-scrolltrigger", "tweak:evaluate"],
  },
  {
    collection: interfacesCollection,
    skill: interfacesSkill,
    relatedSkillSlugs: ["design-taste-frontend", "understand"],
  },
  {
    collection: understandCollection,
    skill: understandSkill,
    relatedSkillSlugs: ["tweak:evaluate"],
  },
  {
    collection: gsapCollection,
    skill: gsapScrolltriggerSkill,
    relatedSkillSlugs: ["hyperframes"],
  },
  {
    collection: tasteCollection,
    skill: tasteSkill,
    relatedSkillSlugs: ["make-interfaces-feel-better", "hyperframes"],
  },
];

export const directoryCollections = directoryEntries.map((entry) => entry.collection);
export const directorySkills = directoryEntries.map((entry) => entry.skill);

export const directorySkillsBySlug: Record<string, DirectorySkill> = Object.fromEntries(
  directorySkills.map((skill) => [skillSlugFromId(skill.id), skill]),
);

