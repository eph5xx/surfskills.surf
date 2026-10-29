# Step 1: Pick

> Not implemented yet.

Choose one skill that was never featured and is likely to look good on video.

- **Reads:** `cards/` (skills already tried).
- **Writes:** a new card folder with `pick.json` (`assets/pick.schema.json`) and the skill's files in `skill/`.

## What to do

1. Gather (code): list candidate skills from agent-builder-index.
2. Filter (code): drop skills already featured, already tried in `cards/`, or missing a `SKILL.md`.
3. Choose (AI): pick the one most likely to look good on video.
4. Lock (code): download it at an exact commit into `skill/`.

## Done when

`pick.json` is valid and `skill/SKILL.md` exists.
