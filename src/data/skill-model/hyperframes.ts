import {
  type Collection,
  type DirectorySkill,
  SkillKind,
  SkillAudience,
  SkillTask,
} from "./types";

export const collection: Collection = {
  name: "HyperFrames",
  id: "heygen-com/hyperframes",
  shortDescription:
    "Write HTML, render video, built for agents - describe a video and HyperFrames composes it in HTML/CSS/JS and renders a deterministic MP4.",
  readme: "https://github.com/heygen-com/hyperframes/blob/main/README.md",
  repositoryURL: "https://github.com/heygen-com/hyperframes",
  license: "Apache-2.0",
  githubStars: 29740,
  updatedAt: "2026-06-22",
  externalLinks: [
    "https://www.skills.sh/heygen-com/hyperframes",
    "https://claudemarketplaces.com/skills/heygen-com/hyperframes",
  ],
  author: {
    url: "https://github.com/heygen-com",
    name: "HeyGen",
    avatarURL: "https://github.com/heygen-com.png",
  },
  installCommand:
    "Install this skill collection or give me an instruction how to install it: https://github.com/heygen-com/hyperframes",
  skills: ["heygen-com/hyperframes/hyperframes"],
};

export const skill: DirectorySkill = {
  name: "Render a Video",
  id: "heygen-com/hyperframes/hyperframes",
  collection: "heygen-com/hyperframes",
  description: {
    short:
      "Describe the video you want and HyperFrames teaches your coding agent to compose it in HTML/CSS/JS. It renders a deterministic MP4, the same every time.",
    input:
      "Run /hyperframes or describe the video you want in plain language.",
    process:
      "It picks the right workflow, scaffolds the project, and writes a deterministic HTML composition, then renders it frame-by-frame to MP4.",
    output:
      "A polished MP4 — e.g. a 1920×1080, 10-second product intro. Same input, same video, every time.",
  },
  example:
    '/hyperframes "Create a 10-second product intro with a fade-in title, a background video, and subtle background music"',
  referenceFile:
    "https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes/SKILL.md",
  installCommand:
    "Install the skill or give me an instruction how to install it - hyperframes from https://github.com/heygen-com/hyperframes",
  tools: [],
  previewVideo: "/skills/hyperframes-demo.mp4",
  externalLinks: [
    "https://www.skills.sh/heygen-com/hyperframes/hyperframes",
    "https://claudemarketplaces.com/skills/heygen-com/hyperframes/hyperframes",
  ],
  kind: SkillKind.Workflow,
  audiences: [SkillAudience.Design, SkillAudience.Developer],
  tasks: [SkillTask.Video],
};

