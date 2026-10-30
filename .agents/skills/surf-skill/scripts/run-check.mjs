#!/usr/bin/env node
// Code checks on Run's result, and the reviewer's material. Implements
// references/3-run/README.md step 6 and the checks in references/2-plan/checks.md;
// keep them in sync.
//
// Runs every check in plan.json `done` against result/, then prepares review/:
//   review/result/       a copy of result/
//   review/shots/        screenshots (web page) or the images themselves
//   review/page.json     page title, console errors, failed requests (web page)
//   review/evidence.json skill files the agent read and skill scripts it ran
//   review/checks.json   every check and whether it passed
//
// Usage: node run-check.mjs <card>
// Last line: `ok: …` (exit 0), `failed: …` (exit 1) or `blocked: …` (exit 3).

import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { copyOut } from "./run-lib.mjs";
import { EXIT, existsSync, join, listFiles, log, parseFrontmatter, readJSON, writeJSON } from "./shared/core.mjs";
import { findChrome, launchChrome, loadPage, shoot } from "./shared/chrome.mjs";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const MAX_OVERVIEW = 12_000;

function out(line, code) {
  process.stdout.write(line + "\n");
  process.exit(code);
}

// --- checks -----------------------------------------------------------------

function validHtml(text) {
  const t = text.replace(/<!--[\s\S]*?-->/g, "");
  const missing = ["html", "head", "body"].filter((tag) => !new RegExp(`<${tag}(\\s[^>]*)?>`, "i").test(t));
  if (!/<\/html\s*>/i.test(t)) missing.push("/html");
  return missing.length ? `missing <${missing.join(">, <")}>` : null;
}

export function runChecks(card, plan) {
  return plan.done.map((c) => {
    const abs = join(card, c.path);
    const res = { check: c.check, path: c.path, ...(c.value !== undefined ? { value: c.value } : {}), pass: false, detail: "" };
    if (!existsSync(abs) || !statSync(abs).isFile()) return { ...res, detail: "file not found" };
    const buf = readFileSync(abs);
    switch (c.check) {
      case "exists":
        return { ...res, pass: true };
      case "min_bytes":
        return { ...res, pass: buf.length >= c.value, detail: `${buf.length} bytes` };
      case "contains": {
        const hit = buf.includes(Buffer.from(String(c.value)));
        return { ...res, pass: hit, detail: hit ? "" : "text not found" };
      }
      case "differs": {
        const before = join(card, c.value);
        if (!existsSync(before)) return { ...res, detail: `${c.value} not found` };
        const same = readFileSync(before).equals(buf);
        return { ...res, pass: !same, detail: same ? `identical to ${c.value}` : "" };
      }
      case "valid_html": {
        const why = validHtml(buf.toString("utf8"));
        return { ...res, pass: !why, detail: why || "" };
      }
      default:
        return { ...res, detail: `unknown check ${c.check}` };
    }
  });
}

// --- evidence ---------------------------------------------------------------

function evidence(card, plan, name, agentInfo) {
  const lines = existsSync(join(card, "run.jsonl")) ? readFileSync(join(card, "run.jsonl"), "utf8").split("\n") : [];
  const skillRe = new RegExp(`(?:^|[\\s/'"=])\\.agents/skills/${name.replace(/[.]/g, "\\.")}/([^\\s'"\`;|&><)]+)`, "g");
  const read = new Set();
  const scripts = new Set();
  const commands = [];
  const counts = {};
  for (const l of lines) {
    let ev;
    try {
      ev = JSON.parse(l);
    } catch {
      continue;
    }
    const s = ev.step_update;
    if (!s || s.state === "ACTIVE" || !s.tool_info) continue;
    const ti = s.tool_info;
    counts[ti.name] = (counts[ti.name] || 0) + 1;
    const p = ti.parameters || {};
    const path = p.Path || p.AbsolutePath || p.TargetFile || p.DirectoryPath || p.SearchPath || "";
    if (ti.name !== "run_command" && !ti.error) for (const m of path.matchAll(skillRe)) read.add(m[1]);
    if (ti.name === "run_command" && p.CommandLine) {
      const hits = [...p.CommandLine.matchAll(skillRe)].map((m) => m[1]);
      for (const h of hits) if (/^scripts\//.test(h)) scripts.add(h);
      if (hits.length) commands.push(p.CommandLine.slice(0, 200));
    }
  }
  // The skill-specific check, found the same way plan-check.mjs finds it.
  const texts = (dir) => (existsSync(dir) ? listFiles(dir).filter((f) => !f.symlink).map((f) => readFileSync(f.abs)) : []);
  const skillTexts = texts(join(card, "skill"));
  const inputTexts = texts(join(card, "inputs"));
  const mark = plan.done.find(
    (c) =>
      c.check === "contains" && typeof c.value === "string" && c.value.length >= 6 &&
      skillTexts.some((b) => b.includes(c.value)) && !plan.task.prompt.includes(c.value) && !inputTexts.some((b) => b.includes(c.value)),
  );
  return {
    skill: name,
    slash_command_expanded: agentInfo.skill_expanded || null,
    skill_files_read: [...read].sort(),
    skill_scripts_run: [...scripts].sort(),
    skill_commands: commands.slice(0, 30),
    mark: mark ? { value: mark.value, path: mark.path } : null,
    tool_calls: counts,
  };
}

// --- screenshots ------------------------------------------------------------

async function pageShots(chrome, file, shotsDir, hosts) {
  const cdp = await launchChrome(chrome, hosts);
  const consoleErrors = [];
  const failed = [];
  const reqs = new Map();
  cdp.on((m) => {
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails || {};
      consoleErrors.push(d.exception?.description?.split("\n")[0] || d.text);
    }
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") consoleErrors.push(m.params.entry.text);
    if (m.method === "Network.requestWillBeSent") reqs.set(m.params.requestId, m.params.request.url);
    if (m.method === "Network.loadingFailed") failed.push({ url: (reqs.get(m.params.requestId) || "").slice(0, 200), error: m.params.errorText });
  });
  try {
    for (const m of ["Page.enable", "Runtime.enable", "Log.enable", "Network.enable"]) await cdp.send(m);
    const url = pathToFileURL(file).href;
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const info = await loadPage(cdp, url, MAX_OVERVIEW);
    await shoot(cdp, join(shotsDir, "desktop.png"));
    const h = Math.max(900, Math.min(info.height || 900, MAX_OVERVIEW));
    const scale = h > 6000 ? 0.5 : 1;
    await shoot(cdp, join(shotsDir, "overview.png"), { captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: h, scale } });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await loadPage(cdp, url, MAX_OVERVIEW);
    await shoot(cdp, join(shotsDir, "mobile.png"));
    return {
      title: info.title || "",
      height: info.height || 0,
      console_errors: [...new Set(consoleErrors.filter(Boolean))].slice(0, 20),
      failed_requests: failed.filter((f) => f.url).slice(0, 30),
    };
  } finally {
    await cdp.close();
  }
}

