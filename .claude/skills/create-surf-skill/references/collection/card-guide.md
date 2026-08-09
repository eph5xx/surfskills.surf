# Collection block — drafting `steps.card.collection` (step 2)

The collection block describes the **whole toolkit** — every skill in the repo as one
installable thing. It fills the landing page at `/s/<owner>/<repo>`: hero (name + short
description) + install card + **What it does** + **When to use it** + **FAQ** + roster grid.
Each long-form section renders only when populated. Collections have **no** "Pairs well
with" (skill-only).

| Section | Field(s) | Guide |
| --- | --- | --- |
| Name & short description | `name`, `shortDescription`, `websiteURL` | [`name-and-description.md`](name-and-description.md) |
| What it does | `longDescription` | [`../sections/what-it-does.md`](../sections/what-it-does.md) |
| When to use it | `whenToUse[]` | [`../sections/when-to-use.md`](../sections/when-to-use.md) |
| FAQ | `faq[]` | [`../sections/faq.md`](../sections/faq.md) |

## Check the live catalog first — the collection row is shared
The collection row is **shared by every sibling skill page** and upserted on publish, so this
card overwrites the one live row all siblings read. Read `steps.enrich.live.collection` first:
- **Row exists** → start every field from the live values (`name`, `shortDescription`,
  `websiteURL`, `longDescription`, `whenToUse`, `faq`); change one only on purpose, and flag it.
- **First skill in a new collection** → author the fields fresh.
- **`checked: false`** → probe skipped; tell the user and treat the `publish.mjs --review`
  diff as the only overwrite guard.

## Shape — write into run.json
```json
"collection": {
  "name": "…",             // → name-and-description.md
  "shortDescription": "…", // → name-and-description.md
  "websiteURL": null,      // → name-and-description.md
  "longDescription": "…",  // → ../sections/what-it-does.md
  "whenToUse": [ { "title": "…", "body": "…" } ],  // → ../sections/when-to-use.md
  "faq": [ { "q": "…", "a": "…" } ]                // → ../sections/faq.md (also FAQPage schema)
}
```
Assemble with the skill block into one `steps.card`; nothing is final until the user approves
(SKILL.md step 2 holds the gate).
