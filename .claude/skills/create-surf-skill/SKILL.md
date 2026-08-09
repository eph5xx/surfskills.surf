---
name: create-surf-skill
description: Turn a GitHub agent-skill repo into a live surfskills directory page — enrich the repo, draft the skill card, build the preview video, and publish to Supabase. Use when the user asks to add/onboard a skill to surfskills (create a surf skill), or pastes a GitHub skill/collection URL to publish.
metadata:
  version: 3.3.0
---

# Create a Surf Skill

You are the orchestrator that takes a GitHub skill repo URL to a live catalog page in six
steps. Scripts do everything deterministic; you do exactly three judgment jobs (card,
scenario, video authoring) and stop at four user gates (card, scenario, video, publish).

Run scripts with Node (no install), paths relative to the **repo root** (this skill ships
inside the site repo, so its `.env`/`.dev.vars` and wrangler auth are right here):

```
node .claude/skills/create-surf-skill/scripts/<script>.mjs <args>         # enrich, publish
node .claude/skills/create-surf-skill/scripts/video/<script>.mjs <args>   # video, backfill-posters
```

Everything video is grouped under a `video/` subfolder on both sides: the guide in
`references/video/`, the scripts + preview template in `scripts/video/`. That script folder
carries its own NOTICE — the template is Apache-2.0, the rest of the skill is MIT.

## Run state & resume

Each skill gets its **own folder**, keyed by the full skill slug:
`.fill/<owner>__<repo>__<pageSlug>/` holds `run.json` plus its `repo/` checkout and `video/`
build. Onboarding a second skill from the same repo never touches the first. Every step reads
and updates that folder's `run.json`, and takes the `<pageSlug>` as its last argument (enrich
prints it as `run.skill`).

**On every start: if the skill's `run.json` exists, read it and continue from the first step that
is not `done`/`approved`.** Don't redo approved steps; don't re-ask answered questions. To redo a
step deliberately, reset its `status` and go from there.

## Feedback log (append as you go)

Whenever the user corrects a draft, overrides a decision, or states a preference — at any
step — append it **in the same turn** as a dated bullet to
`feedback/<owner>__<repo>__<pageSlug>.md` at the repo root (create the file on the
first item; append-only, never rewrite). One file per onboarded skill. The notes are
local review context, not repo content — never commit them. Don't wait to be asked;
the log is how future runs get smarter.

## Step 1 — Enrich (scripts, no LLM)

```
node .claude/skills/create-surf-skill/scripts/enrich.mjs <repoUrl> [<pageSlug>]
```

GitHub metadata + shallow clone + SKILL.md discovery + per-skill facts + a live-catalog
probe (is this collection already published, with which sibling skills?) → `steps.enrich`.
One discovered skill is auto-picked and its folder created. If several are discovered, enrich
lists them and exits — re-run with the `<pageSlug>` you want; each choice gets its own folder.

## Step 2 — Card: collection + skill (you draft → user approves)

