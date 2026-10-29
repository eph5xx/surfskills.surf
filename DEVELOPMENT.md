# Development

## Idea: Skill of the Day

### Goal

Create a Twitter account and post a skill of the day every day.

The ideal scenario is a daily process that builds the skill card and pushes the new post to Twitter, working end-to-end every day without my participation.

The point is that the website works well and correctly even if I don't participate in card creation.

### What the website should do

- Generate and add a new skill every day, automatically.
- Prepare the full card for the skill, including a video preview and descriptions. This should be done with AI.

### Decisions (2026-10-29)

These decisions replace anything below that conflicts with them.

- **Cards are built locally.** A local skill builds cards in a weekly batch (for example 7 at a time) using my own AI subscription. Building cards uses no paid API key and no server.
- **Candidate pick is part of the skill.** Picking candidates with agent-builder-index is the skill's first step. The candidate tool doesn't need its own deployment for now.
- **No queue table.** Skills of the day go into one table, each with its date. A skill whose date hasn't come yet stays hidden on the site. There is no separate queue.
- **Website track stays as planned.** Daily pages (`/day/YYYY-MM-DD`), a "skill of the day" homepage, an archive of past days, and date labels for existing skills.
- **No X auto-posting for now.** The X account, posting and author tagging are on hold. The site is the only place a new skill appears.
- **Run uses agy's sandbox on the Mac, not a container.** The demo run uses the Antigravity CLI (`agy`) inside its own macOS sandbox with session-only lockdown settings, approved hosts only, and a self-test before each batch. This replaces the throwaway containers below.
- **Alerts by email, kept light.** I want an alert when only a few dated skills are left, or when something breaks. Email or something just as simple, with no heavy setup. One option is a small Cloudflare cron that counts the remaining future-dated skills and sends an email.
### Pipeline decomposition

1. **Candidate generation**: pick the right candidate.
2. **Card creation**: make a good card for the chosen candidate.

There will be a separate crawler/indexer for this.

### Candidate generation tool

I already have a tool for candidate generation: https://github.com/foglight-labs/agent-builder-index

- It has no interface yet.
- It isn't deployed yet.

### Storage

- Bring back Supabase for this project.
- Store skill files in R2, with data in Supabase Postgres.

### Infrastructure

- Long-running jobs run on a Rust-based worker, deployed with Coolify on Hetzner.

### Interface

- Adapt the interface to match the new skill of the day idea.
- Later, label existing skills with a date each.

### Claude-suggested ideas

These were suggested by Claude and accepted by me.

- **Build cards ahead of time.** Keep a few finished cards in a queue. The daily job only posts the next one, so a failed build doesn't mean a missed day.
- **Video is the hardest part.** A real preview means running the skill in a sandbox and recording it. Every card needs a video. If the video fails, the card is dropped and the next one in the queue goes out.
- **Failure alerts.** Get notified when the pipeline breaks or the queue runs low. Have a pause button.
- **X API.** Check X's current pricing, limits and rules for automated accounts before building.
- **No repeats.** Never feature the same skill twice.
- **Fixed schedule.** Pick one posting time and timezone.
- **Daily pages.** Give each day its own page, for example `/day/2026-10-25`.
- **Tag the author.** Tag the skill's author in each tweet so they're likely to repost.
- **Cost limit.** Set a cost limit per card.

### Parallel tracks

These tracks can be worked on independently.

1. **Website**
   - Scope: daily pages (`/day/YYYY-MM-DD`), a "skill of the day" homepage, an archive of past days.
   - Done when: the site shows a new day's card without a manual deploy.
2. **Candidate pick**
   - Scope: deploy the candidate tool, pick the next skill, never repeat a skill.
   - Done when: it picks a week of candidates on its own, with no repeats and no bad picks.
3. **Card text generation**
   - Scope: turn a candidate into a title, description and tweet text with AI, within the cost limit.
   - Done when: you approve 8 of 10 sample cards without edits.
4. **Video generation**
   - Scope: run the skill in a sandbox and record a preview video.
   - Done when: most cards get a usable video within the time and cost limits. A card whose video fails is dropped, never posted without one.
5. **Auto-posting to X**
   - Scope: post on a fixed schedule, tag the author, alert on failure, pause button. Check X API pricing and rules first.
   - Done when: a test account posts every day for 7 days without you, and you get an alert when something breaks.

### Card pipeline sketch

> **Never reviewed.** Claude suggested this and nobody has reviewed it, so it can't be implemented this way. It's just how it could work.

A local script makes cards in batches (for example, 7 at a time) and fills the queue. It doesn't have to be fully hands-off, as long as it really works.

