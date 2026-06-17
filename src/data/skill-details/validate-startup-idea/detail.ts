import type { SkillContent } from "../types";

// Detail content for the public listing of `/tweak:evaluate`
// (tweakidea v2.1.1, github.com/eph5xx/tweakidea).
export const detail: SkillContent = {
  slug: "validate-startup-idea",
  tagline:
    "14 independent evaluators score your pitch — each doing its own web research — then an honest scorecard tells you GO, PIVOT, or STOP.",
  glyph: "bars",
  command: '/tweak:evaluate "An app that lets restaurants sell unsold food"',

  flow: {
    write: {
      label: "You write",
      head: "Your idea, in one plain sentence",
      body: "Describe the problem and the solution. Point it at a file, or run it bare to be interviewed.",
    },
    between: {
      label: "It works",
      head: "It interrogates your idea",
      body: "It extracts ~12 hidden assumptions for you to confirm, then asks 5 founder–market-fit questions — each backed by its own live web research.",
    },
    get: {
      label: "You get",
      head: "An honest validation report",
      body: "A shareable HTML or PDF scorecard: 14 independent dimension scores, the evidence behind each, and a single clear verdict.",
    },
  },

  worksWith: ["Claude Code"],
  worksWithNote: "",
  setup: ["No MCP servers", "No API keys"],

  author: {
    name: "eph5xx",
    githubUrl: "https://github.com/eph5xx",
    repoLabel: "eph5xx/tweakidea",
  },
  github: "https://github.com/eph5xx/tweakidea",

  relatedSlugs: ["understand-anything", "hyperframes"],
};
