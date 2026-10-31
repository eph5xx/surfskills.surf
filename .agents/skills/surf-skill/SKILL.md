---
name: surf-skill
description: Builds a batch of "skill of the day" cards for surfskills.surf, end to end, and stops at the first problem for the owner to look at. Picks a never-featured skill, plans and runs a demo task in a locked-down agent sandbox, writes the card text, makes the preview video, and publishes the card with its date. Use when asked to build skill-of-the-day cards, fill the upcoming days, or run the card pipeline.
---

# Surf Skill: skill of the day

> All six steps are built. Publish writes each card into the catalog with its own future day; it goes live at midnight in Yerevan on that day. The site doesn't show the day yet.

You are the orchestrator. You build cards one after another until the batch is done or something goes wrong. You never do a step's work yourself and never open a step's files. Run scripts from this skill's folder.

## Rules

- **Stop at the first problem.** Anything other than an `ok:` reply with a passing check stops the batch. Log it, then tell the owner in the chat which card, which step and why. Don't ask the user anything while things are going fine.
- **Never retry, never rerun.** Don't launch a step again after it failed, and don't rerun a step that already finished. Only the owner decides that.
- **Never fix anything yourself.** No workarounds, no editing a card's files, no patching scripts. Report and stop.
- **One fresh sub-agent per step** (in Claude Code, the Agent tool). Its prompt is two absolute paths: the step skill's SKILL.md and the card folder. Pick gets only its SKILL.md.
- **Trust the check, not the reply.** A step passed only when it replied `ok:` and `node scripts/state.mjs check <card> <step>` prints `ok`.
- **Log every step:** `node scripts/state.mjs log <card> <step> <done|failed|dropped|blocked> "<why>"`. Use `-` as the card for Pick before it has one.
- **Owner-only commands.** `node scripts/state.mjs resume <card>` and `node scripts/state.mjs skip <card>` clear a stop. Run them only when the owner asks.

## Input

Batch size: how many cards to publish. Default 7.

## Steps

Each step is its own skill, in a sibling folder of this one.

1. Pick: [surf-skill-pick](../surf-skill-pick/SKILL.md)
2. Plan: [surf-skill-plan](../surf-skill-plan/SKILL.md)
3. Run: [surf-skill-run](../surf-skill-run/SKILL.md)
4. Card: [surf-skill-card](../surf-skill-card/SKILL.md)
5. Video: [surf-skill-video](../surf-skill-video/SKILL.md)
6. Publish: [surf-skill-publish](../surf-skill-publish/SKILL.md)

## Loop

Until the batch has enough published cards:

1. Run `node scripts/state.mjs next`. It prints `pick`, a card folder and the steps to launch now, or `stopped: …`.
2. On `stopped: …`, stop the batch and print that line to the owner.
3. Otherwise launch the steps. When it lists two (Card and Video), launch both at the same time.
4. Check and log each one. If any isn't `ok`, stop (see Replies). Otherwise go back to 1.

## Replies

Every step replies with one of four words. Lines after the first are notes for the log.

| Reply | Do |
| --- | --- |
| `ok: …` | Run the check. If it prints `ok`, log `done` and go on. Pick's reply names the new card folder; Publish's names the card's date. If the check fails, log `failed` and stop. |
| `failed: …` | Log `failed` and stop. |
| `drop: …` | Log `dropped` and stop. |
| `blocked: …` | Log `blocked` and stop. |
| anything else, or the sub-agent crashed | Log `failed` and stop. |

When Card and Video run together and one stops, let the other finish and log it too, then stop.

## End

Stop when the batch is done or anything stopped it. Print, in plain words:

- the cards published, with their dates;
- if the batch stopped: the card, the step, and the step's reply and notes, word for word, so the owner can look at it.
