# Skill block — drafting `steps.card.skill` (step 2)

Fills the page at `/s/<owner>/<repo>/<pageSlug>`: hero (name + short description) → demo video
→ **What it does** → **When to use it** → **FAQ** → **Pairs well with**, plus a sidebar
(install, links, kind + use-case tags). Each long-form section renders only when populated —
fill them; they're the page's SEO/GEO surface. Read the checkout (README + the chosen skill's
directory) and `steps.enrich` first.

| Section | Field(s) | Guide |
| --- | --- | --- |
| What it does | `longDescription` | [`../sections/what-it-does.md`](../sections/what-it-does.md) |
| When to use it | `whenToUse[]` | [`../sections/when-to-use.md`](../sections/when-to-use.md) |
| FAQ | `faq[]` | [`../sections/faq.md`](../sections/faq.md) |

## Check the live catalog first
Read `steps.enrich.live`:
- **Sibling skills exist** → their `kind`, tone, and naming are the house style; match them.
  They're also the pool for `relatedSkills`.
- **`checked: false`** → probe skipped; tell the user, treat the `publish.mjs --review` diff as
  the overwrite guard, and leave `relatedSkills` empty (can't verify sibling slugs are live).


## Shape — write into run.json
```json
"skill": {
  "moduleSlug": "…",       // short memorable demo/file slug, lowercase-hyphenated; default = enrich moduleSlugDefault
  "name": "…",             // H1: Title Case, action-oriented, 2–4 plain words ("Map Any Codebase").
                           // Not the command; no compound qualifiers ("AI-Powered", "End-to-End").
                           // Prefer the skill's own plain term and the outcome/subject over process
                           // jargon ("Brainstorm Ideas" not "Turn Ideas Into Specs"; "Review AI
                           // Product Idea" not "Run a Stage-Gate Review").
  "description": { "short": "…" },  // one compelling outcome sentence → voice.md (roles + hard limit)
  "longDescription": "…",  // → ../sections/what-it-does.md
  "whenToUse": [ { "title": "…", "body": "…" } ],  // → ../sections/when-to-use.md
  "faq": [ { "q": "…", "a": "…" } ],               // → ../sections/faq.md (also FAQPage schema)
  "relatedSkills": [ "slug-a", "slug-b" ],  // "Pairs well with": curated from steps.enrich.live.skills; [] if none/unverifiable
  "kind": "Action",        // see below
  "useCases": ["Research"] // see below (≥1)
}
```

## `kind` — how you work with the skill (pick one)
Consulted, never run → `Knowledge`. Routes/orchestrates other skills → `Router`. Stays on and
shapes/observes your work → `Mode`. Does a task and stops → `Action` (most common: generators,
auditors, transforms, setup). A sibling's `kind` is a strong prior — match unless it clearly differs.

## `useCases` — what it's for (≥1, don't pad)
`Design` (UI/UX, brand, sites) · `Video` (video/motion/captions) · `Images` (static imagery) ·
`Writing` (content/copy) · `SEO` (search/growth/marketing) · `Development` (code/API/infra) ·
`Research` (audits, maps, analysis). Add more only when genuinely cross-cutting. If nothing
fits, use the closest and tell the user (new values are a website edit, not this run's job).