Read `repo/` (README + the chosen skill's directory) and `steps.enrich.live`, then draft one
`steps.card` with **two blocks**, each filling its own page:

- **`collection`** — the collection landing page (`/s/<owner>/<repo>`): name, short
  description, **What it does**, **When to use it**, **FAQ**. Follow
  [`references/collection/card-guide.md`](references/collection/card-guide.md) (the hub) and its
  sub-guides. The collection row is **shared across every sibling skill page** — follow the
  guide's mirror-the-live-row rule.
- **`skill`** — the skill page (`/s/<owner>/<repo>/<pageSlug>`): name, short description, **What
  it does**, **When to use it**, **FAQ**, and a curated **Pairs well with**. Follow
  [`references/skill/card-guide.md`](references/skill/card-guide.md) (the hub) and its
  sub-guides.

Both blocks share one voice — [`references/shared/voice.md`](references/shared/voice.md). The
long-form sections are independent, so draft them in parallel (a subagent per sub-guide across
both blocks, handed that guide + `shared/voice.md` + the repo facts). Assemble one `steps.card`
(status `draft`), show the user the whole page's copy for both pages, iterate until they
approve, then set status `approved`. **Gate: do not proceed without approval.**

## Step 3 — Video scenario (you draft → user approves)

Follow [`references/video/guide.md`](references/video/guide.md) (§scenario). Decide the
command line, what real output the run will show, and the **one** beat-3 treatment — picked
per guide §choosing-the-treatment from what the skill does, not the artifact's file type.
`commandLine` and `realOutputPlan` must describe a real end-to-end skill invocation — what
the skill's own users actually run — and the planned artifact is the skill's end product. Write
`steps.scenario` (status `draft`), show the user, iterate, set `approved` on their yes.
**Gate: do not proceed without approval.**

## Step 4 — Run the skill (together or separately)

The video shows a **real run output — never fabricate it.** Compose the run prompt: install
the skill from the repo into a scratch project, then invoke it per `scenario.commandLine` in
a real agent session and let the skill drive the whole run, keeping the output artifact.
**Never shortcut to the skill's internal scripts or engines.** The prompt **must end with a
standalone final line** telling the runner to save every resulting artifact into the
**`video/real-run`** folder, giving its absolute path
(`<repo root>/.fill/<owner>__<repo>__<pageSlug>/video/real-run/`). Save the prompt to
`steps.run.prompt`. **Always print it in a fenced block so the user can copy it**, then ask:
run it here, or will they run it separately? Capture the resulting artifact(s) there, note
what landed in `steps.run.outputNote`, set status `done`.

## Step 5 — Video: author → build a reviewable clip → (approval) → CDN

```
node .claude/skills/create-surf-skill/scripts/video/video.mjs stage <owner/repo> <pageSlug>
```

Author beat 3 of the staged `.fill/<owner>__<repo>__<pageSlug>/video/project/` around the real
output (the run folder's build dir, not the skill's own `scripts/video/`), working from **one
self-contained brief** (see the video guide §authoring-brief) — inline or via a single
subagent. Render `project/renders/main.mp4` and frame-check the stills (video guide dev
loop). Then build the delivery clip — **locally, nothing uploaded yet**:

```
node .claude/skills/create-surf-skill/scripts/video/video.mjs finalize <owner/repo> <pageSlug>
```

→ 720p mp4 + poster jpg in `video/final/` (`demo.mp4` / `poster.jpg`), `steps.video`
status `built`. Finalize refuses a near-black render (hard stop before review); surface any
off-spec warning to the user.

**Gate: the user approves the clip before it goes to the CDN.** Point them at
`video/final/demo.mp4` to watch, relay the spec + any warnings, and iterate (re-author +
re-`finalize`) until they say yes. Only then push it to the CDN — this is the immutable,
outward-facing step:

```
node .claude/skills/create-surf-skill/scripts/video/video.mjs upload <owner/repo> <pageSlug>
```

→ uploads the approved mp4 + poster to the R2 bucket via wrangler, live under
`<MEDIA_BASE_URL>/skills/…` — full URLs recorded in `steps.video` (status
`done`). Uploaded filenames are immutable; re-uploading auto-bumps to `-v2`. The CDN edge
may serve a cached 404 for the mp4 for a few minutes right after upload — the object is in
the bucket; wait it out rather than re-uploading.

## Step 6 — Publish to Supabase (one approval)

```
node .claude/skills/create-surf-skill/scripts/publish.mjs --review <owner/repo> <pageSlug>
```

Show the user the field-level diff + validation. **Gate: on their explicit yes** (this
writes to the live site):

```
node .claude/skills/create-surf-skill/scripts/publish.mjs <owner/repo> <pageSlug>
```

Upserts the collection + skill rows (idempotent, live immediately — the media is already
on the CDN, nothing needs a deploy). Report the read-back row and the verify URL
(`/s/<owner>/<repo>/<pageSlug>`).

## Notes

- Nothing deployment-specific is hardcoded. Scripts read `.env` + `.dev.vars` at the repo
  root (both gitignored): `PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` for the catalog,
  `MEDIA_BASE_URL` (public CDN origin) + `MEDIA_R2_BUCKET` (the bucket wrangler writes to)
  for previews. A missing key is named in the error.
- Media uploads run `npx wrangler … --remote` from this repo (auth = `wrangler login` here,
  or CLOUDFLARE_API_TOKEN).
- Working state lands at the repo root: `.fill/` (run folders) and `feedback/` (the
  per-run notes above). Neither belongs in a commit — leave them out when staging.
- To debug, open the skill folder's run.json: the first step whose data looks wrong is the one to redo.
- `scripts/video/backfill-posters.mjs` is a side utility, outside the six steps: it regenerates
  `preview_image` for catalog rows that have a `preview_video` but no poster (build → review →
  upload → set-db). Reach for it only when asked to fix an existing row's poster.
- The homepage featured showcase (`src/data/featured-skills.ts`) is hand-curated —
  never touched here.
