---
name: surf-skill
description: Builds a batch of "skill of the day" cards for surfskills.surf, end to end and without stopping. Picks a never-featured skill, plans and runs a demo task in a throwaway container, writes the card text, makes the preview video, and publishes the card with its date. Use when asked to build skill-of-the-day cards, fill the upcoming days, or run the card pipeline.
---

# Surf Skill: skill of the day

> Steps 1–2 (Pick, Plan) are built. Steps 3–6 are scaffolds: each says what it must do, but none is implemented yet.

You are the orchestrator. You build cards one after another until the batch is done. You never do a step's work yourself.

## Rules

- **Never stop.** Don't ask the user anything and don't wait for approval. If something is unclear, make the safest choice, note it in the status log, and keep going.
- **One sub-agent per step.** Launch every step as a fresh sub-agent (in Claude Code, the Agent tool). It sees none of this session.
- **Small prompts.** Give each sub-agent only three absolute paths: its step file in `references/`, the card folder, and its output schema in `assets/`. Pick creates the card folder, so it gets `cards/` instead.
- **Check every output.** After a step, validate its JSON against its schema. Invalid output counts as a failure. After Plan, `node scripts/plan-check.mjs <card>` must also print `ok`.

## Input

- Batch size: how many cards to publish. Default 7.

## Card folder

One folder per card in `cards/` at the project root, named `<owner>__<repo>__<skill>`. Pick creates it. All later steps read and write inside it. Any card folder, published or dropped, counts as featured, so Pick never picks that skill again.

`cards/.pick/` is Pick's cache: the daily candidate pools and the downloaded repos. It is not a card.

## Steps

| Step | Instructions | Reads | Writes |
| --- | --- | --- | --- |
| 1. Pick | [references/1-pick/README.md](references/1-pick/README.md) | trending lists, catalog, `cards/` | a new card folder with `pick.json`, `skill/` |
| 2. Plan | [references/2-plan/README.md](references/2-plan/README.md) | `pick.json`, `skill/` | `plan.json`, `inputs/` |
| 3. Run | [references/3-run.md](references/3-run.md) | `plan.json`, `skill/`, `inputs/` | `run.json`, `result/`, `run.log` |
| 4. Card | [references/4-card.md](references/4-card.md) | `pick.json`, `plan.json`, `run.json`, `result/`, `run.log`, `skill/` | `card.json` |
| 5. Video | [references/5-video.md](references/5-video.md) | `pick.json`, `plan.json`, `run.json`, `result/`, `inputs/` | `video.json`, `video/` |
| 6. Publish | [references/6-publish.md](references/6-publish.md) | `pick.json`, `card.json`, `video.json`, `video/` | a dated row in Supabase |

Output schemas are in `assets/`: [pick](assets/pick.schema.json), [plan](assets/plan.schema.json), [run](assets/run.schema.json), [card](assets/card.schema.json), [video](assets/video.schema.json).

## Loop

Until the batch has enough published cards:

1. Launch Pick. It creates a new card folder.
2. Launch Plan, then Run.
3. Launch Card and Video **at the same time**, as two parallel sub-agents.
4. When both are done, launch Publish.

**Resume.** If a card folder already has some outputs, start from the first missing one. If a file was edited after a later file was written, rerun from that step.

## Failures

- A failed step is retried once, in a new sub-agent.
- A second failure drops the card. Mark it dropped and start a new card from Pick.
- If Plan replies `can't run: <reason>` (for example the skill needs a paid account), drop the card right away, without a retry, and log the reason. Plan writes no files in that case.
- Stop only when the batch is done or Pick finds no candidates left.

## Status log

Append one line per step to `cards/status.log`: time, card, step, `done` / `failed` / `dropped`, and a short reason. (Where the real status table lives is still undecided.)

When the loop ends, print a short summary: cards published with their dates, cards dropped and why.
