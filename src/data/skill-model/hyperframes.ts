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
  name: "HyperFrames Video Agent",
  id: "heygen-com/hyperframes/hyperframes",
  collection: "heygen-com/hyperframes",
  description: {
    short:
      "Describe the video you want and HyperFrames teaches your coding agent to compose it in HTML/CSS/JS. It renders a deterministic MP4, the same every time.",
    input:
      "Run /hyperframes or describe the video in plain language - e.g. a 10-second product intro with a fade-in title, background video, and subtle background music.",
    process:
      "The read-first skill routes the intent to the right workflow, scaffolds a project, writes a seekable HTML composition (timed `clip` tracks + a paused GSAP timeline, fully deterministic), then previews and renders frame-by-frame in headless Chrome through FFmpeg.",
    output:
      "The demo produced a 1920x1080, 10-second product intro - background video under a readability overlay, breathing accent glows, a staged title reveal, and a fade-to-black resolve - rendered to a ~1.6 MB H.264 MP4 (300 frames). Same input renders the same video, every time.",
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

