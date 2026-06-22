import { directoryEntries, skillSlugFromId } from "../skill-model";
import type { SkillContent } from "./types";

const toSkillContent = (entry: (typeof directoryEntries)[number]): SkillContent => {
  const slug = skillSlugFromId(entry.skill.id);
  return {
    slug,
    tagline: entry.skill.description.short,
    glyph: "bars",
    command: entry.skill.example,
    commandLabel: slug,
    flow: {
      write: {
        label: "You write",
        head: "Input",
        body: entry.skill.description.input,
      },
      between: {
        label: "It works",
        head: "Process",
        body: entry.skill.description.process,
      },
      get: {
        label: "You get",
        head: "Output",
        body: entry.skill.description.output,
      },
    },
    installCommand: entry.skill.installCommand ?? entry.collection.installCommand,
    author: {
      name: entry.collection.author.name,
      githubUrl: entry.collection.author.url,
      repoLabel: entry.collection.id,
    },
    collection: {
      name: entry.collection.name,
      id: entry.collection.id,
      handle: entry.collection.author.name,
      handleUrl: entry.collection.author.url,
      avatarURL: entry.collection.author.avatarURL,
      stars: entry.collection.githubStars,
      installs: entry.collection.installCount,
    },
    links: {
      github: entry.collection.repositoryURL,
      website: entry.collection.websiteURL,
      external: entry.collection.externalLinks,
    },
    github: entry.collection.repositoryURL,
    relatedSlugs: entry.relatedSkillSlugs,
  };
};

export const skillDetails: Record<string, SkillContent> = Object.fromEntries(
  directoryEntries.map((entry) => {
    const content = toSkillContent(entry);
    return [content.slug, content];
  }),
);
