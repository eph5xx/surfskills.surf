# Plan: checks

`done` lists the checks Run's code runs on the result. All must pass, or the run fails. They are mechanical: code reads files, nothing judges taste. `plan-check.mjs` enforces everything below; keep the two in sync.

## What each check means

| Check | Passes when | `value` |
| --- | --- | --- |
| `exists` | The file exists. | none |
| `min_bytes` | The file is at least `value` bytes. | a positive integer |
| `contains` | The file contains `value` exactly: case-sensitive, whitespace included, no patterns. | a non-empty string |
| `differs` | The file's bytes differ from the input file `value`. | an existing `inputs/` file |
| `valid_html` | The file parses as an HTML document with a `<html>`, a `<head>` and a `<body>`. Only on `.html` files. | none |

Every `path` is a `result/` path, relative, with no `..`, and named in the prompt.

## Checks every plan needs

1. **A size floor** on the deliverable: `min_bytes`, set to what a real result can't miss. A finished landing page is several KB, a rewritten README is about the size of the draft. Not so high that an honest, short result fails.
2. **`valid_html`** on the deliverable when it is a `web_page`.
3. **`differs`** from `before` to the deliverable when there is a `before`, so an unchanged copy fails.
4. **The skill-specific check**: a `contains` check on a result file whose text
   - is at least 6 characters,
   - appears word for word somewhere in `skill/`, and
   - appears nowhere in the prompt or in `inputs/`.

   It proves the skill ran, not just a capable agent. Without it, a plain agent could pass every check.

Add a `contains` check for one fact from the inputs (the business name) when it is cheap. Don't check for things the skill may phrase freely.

## Finding a good mark

Look for text the skill tells the agent to write every time:

- A stamp or signature comment: Hallmark's `/* Hallmark · `.
- A fixed heading or label from its output template: `## Summary of changes`, `Generated with <tool>`.
- A file header or front matter key from a template in `assets/` or `references/`.
- A class name, data attribute or CSS variable its templates always use.

Prefer a mark the main flow writes on every run over one that depends on a choice the skill makes. Keep it short: the fixed part only, not the variables after it (`/* Hallmark · `, not the whole stamp). Copy it from the skill file, character for character; a curly quote or a middle dot must match.

If the skill writes no such text, reshape the task: another mode of the skill, or ask for its output template, until the result carries a mark. If no task can, reply `can't run: no output that only this skill produces`.
