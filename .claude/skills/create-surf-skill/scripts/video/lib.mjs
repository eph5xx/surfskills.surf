// Video-only helpers: staging the preview template and probing the rendered
// clip. Everything else (run.json state, GitHub, Supabase, validation) lives in
// ../lib.mjs — this module keeps the ffmpeg/ffprobe surface in one place.
//
// See NOTICE in this folder: template.html is Apache-2.0, the rest is MIT.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // .../create-surf-skill/video
const TEMPLATE = join(HERE, "template.html");

/**
 * Stage a stamped index.html into projectDir. The template uses system font
 * stacks, so nothing else needs copying. Idempotent: never clobbers an existing
 * index.html (preserves edits/renders).
 */
export function stageProject(projectDir, command, { banner = null } = {}) {
  mkdirSync(join(projectDir, "renders"), { recursive: true });
  const indexPath = join(projectDir, "index.html");
  let stamped = false;
  if (!existsSync(indexPath)) {
    let tpl = readFileSync(TEMPLATE, "utf8");
    tpl = tpl.replaceAll("__COMMAND__", command);
    if (banner) tpl = tpl.replace("<body>", `<body>\n<!-- ${banner} -->`);
    writeFileSync(indexPath, tpl);
    stamped = true;
  }
  return { stamped, indexPath };
}

/** Probe an mp4 -> { dur (sec, NaN if unknown), res ("WxH"), hasAudio, kb }. */
export function ffprobeSpec(file) {
  const probe = (args) =>
    (spawnSync("ffprobe", ["-v", "error", ...args, "-of", "default=nw=1:nk=1", file], {
      encoding: "utf8",
    }).stdout || "").trim();
  const dur = parseFloat(probe(["-show_entries", "format=duration"]));
  const res = probe(["-select_streams", "v:0", "-show_entries", "stream=width,height"])
    .split("\n")
    .join("x");
  const hasAudio = probe(["-select_streams", "a", "-show_entries", "stream=index"]).length > 0;
  const kb = statSync(file).size / 1024;
  return { dur, res, hasAudio, kb };
}

/**
 * Average luma (0–255) of an image, or null. Near-zero means the frame rendered
 * black — the classic nested-<video> silent failure.
 */
export function lumaAvg(imagePath) {
  const r = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", imagePath, "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const m = ((r.stdout || "") + (r.stderr || "")).match(/YAVG=([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}
