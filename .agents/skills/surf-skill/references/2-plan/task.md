# Plan: the task

The task is what the viewer sees in the video: a command, then the result. Make it honest and make it look good.

## Choose the task

- **Typical.** Use the skill for what its description promises, through its main flow. Not an edge case, not a stunt, not a feature buried in a reference file.
- **Visible.** It ends in one file a viewer understands at a glance: a page, a document, an image. Skills that only change how an agent thinks still need a concrete artifact to show.
- **Small.** Done within 10 minutes by one agent on the free path. Pick the smallest scope that still shows the skill off: one page, not a site; one document, not a set.
- **Self-contained.** Everything the agent needs is in the prompt, the skill and `inputs/`. No accounts, no API keys, no private data.
- **Leaves a mark.** The result must carry text that only this skill produces (see [checks.md](checks.md)). If the obvious task leaves none, try another mode of the skill, or ask for its output template, until it does. If nothing does, the skill can't run.

## The deliverable

One main file, under `result/`. Its type decides how Video films it:

| Type | When | Video | Path |
| --- | --- | --- | --- |
| `web_page` | The skill makes a page, a deck in HTML, a dashboard, a chart page. | A scroll recording. | `.html` |
| `text` | The skill writes or rewrites a document: copy, a README, a report, code. | Before and after. | any text file |
| `image` | The skill makes a picture: a chart, a diagram, a poster. | A slideshow. | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg` |

When the skill makes a page, choose `web_page` even if it also writes other files. For `text`, set `before` to the input that the result rewrites (an `inputs/` file). Leave `before` out when the result is new.

## The title

`task.title` is the line the video opens with: the house Command → Result line.

- One line, at most 80 characters.
- It starts with `/<name> `, where `<name>` is the skill's frontmatter `name`, then says what is made, in plain words: `/hallmark a landing page for a Lisbon bakery`.
- Concrete and specific: a real kind of thing, for a named (fictional) subject. Not "a demo", not "an example".
- Lower case after the command, no full stop, no quotes.

The plan is agent-neutral: the title reads like a slash command, but the prompt below works for any agent.

## The prompt

`task.prompt` is exactly what Run's agent is told, at most 2000 characters. It must contain:

1. **The command line as its first line**, exactly the title.
2. **Answers to every question the skill's flow would ask.** Read the flow and answer each question up front (audience, tone, length, style…), so the skill never needs to stop.
3. **The paths.** Every input path it should read (`inputs/brief.md`), and every `result/` path it must write: the deliverable and every file a check looks at. Paths are relative to the working folder.
4. **"No one will answer questions. When something is unclear, decide, and note the choice in your final reply."**
5. **"No API keys are set."** Say what to skip if the skill has optional key-only steps.
6. **"Finish within 10 minutes."**

Where the skill leaves a choice (a theme, a layout, a format), let it choose; that is part of the demo. Where the result must be one self-contained file for Video, say so (for a page: all CSS and JS inline in the `.html`, no build step).

Don't paste the skill's instructions into the prompt; the agent has the skill. Don't put the skill's mark (the skill-specific check) in the prompt or the inputs: the check must prove the skill made it.

## Inputs

- Small, realistic text files: a brief, notes, a draft, a CSV. Markdown, plain text, CSV or JSON. A few KB each.
- Fictional people and businesses with believable details: names, a street, prices, opening hours. No real private people, no real customer data, no lorem ipsum.
- Write them as a real user would hand them over: a little messy is fine.
- Every file in `inputs/` must be named in the plan (in the prompt, `before` or a `differs` check), alone or through its folder.

## Live URLs

The prompt may point at a well-known public site (a Wikipedia article, a public docs page, a big brand's homepage) when the skill works from a URL. It must load without a login, a paywall or a cookie wall, and `plan-check.mjs` must reach it. Never point at a private or small personal site.

## Worked example: Hallmark

Hallmark designs landing pages. Its flow asks four things once (material, audience, use, tone), deals a theme with its own script, and stamps the CSS with `/* Hallmark · …`. `TOGETHER_API_KEY` is optional (the comp step).

`inputs/brief.md`:

```markdown
# Pastelaria Vasco: notes for the new site

Family bakery in Alfama, Lisbon, since 1987. Rua dos Remédios 41.
Open Tue–Sun 7:00–19:00, closed Mondays.
Known for pastéis de nata (€1.40), bola de Berlim, sourdough on weekends.
Owner: Inês Vasco. Orders for events by phone: +351 21 000 0000.
We want people to come in, and to pre-order boxes of 6 or 12 for parties.
No photos yet.
```

`plan.json`:

```json
{
  "task": {
    "title": "/hallmark a landing page for a Lisbon bakery",
    "prompt": "/hallmark a landing page for a Lisbon bakery\n\nThe bakery's notes are in inputs/brief.md. Use only the facts in it.\n\nAnswers to your questions: material: the brief only, no photos, so use stand-ins from the photo library; audience: locals and tourists in Alfama; use: visit the shop, and pre-order a box by phone; tone: warm editorial. Go ahead.\n\nSave the page as result/index.html, one self-contained file with all CSS in a <style> block and no build step.\n\nNo one will answer questions. When something is unclear, decide, and note the choice in your final reply. No API keys are set, so skip the comp step. Finish within 10 minutes."
  },
  "deliverable": { "path": "result/index.html", "type": "web_page" },
  "done": [
    { "check": "min_bytes", "path": "result/index.html", "value": 4000 },
    { "check": "valid_html", "path": "result/index.html" },
    { "check": "contains", "path": "result/index.html", "value": "Pastelaria Vasco" },
    { "check": "contains", "path": "result/index.html", "value": "/* Hallmark · " }
  ]
}
```

`/* Hallmark · ` is the mark: the skill's stamp, written by its own rules and found in `skill/SKILL.md` and its theme script, but nowhere in the prompt or the brief.
