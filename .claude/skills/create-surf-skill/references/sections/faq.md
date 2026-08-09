# FAQ — the `faq[]` pairs (collection + skill)

Renders under an H2 "FAQ" as an accordion **and** emits `FAQPage` JSON-LD structured data —
the surface that wins FAQ rich results in Google and gets your answer quoted in ChatGPT,
Perplexity, and AI Overviews. An engine lifts one `a` out of context, so every answer must
stand alone. Read [`../shared/voice.md`](../shared/voice.md) first.

- **Skill:** the objections a user hits before adopting this skill.
- **Collection:** the objections about adopting the whole toolkit (what's included, install
  once or per skill, is it free, which agents, use one without the rest).

## Count
3–4 pairs. Skip anything the blurb already answers.

## GEO rules
1. **`q` is a natural-language query** ("Does it work with private repos?"), not a heading.
2. **Front-load a self-contained answer.** The first sentence resolves it in ~40–50 words,
   with the skill or collection named once so the quote is attributable.
3. **One question, one answer** — don't bundle price, install, and scope into one pair.
4. **Cover the objection cluster** (cost, setup, comparison, limits). No stuffing, no
   restating the blurb.

## Shape (into run.json)
```json
"faq": [
  { "q": "…", "a": "…" }   // real question; direct self-contained answer, named once, 1–2 sentences
]
```

## Examples
```json
{ "q": "Is it free to use?",
  "a": "Yes. Mapper is an open-source agent skill with no paid tier. You run it locally against your own repo." }
```
Weak: `{ "q": "What are the benefits?", "a": "It offers many powerful benefits." }` — vague query, hype, not self-contained.
