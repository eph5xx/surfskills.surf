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
  skills: ["Leonxlnx/taste-skill/design-taste-frontend"],
};

export const skill: DirectorySkill = {
  name: "Taste Skill",
  id: "Leonxlnx/taste-skill/design-taste-frontend",
  collection: "Leonxlnx/taste-skill",
  description: {
    short:
      "An anti-slop frontend skill: your agent reads the brief, infers the right design direction, and ships interfaces that don't look templated.",
    input:
      "Describe the page you want - kind, audience, vibe, any references. Run /design-taste-frontend in your coding agent, or just let it follow the skill on any UI task. The demo brief asked for a premium cookware landing page, 'cold-luxury, NOT the default warm beige + brass + espresso palette.'",
    process:
      "The skill infers a one-line 'Design Read', sets three dials (variance, motion, density), maps the brief to a real design system when one fits, and runs a 50+ item anti-slop pre-flight check - no AI-purple gradients, no Inter default, no em-dashes, no fake screenshots.",
    output:
      "The demo produced a full Next.js landing page (8 sections, nav, footer). It rejected the banned beige-and-brass palette for a Cold Luxury slate/zinc system locked to one accent, used Outfit + JetBrains Mono instead of Inter, and shipped class-based dual dark/light mode with motion gated behind prefers-reduced-motion.",
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

