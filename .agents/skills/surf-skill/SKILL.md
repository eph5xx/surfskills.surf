---
name: surf-skill
description: Builds a batch of "skill of the day" cards for surfskills.surf, end to end and without stopping. Picks a never-featured skill, plans and runs a demo task in a locked-down agent sandbox, writes the card text, makes the preview video, and publishes the card with its date. Use when asked to build skill-of-the-day cards, fill the upcoming days, or run the card pipeline.
---

# Surf Skill: skill of the day

> All six steps are built. Publish only queues cards; moving them onto the site comes with the website track.

You are the orchestrator. You build cards one after another until the batch is done. You never do a step's work yourself.

## Rules

- **Never stop.** Don't ask the user anything and don't wait for approval. If something is unclear, make the safest choice, note it in the status log, and keep going.
- **One sub-agent per step.** Launch every step as a fresh sub-agent (in Claude Code, the Agent tool). It sees none of this session.
- **Small prompts.** Give each sub-agent only three absolute paths: its step file in `references/`, the card folder, and its output schema in `assets/`. Pick creates the card folder, so it gets `cards/` instead.
- **Check every output.** After a step, validate its JSON against its schema. Invalid output counts as a failure. After Plan, `node scripts/plan-check.mjs <card>` must also print `ok`. After Run, its reply must be `run: ok` and `run.json` must exist. After Card, `node scripts/card-check.mjs <card>` must print `ok`. After Video, its reply must start with `video: ok` and `node scripts/video-check.mjs <card>` must print `ok`. After Publish, its reply must be `published: YYYY-MM-DD` and `publish.json` must exist.
- **Long scripts in the background.** Run's `run-agent.mjs` takes up to 11 minutes and Video's `video-build.mjs` up to 25. Their sub-agents start them in the background and wait for them, so a tool-call timeout never cuts them short.

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
| 3. Run | [references/3-run/README.md](references/3-run/README.md) | `plan.json`, `skill/`, `inputs/` | `hosts.json`, `result/`, `run.log`, `run.jsonl`, `review/`, `run.json` |
| 4. Card | [references/4-card/README.md](references/4-card/README.md) | `pick.json`, `skill/` (and the repo README for a new collection) | `card.json` |
| 5. Video | [references/5-video/README.md](references/5-video/README.md) | `pick.json`, `plan.json`, `run.json`, `hosts.json`, `skill/SKILL.md`, `inputs/`, `review/` | `video/`, `video.json` |
| 6. Publish | [references/6-publish/README.md](references/6-publish/README.md) | `pick.json`, `card.json`, `video.json`, `video/` | media in R2, a dated `skill_queue` row in Supabase, `publish.json` |

Output schemas are in `assets/`: [pick](assets/pick.schema.json), [plan](assets/plan.schema.json), [run](assets/run.schema.json), [card](assets/card.schema.json), [video](assets/video.schema.json), [publish](assets/publish.schema.json).

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
- Run replies one of four ways:

  | Reply | Means | Do |
  | --- | --- | --- |
  | `run: ok` | Everything passed. | Continue with Card and Video. |
  | `failed: <why>` | A code check failed, the run timed out, or agy crashed. | Retry once, as above. |
  | `bad result: <why>` | The AI review failed the result. | Drop the card right away, without a retry, and log the reason. |
  | `blocked: <why>` | The lockdown self-test failed, agy isn't logged in, or its quota ran out. | Stop the batch. Keep the card (never drop it), log the reason, and say so in the summary. It resumes from Run next time. |

- Video replies one of three ways:

  | Reply | Means | Do |
  | --- | --- | --- |
  | `video: ok …` | A draft passed the checks and the review. | Continue with Publish once Card is done. |
  | `failed: <why>` | No draft passed in three rounds, or a capture, render or check failed. | Retry once, as above. A second failure drops the card: never publish a card without its video. |
  | `blocked: <why>` | agy isn't logged in or its quota ran out, or a video tool is missing. | Stop the batch. Keep the card, log the reason, and say so in the summary. It resumes from Video next time. |

- Publish replies one of three ways:

  | Reply | Means | Do |
  | --- | --- | --- |
  | `published: YYYY-MM-DD` | The card is queued for that day. | Count it as published and start the next card. |
  | `failed: <why>` | An input is invalid, the skill is already live, or an upload or insert failed. | Retry once, as above. |
  | `blocked: <why>` | The Supabase or wrangler login is missing, or the queue table doesn't exist. | Stop the batch. Keep the card, log the reason, and say so in the summary. It resumes from Publish next time. |

- Stop only when the batch is done, Pick finds no candidates left, or Run, Video or Publish replies `blocked:`.

## Status log

Append one line per step to `cards/status.log`: time, card, step, `done` / `failed` / `dropped`, and a short reason. (Where the real status table lives is still undecided.)

When the loop ends, print a short summary: cards published with their dates, cards dropped and why.
