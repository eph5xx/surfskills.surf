# Step 4: Card

> Not implemented yet.

Write all the text and labels for the skill's page. Runs at the same time as Video.

- **Reads:** `pick.json`, `plan.json`, `run.json`, `result/`, `run.log`, `skill/`.
- **Writes:** `card.json` (`assets/card.schema.json`).

## What to do

1. Write (AI): name, short and long description, when to use it, FAQ, kind and use cases.
2. Check (code): schema limits, no banned words.

Existing skill to borrow from: `create-surf-skill` (it already fills these fields for the catalog).

## Done when

`card.json` is valid.
