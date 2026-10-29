# Step 2: Plan

> Not implemented yet.

Decide one short demo task for the skill, with sample inputs and a checklist that code can verify.

- **Reads:** `pick.json`, `skill/`.
- **Writes:** `plan.json` (`assets/plan.schema.json`) and sample files in `inputs/`.

## What to do

1. Read (AI): understand what the skill does, what it needs and what it produces.
2. Can we run it? (AI + code): if it needs a paid account, an API key or private data, stop and report "can't run". The card is dropped.
3. Pick a task (AI): one short task that shows the skill off in under 10 minutes.
4. Make inputs (AI): sample material for the task, saved in `inputs/`.
5. Define done (AI): the checks code will run on the result.

## Done when

`plan.json` is valid, and every file it names in `inputs/` exists.
