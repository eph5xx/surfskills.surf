import type { SkillDetail } from "../types";

// Detail content for the public listing of `/tweak:evaluate` (tweakidea v2.1.1,
// github.com/eph5xx/tweakidea). Demo artifacts come from the real run
// ~/.tweakidea/runs/20260610-123455 ("Lifeguard"): report.html is served
// unmodified from /demo/validate-startup-idea/, numbers.json is vendored
// verbatim next to this file, baseline.md carries its own provenance.

export const detail: SkillDetail = {
  slug: "validate-startup-idea",
  subtitle:
    "14 independent evaluators score your pitch, each with its own web research — then an honest scorecard tells you GO, PIVOT, or STOP.",

  io: {
    input: "Your startup idea, in plain words — the problem and the solution.",
    between: "You confirm 12 assumptions it extracts, then answer 5 founder–market-fit questions.",
    output: "A validation report — HTML or PDF — 14 independent dimension scores and a GO / PIVOT / STOP verdict.",
  },

  badge: {
    date: "Jun 10, 2026",
    version: "v2.1.1",
    platform: "Claude Code · Sonnet + Opus",
    methodology:
      "Verified = Sasha ran this exact version end-to-end on a real brief, audited what it reads, writes and sends, and published the unmodified output below.",
  },

  quickStats: [
    { value: "14", label: "dimensions scored" },
    { value: "17", label: "agents per run" },
    { value: "10–20 min", label: "per run" },
    // CURATED: tokens/cost are not machine-recorded at v2.1.1 — estimated by
    // Sasha on 2026-06-10 from agent counts and model pricing.
    { value: "≈$6", label: "per run", estimated: true },
  ],

  scenarios: [
    {
      id: "lifeguard",
      label: "Lifeguard — a skills-marketplace idea",
      // Verbatim `text` from the run's idea.json. Never paraphrase.
      brief:
        'Problem: AI output is mediocre by default, and people can\'t judge skill quality before wasting hours. Skills promise the fix but are black boxes — no visible result before install, no provenance, and real security risk. SKILL.md just standardized the format across Claude and Gemini, one-click install shipped, and supply exploded on GitHub with no quality layer on top.\n\nSolution: SurfSkills — the trusted library of AI skills ("Mobbin for AI skills"). Extract working skills and demand signal from GitHub, verify each through a pipeline (sandboxed run, security audit, live before/after demo — only verified skills hosted, the demo is the product page), and distribute via programmatic SEO where every demo doubles as a landing page. Wedge: solo founders (decks, landing pages, launch assets), where before/after is visceral. Why it wins: usage data feeds extraction and evals, the demo library compounds into owned distribution, trust brand sits on top. Any skill is clonable; the flywheel isn\'t. Demos free, subscription unlocks the library.',
      briefCaption:
        "This is the exact input both runs received — yes, it's our own startup. Judge for yourself.",
      artifactUrl: "/demo/validate-startup-idea/report.html",
      artifactCaption:
        "Unmodified artifact — byte-for-byte the file the skill produced on Jun 10, 2026.",
      baselineFile: "baseline",
      baselineCaption: "Verbatim, first take, no retries.",
    },
  ],

  receipt: {
    curated: true,
    title: "Run receipt",
    runDate: "Jun 10, 2026",
    lines: [
      { item: "Orchestrator", detail: "stages the run, collects results", value: "1× Claude" },
      {
        item: "Dimension evaluators",
        detail: "parallel, each with its own web research",
        value: "14× Sonnet",
      },
      { item: "Market researcher", detail: "6–10 web searches, background", value: "1× Sonnet" },
      { item: "Hypothesis extractor", detail: "pulls testable claims from your pitch", value: "1× Sonnet" },
      { item: "Narrative synthesis", detail: "strengths, weaknesses, next steps", value: "1× Opus" },
      { item: "Scoring + render", detail: "deterministic Python, not a model", value: "$0" },
      { item: "Wall clock", value: "10–20 min" },
      // CURATED: not machine-recorded — estimated from agent counts, typical
      // research volume, and Jun 2026 model pricing. Replace when runs emit
      // telemetry.
      { item: "Tokens", value: "~700k", estimated: true },
    ],
    total: { item: "Cost to run", value: "≈$6", estimated: true },
    footnote:
      "Numbers marked est. are curated estimates — the skill doesn't record its own token bill yet. The rest is read straight from the run.",
  },

  transcript: {
    label: "What actually happened, step by step",
    note: "Summarized replay of the Jun 10 run — full raw transcripts are part of the verification pipeline, not yet published.",
    steps: [
      {
        title: "Intake",
        detail:
          "Parses the pitch into problem + solution and opens a fresh run directory — every artifact that follows is a typed JSON file.",
      },
      {
        title: "Research lane opens",
        detail:
          "A researcher agent fans out 6–10 web searches across competitor, market, and user clusters. It runs in the background while you keep talking.",
      },
      {
        title: "Hypothesis extraction",
        detail:
          "A second agent pulls up to 12 testable claims out of the pitch. The founder confirms or rejects each one — unconfirmed claims stay flagged all the way to the report.",
      },
      {
        title: "14 evaluators in parallel",
        detail:
          "One Sonnet agent per dimension, each scoring against a fixed rubric and running its own targeted web research. No evaluator sees another's verdict.",
      },
      {
        title: "Deterministic scoring",
        detail:
          "A Python script — not a model — aggregates the 14 JSON verdicts into weighted totals, evidence grades, and the GO / PIVOT / STOP bucket.",
      },
      {
        title: "Narrative synthesis",
        detail:
          "An Opus agent reads the numbers and writes the prose: top strengths, bottom weaknesses, next validation steps, and what the score becomes if assumptions hold.",
      },
      {
        title: "Render",
        detail:
          "Jinja2 templates produce report.html and report.md. The HTML file on the right of the comparison is that output, untouched.",
      },
    ],
  },

  capabilities: [
    {
      icon: "folder",
      kind: "yes",
      title: "Writes to one folder",
      detail: "All output lands in ~/.tweakidea/runs/<timestamp>/ — nothing else on disk is touched.",
    },
    {
      icon: "globe",
      kind: "yes",
      title: "Searches the web",
      detail: "Web search + page fetches during research and evaluation. No other endpoints, ever.",
    },
    {
      icon: "terminal",
      kind: "yes",
      title: "Runs Python via uv",
      detail: "Three scripts with pinned deps (jsonschema, jinja2, weasyprint) score and render the report.",
    },
    {
      icon: "agents",
      kind: "yes",
      title: "Spawns 17 subagents",
      detail: "Researcher, extractor, 14 evaluators, narrator — all scoped to this run's folder.",
    },
    {
      icon: "plug",
      kind: "no",
      title: "No MCP servers",
      detail: "Uses only built-in Claude Code tools. Nothing extra to install or trust.",
    },
    {
      icon: "key",
      kind: "no",
      title: "No API keys",
      detail: "Touches no credentials, no env vars, no accounts.",
    },
  ],
  capabilityCrossRef:
    "Declared tools in the skill's own frontmatter — Read, Write, Bash, Agent, AskUserQuestion — match what our audit observed.",

  drift: {
    verifiedVersion: "v2.1.1",
    // CURATED: refresh with
    //   git -C <tweakidea> fetch && git rev-list v2.1.1..origin/main --count
    upstreamCommits: 3,
    lastChecked: "Jun 10, 2026",
  },

  compatibility: [
    { tool: "Claude Code", supported: true, note: "Tested on v2.1.1 · Jun 2026" },
    { tool: "claude.ai", supported: false, note: "Needs subagents + local scripts" },
    { tool: "ChatGPT", supported: false, note: "Claude Code command format" },
    { tool: "Cursor", supported: false, note: "Claude Code command format" },
    { tool: "Gemini CLI", supported: false, note: "Not ported" },
  ],

  requirements: [
    { label: "Claude Code", detail: "the skill is a /command suite for it" },
    { label: "uv", detail: "runs the scoring + render scripts (one-line install)" },
    { label: "Sonnet and Opus access", detail: "evaluators run Sonnet, synthesis runs Opus" },
    { label: "10–20 minutes", detail: "first run includes a short founder profile" },
    { label: "Nothing else", detail: "no API keys, no MCP servers, no config" },
  ],

  triggers: [
    {
      command: '/tweak:evaluate "An app that lets restaurants sell unsold food"',
      note: "Inline — paste the idea straight into the command",
    },
    { command: "/tweak:evaluate ~/ideas/concept.md", note: "From a file" },
    { command: "/tweak:evaluate", note: "Empty — it interviews you instead" },
  ],
  triggerFootnote:
    "Installs as a suite: /tweak:improve rewrites weak ideas, /tweak:diff compares runs, /tweak:share publishes a report, plus list / show / browse-hn companions.",

  scorecard: {
    rubricUrl: "https://github.com/eph5xx/tweakidea/tree/v2.1.1/skills/ti-scoring",
    rubricLabel: "Every score comes from a fixed public rubric — read it",
  },

  struggles: [
    {
      title: "It takes the founder's word on founder-side claims",
      detail:
        "Founder-Market Fit scored 4/5 — but every one of its five signals came from the founder, none independently verifiable.",
      receipt: "Founder-Market Fit: score 4, evidence grade D (5/5 signals founder-only)",
    },
    {
      title: "A third of the evidence is assumptions",
      detail:
        "The skill flags every unconfirmed claim and prices its impact on the score — but it can't resolve them. Validation is still your job.",
      receipt: "31 of 94 evidence signals assumed; 7 assumptions priced at +0.02 to +0.12 each",
    },
    {
      title: "Niche market sizing leans on proxy markets",
      detail:
        "No analyst sizes 'verified AI skill libraries', so Market Size reasoned from the broader prompt-marketplace figure.",
      receipt: "Market Size: score 3, evidence grade C, anchored on a $1.94B adjacent market",
    },
    {
      title: "Some dimensions had almost nothing public to stand on",
      detail:
        "Where the web is silent, scores rest on reasoning — the report says so instead of inventing citations.",
      receipt: "Frequency, Behavior Change, and Mandatory Nature all earned evidence grade F",
    },
    {
      title: "It's slow and it isn't free",
      detail:
        "10–20 minutes and about $6 against a 60-second chat answer. The receipt above is the honest price of 14 independently-researched verdicts.",
      receipt: "Run receipt: ~700k tokens est., 17 agents, 10–20 min wall clock",
    },
  ],

  alternativesNote:
    "No alternative skill has been run on this exact brief yet. Same-brief, side-by-side comparisons are how we'll test them — watch this space.",

  audit: {
    grade: "A",
    date: "Jun 10, 2026",
    version: "v2.1.1",
    summary: "Read the source, ran it sandboxed, watched what it touched.",
    findings: [
      {
        title: "Writes are scoped",
        detail: "Everything lands under ~/.tweakidea/. No project files, no dotfiles, no system paths.",
        severity: "pass",
      },
      {
        title: "Network is research-only",
        detail: "Web search and page fetches during research and evaluation stages. No telemetry, no uploads — sharing a report is a separate, explicit command.",
        severity: "pass",
      },
      {
        title: "Dependencies are pinned",
        detail: "jsonschema 4.26.0, jinja2 3.1.6, weasyprint 62.3 — exact versions, run through uv.",
        severity: "pass",
      },
      {
        title: "No credential surface",
        detail: "No API keys read, no env vars consumed, no MCP servers required.",
        severity: "pass",
      },
      {
        title: "Optional PDF needs native libs",
        detail: "WeasyPrint wants pango/cairo for report.pdf; without them it skips gracefully. Cosmetic, not a risk.",
        severity: "note",
      },
    ],
  },

  source: {
    note: "Snapshot at v2.1.1 — the exact text we verified. Upstream may have moved since; see the drift indicator.",
    githubUrl: "https://github.com/eph5xx/tweakidea/blob/v2.1.1/commands/tweak/evaluate.md",
    license: "MIT",
    licenseUrl: "https://github.com/eph5xx/tweakidea/blob/v2.1.1/LICENSE",
  },

  upstream: {
    name: "Aleksandr Sarantsev",
    repoUrl: "https://github.com/eph5xx/tweakidea",
    repoLabel: "eph5xx/tweakidea",
    latestCommit: "Last upstream commit Apr 30, 2026",
    otherWork: "Also ships the /tweak suite: improve, diff, share, and HN idea-mining commands.",
  },

  versions: [
    { version: "v2.1.1", date: "Apr 26, 2026", verified: true, note: "Verified Jun 10, 2026 — this page" },
    { version: "v2.1.0", date: "Apr 20, 2026", verified: false, note: "Not verified by us" },
    { version: "v2.0.x", date: "Apr 16–19, 2026", verified: false, note: "Not verified by us" },
  ],

  community: {
    // FAKE-UNTIL-REAL: sample content. CommunityBlock renders an unconditional
    // "Sample data" badge — do not remove it until real reports replace these.
    placeholderRatio: "—",
    placeholderReports: [
      {
        quote: "Killed an idea I'd been circling for a month. The assumption ledger alone was worth it.",
        who: "Sample report",
      },
      {
        quote: "PIVOT verdict stung, but the next-steps list told me exactly what to validate first.",
        who: "Sample report",
      },
    ],
  },

  relatedSlugs: ["pitch-deck-narrative", "deep-market-research"],
};
