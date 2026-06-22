import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "Taste Skill",
  id: "Leonxlnx/taste-skill",
  shortDescription:
    "An anti-slop frontend skill - your agent reads the brief, infers the right design direction, and ships interfaces that do not look templated.",
  readme: "https://github.com/Leonxlnx/taste-skill/blob/main/README.md",
  repositoryURL: "https://github.com/Leonxlnx/taste-skill",
  websiteURL: "https://tasteskill.dev",
  license: "MIT",
  githubStars: 48891,
  updatedAt: "2026-06-20",
  externalLinks: [
    "https://www.skills.sh/Leonxlnx/taste-skill",
    "https://claudemarketplaces.com/skills/Leonxlnx/taste-skill",
  ],
  author: {
    url: "https://github.com/Leonxlnx",
    name: "Leon Lin & blueemi",
    avatarURL: "https://github.com/Leonxlnx.png",
  },
  installCommand:
    "Install this skill collection or give me an instruction how to install it: https://github.com/Leonxlnx/taste-skill",
  skills: [
    "Leonxlnx/taste-skill/design-taste-frontend",
    "Leonxlnx/taste-skill/brandkit",
    "Leonxlnx/taste-skill/brutalist-skill",
    "Leonxlnx/taste-skill/gpt-tasteskill",
    "Leonxlnx/taste-skill/image-to-code-skill",
    "Leonxlnx/taste-skill/imagegen-frontend-mobile",
    "Leonxlnx/taste-skill/imagegen-frontend-web",
    "Leonxlnx/taste-skill/minimalist-skill",
    "Leonxlnx/taste-skill/output-skill",
    "Leonxlnx/taste-skill/redesign-skill",
    "Leonxlnx/taste-skill/soft-skill",
    "Leonxlnx/taste-skill/stitch-skill",
    "Leonxlnx/taste-skill/taste-skill-v1",
  ],
};

export const skill: DirectorySkill = {
  name: "Design With Taste",
  id: "Leonxlnx/taste-skill/design-taste-frontend",
  collection: "Leonxlnx/taste-skill",
  description: {
    short:
      "An anti-slop frontend skill: your agent reads the brief, infers the right design direction, and ships interfaces that don't look templated.",
    input:
      "Run /design-taste-frontend and describe the page — kind, audience, vibe, and any references.",
    process:
      "It infers a design direction, maps it to a real design system, and runs a 50+ item anti-slop check — no AI-purple gradients, no default Inter.",
    output:
      "A full landing page that doesn't look templated. The demo shipped 8 sections with a custom palette, real type, and dark mode.",
  },
  example:
    '/design-taste-frontend "Build a premium DTC cookware landing page: calm, editorial, cold-luxury, dual dark/light mode."',
  referenceFile:
    "https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md",
  installCommand:
    "Install the skill or give me an instruction how to install it - design-taste-frontend from https://github.com/Leonxlnx/taste-skill",
  tools: [],
  previewVideo: "/skills/taste-skill-demo.mp4",
  externalLinks: [
    "https://www.skills.sh/Leonxlnx/taste-skill/design-taste-frontend",
    "https://claudemarketplaces.com/skills/Leonxlnx/taste-skill/design-taste-frontend",
  ],
  kind: SkillKind.Guidance,
  audiences: [SkillAudience.Design, SkillAudience.Developer],
  tasks: [SkillTask.Website],
};

