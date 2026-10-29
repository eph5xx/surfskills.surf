# Step 6: Publish

> Not implemented yet.

Put the finished card on the site with its date.

- **Reads:** `pick.json`, `card.json`, `video.json`, `video/`.
- **Writes:** no handoff file. The output is the dated row in Supabase.

## What to do

1. Upload (code): video and cover go to R2.
2. Date (code): the next day that has no skill yet.
3. Save (code): add the skill row with its date. Add the collection row too if the repo isn't on the site yet.

## No approval wait

Don't wait for a human. A card dated in the future stays hidden on the site until its day, so it can be reviewed and pulled before then.

Existing skill to borrow from: `publish-surf-skill`. It asks for approval before writing, and this step must not.

## Done when

The row exists with its date, and the video and cover links work.
