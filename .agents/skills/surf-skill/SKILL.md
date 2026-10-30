---
name: surf-skill
description: Builds a batch of "skill of the day" cards for surfskills.surf, end to end and without stopping. Picks a never-featured skill, plans and runs a demo task in a locked-down agent sandbox, writes the card text, makes the preview video, and publishes the card with its date. Use when asked to build skill-of-the-day cards, fill the upcoming days, or run the card pipeline.
---

# Surf Skill: skill of the day

> All six steps are built. Publish only queues cards; moving them onto the site comes with the website track.

You are the orchestrator. You build cards one after another until the batch is done. You never do a step's work yourself and never open a step's files. Run scripts from this skill's folder.

## Rules

- **Never stop.** Don't ask the user anything. If something is unclear, make the safest choice, log it, and keep going.
- **One fresh sub-agent per step** (in Claude Code, the Agent tool). Its prompt is two absolute paths: the step's README and the card folder. Pick gets only its README.
- **Trust the check, not the reply.** A step passed only when it replied `ok:` and `node scripts/state.mjs check <card> <step>` prints `ok`.
- **Log every step:** `node scripts/state.mjs log <card> <step> <done|failed|dropped|blocked> "<why>"`. Use `-` as the card for Pick before it has one.

## Input

Batch size: how many cards to publish. Default 7.

## Steps

1. [Pick](references/1-pick/README.md)
2. [Plan](references/2-plan/README.md)
3. [Run](references/3-run/README.md)
4. [Card](references/4-card/README.md)
5. [Video](references/5-video/README.md)
6. [Publish](references/6-publish/README.md)

## Loop

Until the batch has enough published cards:

1. Run `node scripts/state.mjs next`. It prints `pick`, or a card folder and the steps to launch now.
2. Launch them. When it lists two (Card and Video), launch both at the same time.
3. Check and log each one, then go back to 1.

## Replies

Every step replies with one of four words. Lines after the first are notes for the log.

| Reply | Do |
| --- | --- |
| `ok: …` | Go on. Pick's names the new card folder; Publish's names the card's date. |
| `failed: …` | Retry once in a new sub-agent. A second failure drops the card. A failed check counts as `failed:`. |
| `drop: …` | Drop the card now, without a retry. |
| `blocked: …` | Stop the batch. Keep the card; it resumes next time. |

## End

Stop when the batch is done or a step replies `blocked:`. Print the cards published with their dates, the cards dropped and why, and any `blocked:` reason.
