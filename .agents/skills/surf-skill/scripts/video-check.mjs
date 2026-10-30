#!/usr/bin/env node
// Code checks for Video. Implements the checks in references/5-video/build-rules.md;
// keep them in sync. video-build.mjs imports the three checks:
//
//   checkFragment(frag, ctx)       the author's markup, CSS and timeline, before anything renders
//   checkComposition(dir, ctx)     the built page in headless Chromium: tweens, text size, safe area, honesty
//   checkMp4(file, spec)           a rendered video: length, size, sound, black or flat frames, loop seam
//
// Usage: node video-check.mjs <card>      re-check the card's finished video.json, video and cover
//        node video-check.mjs --selftest  prove checkFragment rejects unsafe or broken fragments
// Last line: `ok: …` (exit 0) or `failed: …` (exit 1).

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ffprobe, serveDir } from "./video-lib.mjs";
import { EXIT, existsSync, join, log, readJSON, runCmd, sleep, validateSchema } from "./shared/core.mjs";
import { findChrome, launchChrome } from "./shared/chrome.mjs";

/** What the frame promises the author, and what the checks hold them to. */
export const VIDEO = {
  duration: 11,
  fps: 30,
  window: { start: 3.0, end: 9.0 },
  safe: { left: 80, top: 60, right: 1840, bottom: 940 },
  minTextPx: 56,
  maxCaptionWords: 7,
  maxQuoteChars: 160,
  maxBytes: 700 * 1024,
};

// Ids the frame owns; the author's markup must not reuse them.
const FRAME_IDS = ["root", "result", "command", "command-inner", "caret", "dock", "dock-caption", "endcard", "endcard-name", "endcard-by"];
// Tween vars the author may use: opacity, transforms, clip-path and timing.
const TWEEN_KEYS = new Set([
  "opacity", "x", "y", "xPercent", "yPercent", "scale", "scaleX", "scaleY", "rotation", "rotate", "skewX", "skewY",
  "transformOrigin", "clipPath", "force3D", "duration", "ease", "delay", "stagger", "immediateRender", "repeat",
  "repeatDelay", "yoyo", "overwrite", "startAt", "id", "runBackwards", "lazy", "data", "parent", "keyframes",
]);

// --- the author's fragment, before rendering -----------------------------------

