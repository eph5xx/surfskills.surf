# "When to use it" — the `whenToUse[]` checklist (collection + skill)

Renders under an H2 **"When to use it"** as a checklist (green check, bold `title`, `body`
beneath). Shows only when non-empty. This catches "when should I use X" and task-intent
searches, so write to the situation the user is in, not to the feature. Read
[`../shared/voice.md`](../shared/voice.md) first.

- **Skill:** each title is a moment the reader recognizes for this one skill.
- **Collection:** each title is a moment that calls for the whole toolkit. A moment that maps
  to a single skill belongs on that skill's page, not here.

### Collections: synthesize for breadth, don't sample skills
A collection can hold 40+ skills. Do **not** pick 3–4 skills and describe them; that leaves
the rest of the roster invisible and reads like a feature list. Instead:
1. Group the whole roster into a few clusters by the job they serve (e.g. for a marketing
   toolkit: acquisition, conversion, retention, go-to-market).
2. Write one moment per cluster, phrased as a real search ("You need traffic and can't hire a
   specialist per channel"), so the moment covers a whole area of the roster at once.
3. Across the set, the clusters should span the entire roster, not a corner of it. Naming a
   couple of concrete skills in the body is fine for concreteness, but the moment is the job,
   not the skills.

An umbrella "you are the whole \<function\> team" moment is a strong first item when the
collection replaces a role; the remaining items then drill into the highest-volume jobs.

## Rules
- **Trigger, not tool.** The title is the query in the user's head ("Your test suite is
  flaky"), not a restatement of what the thing is.
- **Real user language**, front-loaded on the recognizable noun or verb.
- **One idea per item**, concrete. No overlap, no padding to a count.

## Count
3–4 items, ordered by how common the moment is (most common first). Fewer (2–3) is fine for a
thin collection or one that wraps a single skill; never pad to a count.

## Shape (into run.json)
```json
"whenToUse": [
  { "title": "…",   // short trigger/situation, front-loaded noun/verb
    "body": "…" }   // one line: what they get. No mechanism, no hype.
]
```

## Examples

Skill (one moment for one skill):
```json
{ "title": "You're onboarding a new repo",
  "body": "Point it at an unfamiliar codebase and get a map of how the pieces fit before you touch anything." }
```

Collection (each moment is a search-shaped job spanning a cluster of a 45-skill marketing toolkit):
```json
[
  { "title": "You're the whole marketing team",
    "body": "One agent for the full funnel, from the SEO and content that bring people in to the pricing, onboarding, and retention that keep them." },
  { "title": "You need traffic and can't hire a specialist per channel",
    "body": "Cover SEO, content, paid ads, and social from one place instead of a different expert for each." },
  { "title": "Visitors show up but don't convert or stick around",
    "body": "Fix signup, onboarding, pricing, and paywalls, then cut churn and turn the users you keep into referrals." },
  { "title": "You're taking a product to market",
    "body": "Positioning, a launch plan, competitor and pricing research, and the sales and outreach assets to back it." }
]
```

Weak: `{ "title": "Powerful code analysis", "body": "Leverages advanced capabilities to streamline your workflow." }` — no moment, no outcome, all hype.
Weak (collection): four items that each name one skill ("Use the copywriting skill", "Use the SEO skill") — samples the roster instead of covering it.
