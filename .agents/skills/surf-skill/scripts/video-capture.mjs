#!/usr/bin/env node
// Video step 1: capture Run's real result as stills and text the video is built from.
// Implements references/5-video/README.md step 1; keep them in sync.
//
// Writes video/work/ fresh:
//   media/       pictures and real text (by deliverable type, see below)
//   facts.json   what each file is, with its size
//
//   web_page  hero.jpg (1440x900 @2x), sections/NN.jpg (1440x900 slices, top first),
//             page.jpg (full page, 1440 wide), mobile.jpg (390x844 @2x), page.txt (the page's text)
//   text      before.txt (the input), after.txt (the result)
//   image     image-N.jpg / .png (up to 6, at most 2400 px a side)
//
// Usage: node video-capture.mjs <card>
// Last line: `ok: …` (exit 0), `failed: …` (exit 1) or `blocked: …` (exit 3).

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ffmpeg, ffprobe, missingVideoTools } from "./video-lib.mjs";
import { EXIT, existsSync, join, log, readJSON, sleep, writeJSON } from "./shared/core.mjs";
import { findChrome, launchChrome, loadPage, shoot } from "./shared/chrome.mjs";

const MAX_PAGE = 9000; // px of page height kept in page.jpg and the sections
const MAX_SECTIONS = 8;
const MAX_TEXT = 20_000; // characters per text file
const MAX_IMAGES = 6;

function out(line, code) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

async function capturePage(chrome, file, mediaDir, hosts) {
  const cdp = await launchChrome(chrome, hosts);
  const files = [];
  try {
    for (const m of ["Page.enable", "Runtime.enable"]) await cdp.send(m);
    const url = pathToFileURL(file).href;
    const jpg = { format: "jpeg", quality: 88 };

    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    const info = await loadPage(cdp, url, MAX_PAGE);
    await shoot(cdp, join(mediaDir, "hero.jpg"), jpg);
    files.push({ file: "media/hero.jpg", width: 2880, height: 1800, what: "the top of the page as a visitor first sees it, at 2x" });

    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    const h = Math.max(900, Math.min(info.height || 900, MAX_PAGE));
    mkdirSync(join(mediaDir, "sections"), { recursive: true });
    for (let i = 0, y = 0; y < h && i < MAX_SECTIONS; i++, y += 900) {
      await cdp.send("Runtime.evaluate", { expression: `scrollTo(0, ${y})` });
      await sleep(350);
      const name = `sections/${String(i + 1).padStart(2, "0")}.jpg`;
      await shoot(cdp, join(mediaDir, name), jpg);
      files.push({ file: `media/${name}`, width: 1440, height: 900, what: `the page scrolled to ${y} px` });
    }
    await cdp.send("Runtime.evaluate", { expression: "scrollTo(0, 0)" });
    await sleep(400);
    await shoot(cdp, join(mediaDir, "page.jpg"), { ...jpg, captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: h, scale: 1 } });
    files.push({ file: "media/page.jpg", width: 1440, height: h, what: `the whole page from the top${h < info.height ? `, cut at ${h} px` : ""}` });

    const text = await cdp.send("Runtime.evaluate", { expression: "document.body ? document.body.innerText : ''", returnByValue: true });
    writeFileSync(join(mediaDir, "page.txt"), String(text.result.value || "").slice(0, MAX_TEXT));
    files.push({ file: "media/page.txt", what: "the page's visible text, for quotes" });

    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await loadPage(cdp, url, MAX_PAGE);
    await shoot(cdp, join(mediaDir, "mobile.jpg"), jpg);
    files.push({ file: "media/mobile.jpg", width: 780, height: 1688, what: "the top of the page on a phone, at 2x" });
    return { files, title: info.title || "", page_height: info.height || 0 };
  } finally {
    await cdp.close();
  }
}