const BANNED_JS = [
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|importScripts|\bWorker\s*\(|postMessage/, "network or worker access"],
  [/\beval\b|\bFunction\s*\(|setTimeout|setInterval|requestAnimationFrame|queueMicrotask/, "eval or timers"],
  [/Math\.random|\bDate\s*[.(]|performance\.now/, "randomness or the clock"],
  [/localStorage|sessionStorage|indexedDB|document\.cookie|\bcaches\s*\./, "storage"],
  [/\b(window|document|globalThis|self|location|navigator|top|parent|frames)\s*(\.|\[)/, "window or document access (use selector strings)"],
  [/innerHTML|outerHTML|textContent|innerText|insertAdjacent|createElement|appendChild|setAttribute/, "changing the page from code"],
  [/gsap\s*\.\s*(to|from|fromTo|set|timeline|delayedCall|ticker|registerPlugin|globalTimeline|context|exportRoot)\b/, "gsap globals (use tl only)"],
  [/\.\s*(call|add|addPause|eventCallback)\s*\(/, "tl.call / tl.add"],
  [/on(Complete|Start|Update|Repeat|ReverseComplete|Interrupt)\b|callbackScope/, "tween callbacks"],
  [/repeat\s*:\s*-/, "infinite repeat"],
  [/constructor|__proto__|prototype|\bReflect\b|\bProxy\b|fromCharCode|\batob\b|\bbtoa\b|\\x[0-9a-f]|\\u[0-9a-f{]/i, "constructor tricks or escaped strings"],
  [/https?:|\/\/[a-z0-9]/i, "a URL"],
  [/<\/?script|<\/?style/i, "a script or style tag"],
];
const BANNED_CSS = [
  [/</, "a < character"],
  [/@[a-z-]+/i, "an @-rule (@import, @font-face, @keyframes, @media)"],
  [/\banimation\b|\btransition\b/i, "CSS animation or transition (animate with tl)"],
  [/expression\s*\(|behavior\s*:|-moz-binding|javascript:/i, "script in CSS"],
  [/image-set|cross-fade|\belement\s*\(|\bsrc\s*\(|\\[0-9a-f]/i, "image-set, src() or escapes in CSS"],
  [/https?:|\/\/[a-z0-9]/i, "a URL"],
];
const BANNED_TAGS = /<\s*\/?\s*(script|style|link|meta|base|iframe|frame|frameset|object|embed|applet|form|input|button|textarea|select|video|audio|source|track|canvas|template|slot|portal|foreignObject|noscript|html|head|body)\b/i;
const BANNED_MARKUP = [
  [/\son[a-z]+\s*=/i, "an inline event handler"],
  [/javascript:|data:|vbscript:/i, "a script or data URL"],
  [/https?:|\/\/[a-z0-9]/i, "a URL"],
  [/\bsrcset\s*=/i, "srcset"],
  [/<!--|-->/, "an HTML comment"],
];

/** media/… paths referenced anywhere in the fragment. */
function mediaRefs(text) {
  return [...text.matchAll(/media\/[A-Za-z0-9._/-]+/g)].map((m) => m[0].replace(/[.)]+$/, ""));
}

/**
 * Static checks on { markup, css, timeline_js } -> list of problems (empty = ok).
 * ctx.media: Set of files that exist, as "media/<name>".
 */
export function checkFragment(frag, ctx) {
  const problems = [];
  const { markup = "", css = "", timeline_js: js = "" } = frag || {};
  for (const [re, what] of BANNED_JS) if (re.test(js)) problems.push(`timeline_js: ${what} is not allowed`);
  for (const [re, what] of BANNED_CSS) if (re.test(css)) problems.push(`css: ${what} is not allowed`);
  const tag = markup.match(BANNED_TAGS);
  if (tag) problems.push(`markup: <${tag[1]}> is not allowed`);
  for (const [re, what] of BANNED_MARKUP) if (re.test(markup)) problems.push(`markup: ${what} is not allowed`);
  for (const id of FRAME_IDS) {
    if (new RegExp(`id\\s*=\\s*["']?${id}["'\\s>]`).test(markup)) problems.push(`markup: id "${id}" belongs to the frame`);
  }
  // Every CSS rule is scoped to #result, so the frame's own elements stay as designed.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "").split("}");
  for (const r of rules) {
    const sel = r.split("{")[0].trim();
    if (!sel || !r.includes("{")) continue;
    const bad = sel.split(",").map((s) => s.trim()).filter((s) => !/^#result\b/.test(s));
    if (bad.length) problems.push(`css: selector "${bad[0].slice(0, 60)}" must start with #result`);
  }
  // Attributes that load something may point only at media/ files that exist.
  for (const m of markup.matchAll(/\b(src|href|xlink:href|poster)\s*=\s*["']?([^"'\s>]*)/gi)) {
    const [, attr, val] = m;
    if (/^(href|xlink:href)$/i.test(attr) && val.startsWith("#")) continue;
    if (!/^media\//.test(val)) problems.push(`markup: ${attr}="${val.slice(0, 60)}" must point into media/`);
  }
  for (const [part, text] of [["css", css], ["markup", markup]]) {
    for (const u of text.matchAll(/url\(\s*["']?([^"')]*)/gi)) {
      if (!/^media\//.test(u[1])) problems.push(`${part}: url(${u[1].slice(0, 60)}) must point into media/`);
    }
  }
  for (const ref of new Set([...mediaRefs(markup), ...mediaRefs(css)])) {
    if (ref.includes("..")) problems.push(`${ref}: no .. in paths`);
    else if (!ctx.media.has(ref)) problems.push(`${ref} does not exist (files: ${[...ctx.media].join(", ")})`);
  }
  if (!/\btl\s*\.\s*(to|fromTo|from|set)\s*\(/.test(js)) problems.push("timeline_js: no tl.to / tl.fromTo / tl.set call");
  return [...new Set(problems)];
}

// --- the built composition, in headless Chromium ------------------------------

/** Lowercase, straight quotes, single spaces: how quotes are compared with the real text. */
export function normalizeText(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

// Runs in the page: audits the author's tweens and every visible text at time t.
const PAGE_HELPERS = `
window.__surf = {
  tweens() {
    const tl = window.__timelines && window.__timelines.main;
    if (!tl) return { error: "no window.__timelines.main" };
    const result = document.getElementById("result");
    const start = (a) => { let t = a.startTime(), p = a.parent; while (p && p !== tl) { t += p.startTime(); p = p.parent; } return t; };
    const out = [];
    for (const a of (window.__authorTweens || [])) {
      const targets = a.targets ? a.targets() : [];
      const outside = targets.filter((el) => !(el instanceof Element) || el === result || !result.contains(el)).length;
      const keys = Object.keys(a.vars || {}).concat(Object.keys((a.vars && a.vars.startAt) || {}));
      const s = start(a);
      out.push({ start: s, end: s + (a.totalDuration ? a.totalDuration() : 0), outside, keys, repeat: a.vars ? a.vars.repeat : 0, isTimeline: !a.targets });
    }
    return { duration: tl.duration(), count: out.length, tweens: out };
  },
  at(t) {
    window.__timelines.main.seek(t, false);
    const result = document.getElementById("result");
    const rootStop = document.getElementById("root");
    const opacityOf = (el) => { let o = 1; for (let n = el; n && n !== rootStop.parentNode; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden") return 0; o *= parseFloat(cs.opacity); } return o; };
    const texts = [];
    const walker = document.createTreeWalker(result, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (el.closest("svg")) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const box = r.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const op = opacityOf(el);
      if (op < 0.5) continue;
      const scale = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1;
      const tagged = el.closest("[data-quote],[data-caption]");
      texts.push({
        text: n.textContent.trim().slice(0, 80),
        px: parseFloat(getComputedStyle(el).fontSize) * scale,
        box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
        tagged: tagged ? (tagged.hasAttribute("data-quote") ? "quote" : "caption") : null,
      });
    }
    let big = 0;
    for (const el of result.querySelectorAll("*")) {
      const b = el.getBoundingClientRect();
      if (b.width * b.height > 40000 && opacityOf(el) > 0.5) { big++; break; }
    }
    return { texts, big };
  },
  tagged() {
    const out = [];
    for (const el of document.querySelectorAll("#result [data-quote], #result [data-caption]")) {
      out.push({ kind: el.hasAttribute("data-quote") ? "quote" : "caption", text: el.textContent.replace(/\\s+/g, " ").trim() });
    }
    const imgs = [...document.querySelectorAll("#result img")].map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0 }));
    return { tagged: out, imgs };
  },
};`;

/**
 * Load <dir>/index.html in headless Chromium and check the author's part.
 * ctx.quoteSources: the real texts a data-quote must come from.
 * Resolves to a list of problems; throws only when Chromium can't run.
 */
export async function checkComposition(dir, ctx) {
  const chrome = findChrome();
  if (!chrome) throw Object.assign(new Error("no headless Chromium found (set SURF_CHROME)"), { blocked: true });
  const server = await serveDir(dir);
  // Only the local server resolves; the page itself may load nothing else.
  const cdp = await launchChrome(chrome, ["127.0.0.1"]);
  const problems = [];
  const errors = [];
  cdp.on((m) => {
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails || {};
      errors.push(d.exception?.description?.split("\n")[0] || d.text);
    }
  });
  const ev = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split("\n")[0] || "page error");
    return r.result.value;
  };
  try {
    for (const m of ["Page.enable", "Runtime.enable"]) await cdp.send(m);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    const loaded = new Promise((res) => {
      cdp.on((m) => m.method === "Page.loadEventFired" && res());
      setTimeout(res, 20_000);
    });
    await cdp.send("Page.navigate", { url: `${server.origin}/index.html` });
    await loaded;
    if (!String(await ev("location.href")).startsWith(server.origin)) throw new Error("the page did not load from the local server");
    await ev("document.fonts.ready.then(() => true)");
    await sleep(300);
    if (errors.length) return [`the page throws: ${errors[0]}`];
    await ev(PAGE_HELPERS);

    const tw = await ev("window.__surf.tweens()");
    if (tw.error) return [tw.error];
    if (tw.duration > VIDEO.duration + 0.01) problems.push(`the timeline runs ${tw.duration.toFixed(2)} s; it must end by ${VIDEO.duration} s`);
    if (!tw.count) problems.push("the author's timeline adds no tweens");
    const { start, end } = VIDEO.window;
    for (const t of tw.tweens) {
      if (t.start < start - 0.001 || t.end > end + 0.001) {
        problems.push(`a tween runs ${t.start.toFixed(2)}–${t.end.toFixed(2)} s; keep every tween inside ${start}–${end} s`);
      }
      if (t.outside) problems.push("a tween targets something outside #result's children");
      const bad = t.keys.filter((k) => !TWEEN_KEYS.has(k));
      if (bad.length) problems.push(`a tween animates ${bad.join(", ")}; use opacity, transforms or clipPath only`);
      if (t.repeat < 0) problems.push("a tween repeats forever");
    }

    // Text: size, safe area, sampled through the result window.
    const hits = new Map();
    const note = (key, msg) => hits.set(key, { msg, n: (hits.get(key)?.n || 0) + 1 });
    let empty = 0;
    let samples = 0;
    for (let t = start; t <= end + 1e-9; t += 0.25) {
      samples++;
      const s = await ev(`window.__surf.at(${t.toFixed(2)})`);
      if (!s.big && !s.texts.length) empty++;
      for (const x of s.texts) {
        const id = x.text.slice(0, 40);
        if (x.px < VIDEO.minTextPx - 0.5) note(`small:${id}`, `"${id}" is ${Math.round(x.px)} px; text must be at least ${VIDEO.minTextPx} px`);
        const { left, top, right, bottom } = VIDEO.safe;
        if (x.box.left < left - 1 || x.box.top < top - 1 || x.box.right > right + 1 || x.box.bottom > bottom + 1) {
          note(`safe:${id}`, `"${id}" leaves the safe area (x ${left}–${right}, y ${top}–${bottom})`);
        }
        if (!x.tagged) note(`tag:${id}`, `"${id}" needs data-quote (real text) or data-caption (your words)`);
      }
    }
    // A moving or scaling element may cross a line for a moment; flag what stays wrong for 0.5 s or more.
    for (const { msg, n } of hits.values()) if (n >= 3 || msg.includes("needs data-")) problems.push(msg);
    if (empty > samples / 3) problems.push(`the result is empty for ${(empty * 0.25).toFixed(2)} s of the window`);

    // Honesty: quotes come from the real result; captions stay short.
    const tg = await ev("window.__surf.tagged()");
    const sources = (ctx.quoteSources || []).map(normalizeText);
    let captionWords = 0;
    for (const x of tg.tagged) {
      const words = x.text.split(/\s+/).filter(Boolean).length;
      if (x.kind === "caption") {
        captionWords += words;
        if (words > VIDEO.maxCaptionWords) problems.push(`caption "${x.text.slice(0, 60)}" has ${words} words; at most ${VIDEO.maxCaptionWords}`);
      } else {
        if (x.text.length > VIDEO.maxQuoteChars) problems.push(`quote "${x.text.slice(0, 40)}…" is ${x.text.length} characters; at most ${VIDEO.maxQuoteChars}`);
        const q = normalizeText(x.text).replace(/^["'“”]+|["'“”]+$/g, "");
        if (!sources.some((s) => s.includes(q))) problems.push(`quote "${x.text.slice(0, 60)}" is not in the real result`);
      }
    }
    if (captionWords > 24) problems.push(`captions have ${captionWords} words in total; keep it under 24`);
    for (const i of tg.imgs) if (!i.ok) problems.push(`image ${i.src} did not load`);
  } finally {
    await cdp.close();
    await server.close();
  }
  return [...new Set(problems)];
}

// --- a rendered video ----------------------------------------------------------

/** Grey 160x90 frames at `fps` per second, as byte arrays. */
async function greyFrames(file, fps, w = 160, h = 90) {
  const r = await runCmd("ffmpeg", ["-v", "error", "-i", file, "-vf", `fps=${fps},scale=${w}:${h}`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { timeoutS: 120 });
  if (r.code !== 0) throw new Error(`ffmpeg frames failed: ${r.stderr.trim().slice(0, 200)}`);
  const buf = Buffer.from(r.stdout, "latin1");
  const n = Math.floor(buf.length / (w * h));
  return Array.from({ length: n }, (_, i) => buf.subarray(i * w * h, (i + 1) * w * h));
}

/** One grey frame at the start (t=0) or the very end of the file. */
async function edgeFrame(file, atEnd, w = 320, h = 180) {
  const pos = atEnd ? ["-sseof", "-0.05"] : [];
  const r = await runCmd("ffmpeg", ["-v", "error", ...pos, "-i", file, "-frames:v", "1", "-vf", `scale=${w}:${h}`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { timeoutS: 60 });
  if (r.code !== 0) throw new Error(`ffmpeg frame failed: ${r.stderr.trim().slice(0, 200)}`);
  return Buffer.from(r.stdout, "latin1");
}

function stats(px) {
  let sum = 0;
  for (const v of px) sum += v;
  const mean = sum / px.length;
  let sq = 0;
  for (const v of px) sq += (v - mean) ** 2;
  return { mean, sd: Math.sqrt(sq / px.length) };
}

/**
 * Check a rendered mp4 -> list of problems. spec: { width, height, maxBytes? }.
 * Black = mean luma under 24; flat = almost no detail (sd under 1.5) anywhere in a frame.
 */
export async function checkMp4(file, spec) {
  if (!existsSync(file)) return [`${file} does not exist`];
  const problems = [];
  const p = await ffprobe(file);
  if (Math.abs(p.duration - VIDEO.duration) > 0.15) problems.push(`it is ${p.duration.toFixed(2)} s long; it must be ${VIDEO.duration} s`);
  if (p.width !== spec.width || p.height !== spec.height) problems.push(`it is ${p.width}x${p.height}; it must be ${spec.width}x${spec.height}`);
  if (Math.abs(p.fps - VIDEO.fps) > 0.1) problems.push(`it runs at ${p.fps.toFixed(2)} fps; it must be ${VIDEO.fps}`);
  if (p.audio) problems.push("it has an audio track; previews are silent");
  if (spec.maxBytes && p.bytes > spec.maxBytes) problems.push(`it is ${Math.round(p.bytes / 1024)} KB; at most ${Math.round(spec.maxBytes / 1024)} KB`);
  const frames = await greyFrames(file, 4);
  const black = [];
  const flat = [];
  frames.forEach((f, i) => {
    const s = stats(f);
    if (s.mean < 24) black.push(i / 4);
    else if (s.sd < 1.5) flat.push(i / 4);
  });
  if (black.length) problems.push(`black frames at ${black.slice(0, 5).map((t) => t.toFixed(2)).join(", ")} s`);
  if (flat.length > 1) problems.push(`blank frames at ${flat.slice(0, 5).map((t) => t.toFixed(2)).join(", ")} s`);
  // Seamless loop: the last frame matches the first.
  const [a, b] = [await edgeFrame(file, false), await edgeFrame(file, true)];
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  const mad = diff / a.length;
  if (mad > 3) problems.push(`the loop jumps: the last frame differs from the first (mean difference ${mad.toFixed(1)})`);
  return problems;
}

// --- CLI ----------------------------------------------------------------------

function out(line, code) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

function selftest() {
  const ctx = { media: new Set(["media/hero.jpg"]) };
  const good = {
    markup: '<div class="shot"><img src="media/hero.jpg" alt=""></div><p class="cap" data-caption>Done in one go</p>',
    css: "#result .shot{position:absolute;left:240px;top:90px} #result .cap{font-size:72px}",
    timeline_js: 'tl.fromTo("#result .shot",{opacity:0},{opacity:1,duration:0.6},R.start);',
  };
  const cases = [
    ["external URL", { ...good, markup: '<img src="https://x.test/a.png">' }],
    ["fetch", { ...good, timeline_js: 'fetch("/x"); tl.to(".a",{opacity:1},3);' }],
    ["Math.random", { ...good, timeline_js: 'tl.to(".a",{x:Math.random()*10},3);' }],
    ["script tag", { ...good, markup: "<script>alert(1)</script>" }],
    ["inline handler", { ...good, markup: '<img src="media/hero.jpg" onerror="x()">' }],
    ["missing file", { ...good, markup: '<img src="media/nope.jpg">' }],
    ["unscoped css", { ...good, css: "body{background:red}" }],
    ["@import", { ...good, css: "@import 'x.css'; #result .a{}" }],
    ["css url", { ...good, css: "#result .a{background:url(/etc/passwd)}" }],
    ["frame id", { ...good, markup: '<div id="endcard">x</div>' }],
    ["gsap global", { ...good, timeline_js: 'gsap.to(".a",{opacity:1}); tl.set(".a",{opacity:0},3);' }],
    ["document", { ...good, timeline_js: 'document.body.remove(); tl.set(".a",{opacity:0},3);' }],
    ["infinite repeat", { ...good, timeline_js: 'tl.to(".a",{opacity:1,repeat:-1},3);' }],
    ["callback", { ...good, timeline_js: 'tl.to(".a",{opacity:1,onComplete:()=>1},3);' }],
    ["css animation", { ...good, css: "#result .a{animation:spin 1s}" }],
    ["constructor", { ...good, timeline_js: '[].constructor.constructor("x")(); tl.set(".a",{opacity:0},3);' }],
    ["inline style url", { ...good, markup: '<div style="background:url(/x.png)">a</div>' }],
    ["image-set", { ...good, css: '#result .a{background:image-set("x.png" 1x)}' }],
  ];
  const fails = [];
  if (checkFragment(good, ctx).length) fails.push(`the good fragment was rejected: ${checkFragment(good, ctx).join("; ")}`);
  for (const [name, frag] of cases) {
    const p = checkFragment(frag, ctx);
    log(`${p.length ? "pass" : "FAIL"} rejects ${name}${p.length ? `: ${p[0]}` : ""}`);
    if (!p.length) fails.push(`did not reject ${name}`);
  }
  const quote = normalizeText("“Six evenings at the wheel” — in Easton");
  if (!normalizeText('"six evenings at the wheel" - in easton').includes(quote)) fails.push("normalizeText does not match curly quotes");
  if (fails.length) out(`failed: ${fails.join("; ")}`, EXIT.failed);
  out(`ok: rejected all ${cases.length} bad fragments`, EXIT.ok);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: video-check.mjs <card> | --selftest");
    process.exit(2);
  }
  if (arg === "--selftest") return selftest();
  const card = resolve(arg);
  const path = join(card, "video.json");
  if (!existsSync(path)) out("failed: video.json is missing; run video-build.mjs first", EXIT.failed);
  const v = readJSON(path);
  const errs = await validateSchema("video", v);
  if (errs.length) out(`failed: video.json is invalid: ${errs.join("; ")}`, EXIT.failed);
  const problems = await checkMp4(join(card, v.video), { width: 1280, height: 720, maxBytes: VIDEO.maxBytes });
  if (!existsSync(join(card, v.cover))) problems.push(`${v.cover} does not exist`);
  else {
    const c = await ffprobe(join(card, v.cover));
    if (c.width !== 1280 || c.height !== 720) problems.push(`the cover is ${c.width}x${c.height}; it must be 1280x720`);
  }
  for (const p of problems) log(`FAIL ${p}`);
  if (problems.length) out(`failed: ${problems.join("; ")}`, EXIT.failed);
  const files = readdirSync(join(card, "video")).length;
  out(`ok: ${v.video} and ${v.cover} pass (${files} file(s) in video/)`, EXIT.ok);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    log(e.stack || e.message);
    out(`failed: video-check crashed: ${e.message}`, EXIT.failed);
  });
}
