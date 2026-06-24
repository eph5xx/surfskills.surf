# How-it-works step clips (HyperFrames source)

Source for the three looping demo clips on the homepage hero "How it works" section
([`src/components/WhatIsIt.astro`](../../src/components/WhatIsIt.astro)). Brand-matched to
the goldenhour theme — see [`design.md`](./design.md).

- `compositions/step-1-discover.html` — Find the right skill
- `compositions/step-2-paste.html` — Paste it into your agent
- `compositions/step-3-result.html` — Get the result
- `fonts/` — Onest + Bricolage Grotesque (variable woff2), embedded at render time

## Re-render + publish to the site

```bash
# from this directory
npx hyperframes lint . && npx hyperframes inspect .

for c in step-1-discover step-2-paste step-3-result; do
  npx hyperframes render . -c compositions/$c.html -q high -o renders/$c.mp4
done

# export web-ready mp4 (+faststart) and a first-frame poster into the site
cd ../..                       # website root
for c in step-1-discover step-2-paste step-3-result; do
  ffmpeg -y -i media/how-it-works/renders/$c.mp4 -c copy -movflags +faststart public/how/$c.mp4
  ffmpeg -y -ss 0 -i public/how/$c.mp4 -frames:v 1 -q:v 3 public/how/$c.jpg
done
```

`renders/` is gitignored; the shipped clips live in `public/how/` and are committed.
Each composition is a single-scene, seamless loop (first frame == last frame). Edit one
by rendering at `-q draft` and extracting frames with ffmpeg to preview.
