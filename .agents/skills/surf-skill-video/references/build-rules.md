# Video: build rules

The rules the author's part of the video must follow. `video-build.mjs` sends this whole file to the author AI, and `video-check.mjs` checks every rule marked **(checked)**. Keep the three in sync.

## Where your part goes

- Your markup goes inside `<div id="result">`: a 1920×1080 box, `position:absolute`, `overflow:hidden`. Place your elements with `position:absolute` and pixel values.
- The frame shows `#result` at 2.85 s and hides it at 9.0 s. You never fade out or reset anything yourself.
- Keep everything that matters inside the middle: the tile crops the edges a little, and the command caption covers the bottom 140 px.

## Markup

- Plain HTML and inline SVG only. **(checked)** No `script`, `style`, `link`, `meta`, `iframe`, `object`, `embed`, `form`, `input`, `button`, `video`, `audio`, `canvas`, `template` or `foreignObject` tags, no `on…=` handlers, no HTML comments, no `srcset`.
- **(checked)** `src` and `href` point only at files in `media/` that exist (or at `#id` inside an SVG). No URLs, no `data:` or `javascript:` links.
- **(checked)** Don't reuse the frame's ids: `root`, `result`, `command`, `command-inner`, `caret`, `dock`, `dock-caption`, `endcard`, `endcard-name`, `endcard-by`. Use classes.
- **(checked)** Every visible piece of text sits in an element marked with one of:
  - `data-caption`: your own words, at most 7 words. At most 24 caption words in total.
  - `data-quote`: text copied exactly from `media/*.txt` (the real result), at most 160 characters.
- Text inside SVG is not checked for size, so don't put words in SVG.

## CSS

- **(checked)** Every selector starts with `#result`, for example `#result .shot img`.
- **(checked)** No `@` rules (`@import`, `@font-face`, `@keyframes`, `@media`), no `animation` or `transition`, no `url()` except `media/` files, no `image-set()`.
- Fonts: only "Bricolage Grotesque" (600, 700), "Onest" (500, 600) and "JetBrains Mono". Others won't load.
- Give every image an explicit width and height. To pan a tall image, put it in a fixed-size box with `overflow:hidden` and move the image with `y`.
- Text on top of a picture gets a solid or nearly solid backing (a sand or paper pill or panel), never bare.

## Size and place

- **(checked)** Every visible text is at least **56 px** tall as rendered, scale included. Captions read best at 72–96 px; headlines at 96–140 px.
- **(checked)** Every visible text stays inside the safe area: **x 80–1840, y 60–940**.
- **(checked)** Something visible is on screen through the whole window: no empty stretches.
- A moment of crossing these lines during a move is fine; staying out for half a second is not.

## Timeline

`timeline_js` is the body of `function (tl, R)`. `tl` is the frame's GSAP timeline; `R.start` is 3.0 and `R.end` is 9.0.

- **(checked)** Use only `tl.set`, `tl.to`, `tl.fromTo` and `tl.from`, with a number as the position: `tl.fromTo("#result .shot", {opacity:0, y:40}, {opacity:1, y:0, duration:0.6, ease:"power2.out"}, R.start)`.
- **(checked)** Every tween starts at or after `R.start` and ends by `R.end`.
- **(checked)** Animate only `opacity`, `x`, `y`, `xPercent`, `yPercent`, `scale`, `scaleX`, `scaleY`, `rotation`, `transformOrigin` and `clipPath`. Never `width`, `height`, `top`, `left`, colors or text.
- **(checked)** Target only elements inside your markup, by selector string. No `window`, `document`, `gsap.*` calls, `tl.call`, `tl.add`, callbacks (`onComplete`…), timers, `Date`, `Math.random`, infinite `repeat`, or URLs.
- Set every starting state in CSS (for example `opacity:0`) or with `tl.set(…, R.start)`, so nothing flashes before its entrance.
- The payoff is on screen by about 4.0 s. The last state holds for at least 1 s before 9.0.

## What else is checked after building

- **(checked)** The page loads without errors and every image loads.
- **(checked)** HyperFrames' own check (`lint`, runtime, layout and WCAG contrast) reports no errors.
- **(checked)** The draft render is 11 s, 30 fps, silent, with no black or blank frames, and its last frame matches its first.
- Then a reviewer looks at stills, full size and at tile size, and scores value, readability, looks and honesty.

---

These rules describe how [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0, Copyright 2026 HeyGen, Inc.) renders a page as video. The video step runs it as a pinned tool through `npx`; none of its files are part of this skill.