async function svgShot(chrome, file, path) {
  const cdp = await launchChrome(chrome, []);
  try {
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await loadPage(cdp, pathToFileURL(file).href);
    await shoot(cdp, path);
  } finally {
    await cdp.close();
  }
}

// --- main -------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    log("Usage: run-check.mjs <card>");
    process.exit(2);
  }
  const card = resolve(arg);
  const plan = readJSON(join(card, "plan.json"));
  const reviewDir = join(card, "review");
  const agentPath = join(reviewDir, "agent.json");
  if (!existsSync(agentPath)) out("failed: review/agent.json is missing; run run-agent.mjs first", EXIT.failed);
  const agentInfo = readJSON(agentPath);
  const { data } = parseFrontmatter(readFileSync(join(card, "skill", "SKILL.md"), "utf8"));

  const checks = runChecks(card, plan);
  const allPass = checks.every((c) => c.pass);

  // Fresh reviewer material; agent.json stays.
  for (const p of ["result", "shots", "page.json", "evidence.json", "checks.json"]) rmSync(join(reviewDir, p), { recursive: true, force: true });
  // The same copy-out rules again, so a hand-edited result/ can't slip a symlink or a huge file past the reviewer.
  const { files: copied, dropped } = copyOut(join(card, "result"), join(reviewDir, "result"));
  const files = copied.map((p) => ({ rel: p.replace(/^result\//, "") }));
  for (const d of dropped) log(`dropped ${d.path}: ${d.reason}`);
  const disallowed = dropped.map((d) => `not allowed ${d.path} (${d.reason})`);
  const shotsDir = join(reviewDir, "shots");
  mkdirSync(shotsDir, { recursive: true });
  writeJSON(join(reviewDir, "evidence.json"), evidence(card, plan, data?.name || "", agentInfo));

  let shots = [];
  let page = null;
  if (allPass && !disallowed.length) {
    const type = plan.deliverable.type;
    const needsChrome = type === "web_page" || (type === "image" && files.some((f) => /\.svg$/i.test(f.rel)));
    const chrome = needsChrome ? findChrome() : null;
    if (needsChrome && !chrome) out("blocked: no headless Chromium found (set SURF_CHROME)", EXIT.blocked);
    const hostsPath = join(card, "hosts.json");
    const hosts = existsSync(hostsPath) ? readJSON(hostsPath).hosts.filter((h) => h.status === "allow").map((h) => h.host) : [];
    try {
      if (type === "web_page") {
        page = await pageShots(chrome, join(reviewDir, plan.deliverable.path), shotsDir, hosts);
        writeJSON(join(reviewDir, "page.json"), page);
      } else if (type === "image") {
        const deliv = join(reviewDir, plan.deliverable.path);
        const others = files.map((f) => join(reviewDir, "result", f.rel)).filter((p) => p !== deliv && IMAGE_EXT.test(p));
        for (const [i, p] of [deliv, ...others].slice(0, 6).entries()) {
          if (/\.svg$/i.test(p)) await svgShot(chrome, p, join(shotsDir, `image-${i + 1}.png`));
          else copyFileSync(p, join(shotsDir, `image-${i + 1}${extname(p).toLowerCase()}`));
        }
      }
    } catch (e) {
      out(`failed: screenshots: ${e.message}`, EXIT.failed);
    }
    shots = readdirSync(shotsDir).sort().map((f) => `review/shots/${f}`);
  }
  writeJSON(join(reviewDir, "checks.json"), { all_pass: allPass && !disallowed.length, checks, shots });

  for (const c of checks) {
    log(`${c.pass ? "pass" : "FAIL"} ${c.check} ${c.path}${c.value !== undefined ? ` ${JSON.stringify(c.value)}` : ""}${c.detail ? ` (${c.detail})` : ""}`);
  }
  if (!allPass || disallowed.length) {
    const bad = checks.filter((c) => !c.pass).map((c) => `${c.check} ${c.path}${c.detail ? ` (${c.detail})` : ""}`);
    out(`failed: ${[...bad, ...disallowed].join("; ")}`, EXIT.failed);
  }
  const errs = page?.console_errors?.length;
  out(`ok: ${checks.length} check(s) passed, ${shots.length} shot(s)${errs ? `, ${errs} console error(s)` : ""}`, EXIT.ok);
}

main().catch((e) => {
  log(e.stack || e.message);
  out(`failed: run-check crashed: ${e.message}`, EXIT.failed);
});
