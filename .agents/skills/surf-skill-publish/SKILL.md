---
name: surf-skill-publish
description: Step 6 of the surf-skill pipeline. Uploads a card's video and cover to R2 and writes the card into Supabase's skills table with its own future day. Use when the surf-skill orchestrator launches the Publish step for a card folder, or when asked to publish or reschedule one card.
---

# Step 6: Publish

Upload the card's video and cover, and write the card into the catalog with its day. Nothing goes live in this step: each skill has its own `day` (one skill per day), and the public read policy hides it until midnight in Yerevan on that day.

- **Reads:** `pick.json`, `card.json`, `video.json`, `video/`.
- **Writes:** the video and cover in R2, one row in `skills` (plus one in `collections` for a new repo), and last `publish.json` ([publish.schema.json](assets/publish.schema.json)).

You are the publisher: one agent, one card. The script does all of it. There is no approval wait.

Run the script from this skill's folder.

## What to do

1. **Publish (code).** Run `node scripts/publish.mjs <card>`. It checks the inputs, picks the day, uploads the media, writes the rows and writes `publish.json`.
2. **Reply.** Reply with its last line.

To see what it would do without writing anything, add `--dry-run`. It prints the rows, the day and the R2 names, and makes no uploads, no inserts and no `publish.json`.

## What the script does

- **Checks.** `card.json` and `video.json` must match their schemas. The video and cover must sit inside the card folder: the video an `.mp4` under 5 MB, the cover a `.jpg`, `.png` or `.webp` under 2 MB. The skill must not be live yet (its day must not be today or earlier).
- **Collection.** If the repo isn't in the catalog (live or scheduled), it builds a collection row from `card.collection` and GitHub (author, license, stars, last push, homepage) and inserts it. Its `skills` list holds every skill in Pick's copy of the repo at `pick.commit`. Existing collections are never updated, and `card.collection` is ignored for them. A collection shows on the site once one of its skills is live.
- **Rows.** The skill and collection rows match the live ones field for field (install sentences, `reference_file`, empty `tools` and `related_slugs`). The skill row also gets `day` and `created_at` set to midnight of that day in Yerevan, so "New" and "Newest" count from go-live.
- **Media.** Uploaded to the `surfskills-media` bucket as `skills/<slug>-demo-<sha8>.<ext>`, with a year-long immutable cache header. The hash is of the file, so a rerun reuses the same name and skips files already there. Both URLs must answer 200 before the row is written.
- **Day.** The first day after today (Yerevan time) that no skill holds. If another run takes that day first, it moves on to the next free one.
- **Already scheduled.** The row is updated in place and keeps its day, so a card can be fixed before its day.
- **Keys.** Reads and writes use the Supabase secret key, which sees scheduled rows: `SUPABASE_SECRET_KEY` from the environment or `.dev.vars`, else fetched from the Supabase CLI login and kept in memory. R2 uploads use the `wrangler` login.

## Rules

- Don't edit `card.json`, `video.json` or `video/`. A bad input is a `failed:` for the step that wrote it.
- Don't write to Supabase or R2 any other way, and never print the secret key.

## Reply

The script's last line:

| Reply | When |
| --- | --- |
| `ok: published YYYY-MM-DD` | The card is scheduled for that day. |
| `failed: <why>` | An input is missing or invalid, the skill is already live, an upload or insert failed. |
| `blocked: <why>` | The Supabase or wrangler login is missing, or `skills` has no `day` column yet. |

## Done when

`publish.mjs` printed `ok: published` and `publish.json` exists.