function captureText(card, plan, mediaDir) {
  const files = [];
  const add = (rel, name, what) => {
    const abs = join(card, rel);
    if (!existsSync(abs)) return;
    const text = readFileSync(abs, "utf8").slice(0, MAX_TEXT);
    writeFileSync(join(mediaDir, name), text);
    files.push({ file: `media/${name}`, words: text.split(/\s+/).filter(Boolean).length, what });
  };
  if (plan.deliverable.before) add(plan.deliverable.before, "before.txt", "the input the skill started from");
  // The copy run-check made, after the copy-out rules.
  add(join("review", plan.deliverable.path), "after.txt", "the skill's result");
  return { files };
}

/** Run-check already copied the images (SVGs rendered to PNG) into review/shots/image-N.*. */
async function captureImages(card, mediaDir) {
  const shots = join(card, "review", "shots");
  const srcs = existsSync(shots) ? readdirSync(shots).filter((f) => /^image-\d+\.(png|jpe?g|webp|gif)$/i.test(f)).sort() : [];
  const files = [];
  for (const f of srcs.slice(0, MAX_IMAGES)) {
    const keepPng = /\.(png|gif|webp)$/i.test(f);
    const name = f.replace(/\.[a-z]+$/i, keepPng ? ".png" : ".jpg");
    await ffmpeg([
      "-i", join(shots, f), "-frames:v", "1",
      "-vf", "scale='min(2400,iw)':'min(2400,ih)':force_original_aspect_ratio=decrease",
      ...(keepPng ? [] : ["-q:v", "3"]), join(mediaDir, name),
    ]);
    const p = await ffprobe(join(mediaDir, name));
    files.push({ file: `media/${name}`, width: p.width, height: p.height, what: `result image ${files.length + 1}` });
  }
  return { files };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: video-capture.mjs <card>");
    process.exit(2);
  }
  const card = resolve(arg);
  const plan = readJSON(join(card, "plan.json"));
  if (!existsSync(join(card, "run.json"))) out("failed: run.json is missing; Run must finish first", EXIT.failed);
  const missing = missingVideoTools();
  if (missing.length) out(`blocked: ${missing.join(", ")} not found`, EXIT.blocked);

  const work = join(card, "video", "work");
  rmSync(work, { recursive: true, force: true });
  const mediaDir = join(work, "media");
  mkdirSync(mediaDir, { recursive: true });

  const type = plan.deliverable.type;
  let got;
  try {
    if (type === "web_page") {
      const chrome = findChrome();
      if (!chrome) out("blocked: no headless Chromium found (set SURF_CHROME)", EXIT.blocked);
      // The copy run-check made, after the copy-out rules; the result itself is never opened in place.
      const file = join(card, "review", plan.deliverable.path);
      if (!existsSync(file)) out(`failed: review/${plan.deliverable.path} is missing; run run-check.mjs first`, EXIT.failed);
      const hostsPath = join(card, "hosts.json");
      const hosts = existsSync(hostsPath) ? readJSON(hostsPath).hosts.filter((h) => h.status === "allow").map((h) => h.host) : [];
      got = await capturePage(chrome, file, mediaDir, hosts);
    } else if (type === "text") {
      got = captureText(card, plan, mediaDir);
    } else if (type === "image") {
      got = await captureImages(card, mediaDir);
    } else out(`failed: unknown deliverable type ${type}`, EXIT.failed);
  } catch (e) {
    out(`failed: capture: ${e.message}`, EXIT.failed);
  }
  if (!got.files.length) out(`failed: nothing to capture for a ${type} result`, EXIT.failed);

  writeJSON(join(work, "facts.json"), { type, ...got });
  const pics = got.files.filter((f) => !/\.txt$/.test(f.file)).length;
  const texts = got.files.length - pics;
  for (const f of got.files) log(`${f.file}${f.width ? ` ${f.width}x${f.height}` : ""}${f.words !== undefined ? ` ${f.words} words` : ""}`);
  out(`ok: ${pics} picture(s), ${texts} text file(s) for a ${type} result`, EXIT.ok);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: video-capture crashed: ${e.message}`, EXIT.failed);
});
