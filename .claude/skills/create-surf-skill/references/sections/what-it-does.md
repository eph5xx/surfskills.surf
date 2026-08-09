# "What it does" — the `longDescription` body (collection + skill)

The page's main body, under an H2 **"What it does"**, split on blank lines into `<p>` tags.
This is the primary indexable prose — what Google and AI answer engines read to understand
and cite the page. **Required, never empty** (publish rejects a blank body); keep it short but
real. Read [`../shared/voice.md`](../shared/voice.md) first.

- **Skill:** answer the searcher's question in the first paragraph — what it does, what you
  feed it, what comes out.
- **Collection:** write for the whole roster — the throughline that makes the skills one set,
  plus the range of jobs they cover. Don't list every skill or inflate the count.

## Length
1–3 short paragraphs, ~80–160 words. One tight paragraph is often enough. Outcome first,
second person. Stop when the question is answered; don't pad.

## Shape (into run.json)
```json
"longDescription": "You point it at …\n\nUnder the hood it …\n\nYou get back …"
// one string; blank lines (\n\n) split into <p>. Outcome-first, concrete, no hype.
```

## Example (skill)
> Point it at any repo and get a labeled map of how the code fits together: entry points, the
> modules that matter, and how data moves between them.
>
> You paste a GitHub URL; it reads the tree and writes a walkthrough you can hand to a new
> hire on day one. No setup, no diagrams to draw by hand.
