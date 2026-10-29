# Step 5: Video

> Not implemented yet.

Turn the run's result into a ~10-second preview video and a cover image. Runs at the same time as Card.

- **Reads:** `pick.json`, `plan.json`, `run.json`, `result/`, `inputs/`.
- **Writes:** `video.json` (`assets/video.schema.json`), the video and cover in `video/`.

## What to do

1. Capture (code, container): turn the result into footage. A web page gets a scroll recording, text gets before and after, images get a slideshow (`plan.json` `deliverable.type`).
2. Storyboard (AI): the task title, then the result, then the skill's name.
3. Compose (AI, container): a HyperFrames page that follows the storyboard.
4. Render (code, container): the page becomes an MP4 and a cover image.
5. Check (code): about 10 seconds, no blank frames, under the size limit.

Existing skills to borrow from: `create-surf-video-v1`, `hyperframes-core`, `hyperframes-cli`.

## Done when

`video.json` is valid and passes the checks. No video means no card.
