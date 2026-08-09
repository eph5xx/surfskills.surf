# Video guide — scenario (step 3) + the single-treatment build (step 5)

The preview is a ~11s, silent, auto-looping "Command → Result" clip: the input as a
command, then the skill's **real run output** as the payoff. Throughline: **honest ·
glanceable · human** — show the real thing (a representative run, never a cherry-picked
hero), few words, big type, plain language a non-technical viewer gets at a glance.

## The four beats (the bundled template wires 1/2/4; you rebuild only beat 3)

| Beat | Window (~11s) | On screen |
| --- | --- | --- |
| 1 · Command | 0 → ~2.5s | `/<skill> <what to do>`, centered, large, warm background. Nothing else. |
| 2 · Dock | ~2.5 → 3.5s | Command shrinks to a bottom caption; the result starts to appear. |
| 3 · Result | ~3.5 → 10s | The **real output**, near full-bleed — it dominates the loop. |
| 4 · Loop | ~10 → 11s | Resolves on a **finished frame**, returns to the command. Seamless: t=end ≈ t=0. |

Payoff on screen by ~second 4. Author 1920×1080 @30fps; delivery is 1280×720, silent,
150–700 KB. `video.mjs finalize` handles the shelf pass + poster as a **local** review build
(`video/final/demo.mp4`).

## Choosing the treatment (step 3 picks exactly one)

Pick the **demo subject** first: something the viewer already knows — a well-known site,
repo, or product (surfskills itself works) — never an obscure mock or invented brand.

Pick the treatment from **what the skill DOES, not the artifact's file type**; don't chase
the prettiest idea. A doc artifact does not imply a doc-pan — if the skill's value is a
dialogue or a decision, stage that, not the document. The artifact-type defaults:

- Output is a **page / site / long document** → default to a slow **full-page pan/scroll**
  of the real artifact: it shows the whole output, and the motion reads as someone
  actually using it.
- Output is a **video** → light player UI (► + progress + `name.mp4` chip; timer must
  match the real clip length); a **report** → verdict/score, sections cascading in; a
  **UI** → the finished interface settling; a **diagram** → draws itself in; **data** →
  numbers counting up.
- The skill **transforms an input** (scrape, convert, extract) → beat 3 shows
  **input → output**: source screenshot → arrow → labeled result (e.g. storefront page →
  arrow → table with named columns) — never the extracted data alone; without the source
  the viewer can't tell what the skill did.
- The skill's value is **interaction / motion feel** → **interaction-capture**: a real built
  component handled on camera (drag, flick, mid-flight catch) as an inset on paper, with
  timed labels naming the physics as they fire.
- The skill **improves existing work** (polish, review, fix) → **before/after**: the same
  real component recorded pre/post fix, swapped sequentially (not side-by-side), a phase
  label + one real detail chip (e.g. the CSS that changed), resolving on the fixed frame.

For text-heavy content, stage discrete big-type panels that swap in time with staggered
reveals — **never pan a wall of small text past the viewport**; legibility beats density.

The affordance is one minimal, honest cue that makes the output read as *what it is*.
Resolve, don't cut.

## `steps.scenario` — write exactly this into run.json (step 3)

```json
"scenario": {
  "status": "draft",
  "commandLine": "/skill-name real-arg",   // the beat-1 line, confirmed wording
  "realOutputPlan": "what real output the run will produce and how it's captured (file/screenshot/clip)",
  "treatment": "short label",              // the ONE beat-3 treatment (e.g. "scrollpan"), per §choosing-the-treatment
  "beat3Concept": "how beat 3 presents the output",
  "affordance": "the type cue"
}
```

Set `"status": "approved"` only after the user says yes.

## Brand tokens (don't invent)

- Ink `#2A2C41` (text/dark fills) · Paper `#FCF9F5` (bg) · Sand `#F4EAE1` · **Coral `#DD6B4D`
  (the one hero accent)** · Amber `#F2B134` (tiny emphasis) · Slate `#3D5A80` (cool cards).
- Backgrounds ALWAYS warm — never pure `#FFFFFF`. **One dominant accent per frame.**
- Type is system stacks only — `--font-display` / `--font-body` / `--font-mono`, wired in the
  template. Nothing is downloaded or bundled, so a render never waits on a font. **Weight and
  size carry the hierarchy**: headlines heavy and large (700, tight line-height), body lighter
  and smaller. Don't add `@font-face` or a webfont link.
- Feel: premium paper, calm-to-confident, editorial. No OS window chrome, no techy-neon.

## Build contract — the rules that fail SILENTLY (lint/check won't catch them)

- `#root` is an explicitly sized 1920×1080 box; one **paused** GSAP timeline at
  `window.__timelines["main"]`; deterministic (no `Math.random`/`Date.now`, no `repeat:-1`),
  built synchronously.
- Animate **only** `opacity` + transforms (`x,y,scale,rotation`) — never
  `width/height/top/left/display`.
- An embedded `<video>` **must be a DIRECT child of `#root`** or it renders **black** with no
  warning. Framework owns playback (no `.play()`/`currentTime`; trim with `data-media-start`).
  Overlays (scrim/player UI) are sibling layers with higher z-index. Over shifting footage,
  keep text on a dark control scrim.
- Seamless loop: state at `t=duration` equals `t=0`; `tl.set(...)` transforms back to neutral
  while hidden (the template does this ~9.8s).

Dev loop, from `video/project/`:
`npx hyperframes lint` while iterating, then `npx hyperframes check` as the gate (it reruns
lint and audits runtime, layout, and contrast in one pass — don't chain a bare `lint` in front
of it, and don't use `validate`/`inspect`, which are deprecated aliases) → draft render →
**frame-check stills** (`ffmpeg -ss <t> -i renders/_draft.mp4 -frames:v 1 f.png` at ~1s/5s/8.5s/10.8s:
command reads, result visible **not black**, resolves finished, seam matches) → final:
`npx hyperframes render --fps 30 --quality high --output renders/main.mp4`.

## Authoring brief (one build)

Write one **self-contained** brief before authoring — whether you build beat 3 inline or
hand it to a single subagent (a subagent sees none of your conversation): the project dir
path, the treatment/concept/affordance from the scenario, the real output's location, the
beats + timings, the brand tokens, the build contract above, the render command, and a
"verify not black" self-check. Only beat 3 changes; the real output is fixed.

## Pre-ship checklist (each cost a real round once)

real typical output · command leads · resolves finished · timer honest & in sync · legible
over any footage · `<video>` direct child + frame-checked not black · seamless loop ·
deterministic · plain words, big type, one idea at a time · no panning walls of small text ·
no chrome/decoration · one accent, warm bg, brand fonts · **watched locally
(`video/final/demo.mp4`) and approved before `upload` sends it to the CDN**.