- Each step saves its output. The script only runs what's missing or failed.
- Editing a step's output reruns everything after it and keeps everything before it.
- Card and Video both start once Run is done.
- A card that fails a step twice is dropped, and the next candidate takes its place.
- Strangers' code runs only in throwaway containers on the laptop. They hold only the AI key. Storage and database keys stay with the script and never reach the agent.

Each piece has one job and one output. The tag says who does it: code, AI, or AI in a container. Every AI piece is followed by a code check, so a bad output stops early instead of reaching the site.

1. **Pick**
   - 1.1 Gather (code): list candidate skills → candidate list.
   - 1.2 Filter (code): drop skills already featured or missing a SKILL.md → shortlist.
   - 1.3 Choose (AI): pick the skill most likely to look good on video → one skill.
   - 1.4 Lock (code): download that skill at an exact version → skill files.
2. **Plan**
   - 2.1 Read (AI): describe what the skill does, what it needs and what it produces → skill profile.
   - 2.2 Can we run it? (AI + code): drop skills that need paid accounts or private data. For example, Supermemory needs its own API key → yes or no.
   - 2.3 Pick a task (AI): one short task that shows the skill off in under 10 minutes → task prompt.
   - 2.4 Make inputs (AI): sample material for the task, like an AI-sounding paragraph for Humanizer → input files.
   - 2.5 Define done (AI): what the result must contain, like "a page that opens" or "the text changed" → checklist.
3. **Run**
   - 3.1 Set up (code): fresh container with the agent, the skill and the inputs → ready container.
   - 3.2 Do it (AI, container): the agent does the task, with a time limit → work folder and log.
   - 3.3 Collect (code): copy out only the result files → result.
   - 3.4 Check (code): compare the result with the checklist → pass or fail.
4. **Card**
   - 4.1 Write (AI): title, description, tweet → card text.
   - 4.2 Check (code): length limits, no banned words, author handle found → pass or fail.
5. **Video**
   - 5.1 Capture (code, container): turn the result into footage. A web page gets a scroll recording, text gets before and after, images get a slideshow → raw footage.
   - 5.2 Storyboard (AI): 10 seconds of title, then the result, then the skill's name → storyboard.
   - 5.3 Compose (AI, container): a HyperFrames page that follows the storyboard → composition.
   - 5.4 Render (code, container): the page becomes an MP4 and a cover image → video.
   - 5.5 Check (code): about 10 seconds long, no blank frames, under the size limit → pass or fail.
6. **Publish**
   - 6.1 Approve (you): look at the card and video → yes or no.
   - 6.2 Upload (code): video and cover go to storage → links.
   - 6.3 Queue (code): the card is added with its date → queue row.

A status table shows the pipeline: one row per card, one column per step (waiting, running, done or failed), plus the key outputs (showcase task, title, tweet, video link, post date). Where the table lives is undecided: a Supabase table, local folders with a local page, or Airtable.

### Access

Setup work uses command-line logins instead of pasted keys. All three are logged in on my machine (checked 2026-10-27):

- **GitHub** (`gh`): logged in.
- **Cloudflare** (`wrangler`): logged in and can manage R2. An R2 bucket `surfskills-media` already exists.
- **Supabase** (`supabase`): logged in. A `surfskills` project already exists but isn't linked to this repo yet. Run `supabase link` before running migrations.

A login acts as the whole account, while a key can be limited to one project. So use logins for setup and keys for anything that runs on its own:

- **Website**: reads R2 through a Cloudflare binding, so it needs no R2 key. The Supabase URL and keys can be read with `supabase projects api-keys`.
- **Rust worker**: runs on a server, not as me, so it needs real keys. The R2 access key has to be made in the Cloudflare dashboard, because `wrangler` can't create one.

### Keys needed

No key files exist locally yet. The logins above cover setup. These keys are for things that run on their own.

1. **Supabase** (website, candidate pick, card text): project URL, publishable key (site reads), secret key (worker writes).
2. **Cloudflare R2** (card files and videos): account ID, access key ID, secret access key, bucket name.
3. **GitHub token** (candidate pick, card text): read-only token for repo metadata and cloning. The candidate tool already expects `GITHUB_TOKEN`.
4. **AI model key** (card text, maybe video): for example an Anthropic API key.
5. **X API** (auto-posting): consumer key and secret, access token and secret for the bot account. Likely needs a paid tier.
6. **Rust worker deploy** (all background jobs): Coolify API token, Coolify deploy webhook, GHCR read token. See the candidate tool's `DEPLOY.md`.

Still open:

- **Video sandbox** key: depends on which sandbox the video track picks.
- **Alerts**: for example a Telegram bot token.

To start, the website and candidate pick tracks only need keys 1–3. The logins cover most of that. The R2 access key is the only one to make by hand, and only the worker needs it.
