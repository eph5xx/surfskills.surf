---
name: surf-skill-publish
description: Step 6 of the surf-skill pipeline. Uploads a card's video and cover to R2 and queues the card with its date in Supabase's skill_queue table. Use when the surf-skill orchestrator launches the Publish step for a card folder, or when asked to publish or requeue one card.
---

# Step 6: Publish

Upload the card's video and cover, and queue the card with its date. Nothing goes live in this step: the card waits in Supabase's private `skill_queue` table until the website track moves queued cards onto the site.

- **Reads:** `pick.json`, `card.json`, `video.json`, `video/`.
- **Writes:** the video and cover in R2, one row in `skill_queue`, and last `publish.json` ([publish.schema.json](assets/publish.schema.json)).

You are the publisher: one agent, one card. The script does all of it. There is no approval wait.

Run the script from this skill's folder.

## What to do

1. **Publish (code).** Run `node scripts/publish.mjs <card>`. It checks the inputs, picks the date, uploads the media, queues the row and writes `publish.json`.
2. **Reply.** Reply with its last line.

To see what it would do without writing anything, add `--dry-run`. It prints the rows, the date and the R2 names, and makes no uploads, no inserts and no `publish.json`.

## What the script does

- **Checks.** `card.json` and `video.json` must match their schemas. The video and cover must sit inside the card folder: the video an `.mp4` under 5 MB, the cover a `.jpg`, `.png` or `.webp` under 2 MB. The skill must not be live on the site yet.
- **Collection.** If the repo isn't on the site, it builds a collection row from `card.collection` and GitHub (author, license, stars, last push, homepage). Its `skills` list holds every skill in Pick's copy of the repo at `pick.commit`. If the repo is already on the site, `card.collection` is ignored.
- **Rows.** The skill row and collection row match the live ones field for field (install sentences, `reference_file`, empty `tools` and `related_slugs`), so going live is a plain insert.
- **Media.** Uploaded to the `surfskills-media` bucket as `skills/<slug>-demo-<sha8>.<ext>`, with a year-long immutable cache header. The hash is of the file, so a rerun reuses the same name and skips files already there. Both URLs must answer 200 before the row is written.
- **Date.** The first day from tomorrow (UTC) with no queue row. If another run takes that day first, it moves on to the next free one.
- **Already queued.** The row is updated in place and keeps its date, so a card can be fixed before its day.
- **Keys.** Writes use the Supabase secret key: `SUPABASE_SECRET_KEY` from the environment or `.dev.vars`, else fetched from the Supabase CLI login and kept in memory. R2 uploads use the `wrangler` login.

## Rules

- Don't edit `card.json`, `video.json` or `video/`. A bad input is a `failed:` for the step that wrote it.
- Don't write to Supabase or R2 any other way, and never print the secret key.

## Reply

The script's last line:

| Reply | When |
| --- | --- |
| `ok: published YYYY-MM-DD` | The card is queued for that day. |
| `failed: <why>` | An input is missing or invalid, the skill is already live, an upload or insert failed. |
| `blocked: <why>` | The Supabase or wrangler login is missing, or the `skill_queue` table doesn't exist. |

## Done when

`publish.mjs` printed `ok: published` and `publish.json` exists.
