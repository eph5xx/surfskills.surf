// Typed content contract for per-skill detail pages. The catalog `Skill`
// (src/data/skills.ts) stays the thin listing; everything the detail page
// shows lives in a SkillDetail module under skill-details/<slug>/.
//
// Honesty convention: any number we curated by hand instead of reading from a
// machine artifact carries `estimated: true` and MUST render with a visible
// "est." tag — never hide curation in a tooltip.

export interface VerifiedBadge {
  /** "Jun 10, 2026" — the day the curator ran the skill end-to-end. */
  date: string;
  /** Upstream version the verification is pinned to, e.g. "v2.1.1". */
  version: string;
  /** Platform + models the run used, e.g. "Claude Code · Sonnet + Opus". */
  platform: string;
  /** One-liner shown on hover: what "verified" actually means here. */
  methodology: string;
}

export interface QuickStat {
  value: string;
  label: string;
  estimated?: boolean;
}

export interface ReceiptLine {
  item: string;
  detail?: string;
  value: string;
  estimated?: boolean;
}

export interface RunReceipt {
  /** Always true today: tokens/cost are not machine-recorded by the skill. */
  curated: true;
  title: string;
  runDate: string;
  lines: ReceiptLine[];
  total: ReceiptLine;
  footnote: string;
}

export interface Scenario {
  id: string;
  /** Tab label, e.g. "Lifeguard — skills marketplace". */
  label: string;
  /** Verbatim input given to both runs. Never paraphrase. */
  brief: string;
  briefCaption: string;
  /** Public path of the unmodified output artifact (iframe src). */
  artifactUrl: string;
  artifactCaption: string;
  /**
   * Slug of the baseline markdown in this skill's detail folder
   * (baseline.md frontmatter carries its own provenance).
   */
  baselineFile: string;
  baselineCaption: string;
}

export interface TranscriptStep {
  title: string;
  detail: string;
}

export type CapabilityIcon = "folder" | "globe" | "terminal" | "plug" | "key" | "agents";

export interface Capability {
  icon: CapabilityIcon;
  title: string;
  detail: string;
  /** "yes" = does this, "no" = explicitly does NOT do this. */
  kind: "yes" | "no";
}

export interface Drift {
  verifiedVersion: string;
  upstreamCommits: number;
  lastChecked: string;
}

export interface CompatRow {
  tool: string;
  supported: boolean;
  note: string;
}

export interface Requirement {
  label: string;
  detail?: string;
}

export interface TriggerExample {
  command: string;
  note: string;
}

export interface Struggle {
  title: string;
  detail: string;
  /** The data backing the admission — every struggle carries its receipt. */
  receipt: string;
}

export interface AuditFinding {
  title: string;
  detail: string;
  severity: "pass" | "note";
}

export interface Audit {
  grade: string;
  date: string;
  version: string;
  summary: string;
  findings: AuditFinding[];
}

export interface VersionEntry {
  version: string;
  date: string;
  verified: boolean;
  note: string;
}

export interface UpstreamAuthor {
  name: string;
  repoUrl: string;
  repoLabel: string;
  latestCommit: string;
  otherWork?: string;
}

export interface CommunityReport {
  quote: string;
  who: string;
}

/**
 * Shape of the slice we read from a run's vendored numbers.json
 * (produced by tweakidea's deterministic compute.py — never hand-edited).
 */
export interface RunNumbers {
  weighted_total: number;
  potential_total: number;
  verdict_bucket: string;
  verdict_label: string;
  overall_grade: string;
  rankings: Array<{
    dim: string;
    slug: string;
    weight: number;
    score: number;
    potential: number;
    weighted_score: number;
    evidence_strength: {
      both_confirmed: number;
      research_only: number;
      founder_only: number;
      assumed: number;
      grade: string;
    };
  }>;
  evidence_totals: {
    both_confirmed: number;
    research_only: number;
    founder_only: number;
    assumed: number;
  };
}

export interface SkillDetail {
  slug: string;
  subtitle: string;
  badge: VerifiedBadge;
  quickStats: QuickStat[];

  /** Short one-liners for the flow strip: what you hand it, the interaction in
   *  the middle, and what comes back. The demo video shows in→out; these carry
   *  what a clip can't (the access facts and the mid-run questions). */
  io?: { input: string; between: string; output: string };

  scenarios: Scenario[];
  receipt: RunReceipt;
  transcript: { label: string; note: string; steps: TranscriptStep[] };

  capabilities: Capability[];
  capabilityCrossRef: string;
  drift: Drift;

  compatibility: CompatRow[];
  requirements: Requirement[];
  triggers: TriggerExample[];
  triggerFootnote: string;

  scorecard: {
    rubricUrl: string;
    rubricLabel: string;
  };
  struggles: Struggle[];
  alternativesNote: string;

  audit: Audit;
  source: {
    note: string;
    githubUrl: string;
    license: string;
    licenseUrl: string;
  };

  upstream: UpstreamAuthor;
  versions: VersionEntry[];

  community: {
    // FAKE-UNTIL-REAL: sample reports shown under an unconditional
    // "Sample data" badge until Pro launches and real reports exist.
    placeholderRatio: string;
    placeholderReports: CommunityReport[];
  };

  relatedSlugs: string[];
}
