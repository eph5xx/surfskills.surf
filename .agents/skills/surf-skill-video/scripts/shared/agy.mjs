// The Antigravity CLI (`agy`) inside its own macOS Seatbelt sandbox. Every agy run
// gets session-only settings from runSettings() or lockedSettings(); the user's own
// agy setup is never touched.

import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { log, realTmp, writeJSON } from "./core.mjs";

export const AGY = process.env.SURF_AGY || "agy";
const HOME = homedir();
// Where agy's image tool saves pictures: brain/<conversation id>/<name>.jpg.
export const AGY_BRAIN = join(HOME, ".gemini", "antigravity-cli", "brain");

// Home folders the agent must never touch. The caches matter: agy's sandbox mounts
// "common build caches" (~/.cache, ~/.npm…) readable, and they can hold API responses.
export const HOME_DENY = [
  ".ssh", ".aws", ".config", "Library", "projects", "Documents", "Desktop", "Downloads",
  ".gnupg", ".kube", ".docker", ".netrc", ".git-credentials", ".npmrc",
  ".cache", ".npm", ".pnpm-store", ".yarn", ".bun", ".cargo", ".rustup", ".gradle", ".m2", "go",
];

export function agyVersion() {
  try {
    return execFileSync(AGY, ["--version"], { encoding: "utf8", timeout: 30_000 }).trim();
  } catch (e) {
    throw new Error(`agy not found or not working (${AGY}): ${e.message}`);
  }
}

/** A fresh `$TMPDIR/surf-run/<label>-<ts>/` with `ws/` (the agent's workspace) and `meta/` (ours). */
export function makeRunDir(label) {
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "");
  const dir = join(realTmp(), "surf-run", `${label}-${ts}-${randomBytes(3).toString("hex")}`);
  mkdirSync(join(dir, "ws", ".tmp"), { recursive: true });
  mkdirSync(join(dir, "meta"), { recursive: true });
  return { dir, ws: join(dir, "ws"), meta: join(dir, "meta") };
}

/**
 * Settings for the agent run. Workspace writes need an explicit allow: agy sees the
 * workspace under its real path, and anything outside it is "ask", which headless
 * mode denies. `hosts` become read_url allows, which agy also compiles into the
 * sandbox's outbound allowlist. `weaken` exists only to prove the self-test can fail.
 */
export function runSettings({ ws, hosts = [], home = HOME, weaken = false }) {
  const deny = [
    ...HOME_DENY.map((d) => `read_file(${home}/${d})`),
    "write_file(/tmp)",
    "write_file(/private/tmp)",
  ];
  return {
    enableTerminalSandbox: true,
    toolPermission: "proceed-in-sandbox",
    permissions: {
      allow: [`write_file(${ws})`, ...hosts.map((h) => `read_url(${h})`), ...(weaken ? [`read_file(${home})`] : [])],
      ask: ["execute_url(*)", "mcp(*)"],
      deny: weaken ? [] : deny,
    },
  };
}

/** Settings for the stand-in and the reviewer: no commands, no network, no MCP, no writes. */
export function lockedSettings(home = HOME) {
  return {
    enableTerminalSandbox: true,
    toolPermission: "proceed-in-sandbox",
    permissions: {
      allow: [],
      ask: [],
      deny: [
        "command(*)", "read_url(*)", "execute_url(*)", "mcp(*)", "write_file(*)",
        ...HOME_DENY.map((d) => `read_file(${home}/${d})`),
      ],
    },
  };
}

/** Hash of the lockdown, independent of the card: what the self-test result is cached under. */
export function settingsHash() {
  const shape = { run: runSettings({ ws: "<WS>", hosts: ["<HOST>"], home: "<HOME>" }), locked: lockedSettings("<HOME>") };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 16);
}

/** A small, secret-free environment for agy and everything it starts. */
export function agyEnv(tmp) {
  const keep = ["HOME", "USER", "LOGNAME", "PATH", "SHELL", "LANG", "LC_ALL"];
  const env = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  env.TERM = "dumb";
  // Seatbelt lets commands write to the temp folder; pointing TMPDIR into the
  // workspace keeps the real temp folder (and other runs) out of reach.
  env.TMPDIR = tmp.endsWith("/") ? tmp : tmp + "/";
  return env;
}

/** Errors that mean "stop the batch", not "this card failed". */
export function blockedReason(text) {
  if (!text) return null;
  if (/quota|RESOURCE_EXHAUSTED|rate.?limit|\b429\b|out of credits|no credit/i.test(text)) return "agy quota ran out";
  if (/not authenticated|sign.?in|log.?in required|unauthenticated|auth (error|timed out)|\b401\b/i.test(text)) return "agy is not logged in";
  return null;
}

/**
 * Start agy in stream-json mode. Returns { child, send(text), end(), done } where
 * `done` resolves to { code, signal, lines }. `onEvent` gets every parsed event.
 */
export function spawnAgyStream({ cwd, settingsPath, logFile, env, onEvent, extraArgs = [] }) {
  const args = [
    "--sandbox", "--settings", settingsPath,
    "--input-format", "stream-json", "--output-format", "stream-json",
    ...(logFile ? ["--log-file", logFile] : []),
    ...extraArgs,
    // -p takes a value; with stream-json input the turns come from stdin instead.
    "-p", "",
  ];
  const child = spawn(AGY, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: true });
  const lines = [];
  let buf = "";
  let stderr = "";
  child.stdout.on("data", (d) => {
    buf += d;
    let k;
    while ((k = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, k);
      buf = buf.slice(k + 1);
      if (!line.trim()) continue;
      lines.push(line);
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      try {
        onEvent?.(ev);
      } catch (e) {
        log(`event handler error: ${e.message}`);
      }
    }
  });
  child.stderr.on("data", (d) => {
    if (stderr.length < 20_000) stderr += d;
  });
  child.stdin.on("error", () => {});
  let ended = false;
  const done = new Promise((res) => {
    child.on("close", (code, signal) => res({ code, signal, lines, stderr }));
    child.on("error", (e) => res({ code: null, signal: null, lines, stderr: stderr + e.message }));
  });
  return {
    child,
    done,
    send(text) {
      if (ended) return;
      child.stdin.write(JSON.stringify({ event: "user", message: { content: text } }) + "\n");
    },
    end() {
      if (ended) return;
      ended = true;
      child.stdin.end();
    },
    /** Kill agy and its daemons (it runs in its own process group). */
    kill(sig = "SIGTERM") {
      try {
        process.kill(-child.pid, sig);
      } catch {
        /* already gone */
      }
    },
  };
}

/**
 * The folder's file list for a locked run. It can't run `ls`, and a model that guesses
 * paths outside the folder hits a denied read, which ends a headless run with no answer.
 */
function folderNote(cwd) {
  const files = [];
  const walk = (dir, rel) => {
    for (const ent of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!rel && ent.name === ".tmp") continue;
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(join(dir, ent.name), r);
      else if (ent.isFile() && files.length < 200) files.push(r);
    }
  };
  walk(cwd, "");
  return [
    "",
    "",
    "## Your files",
    "",
    `Your folder is ${cwd}. Everything you need is in it; these are all its files:`,
    ...files.map((f) => `- ${f}`),
    "",
    "You can only read files. Commands, the web and writes are off, so don't try them.",
    "Open only the files listed here. Never open or guess paths outside this folder: a denied read ends your session with no answer.",
  ].join("\n");
}

/**
 * One locked-down, single-turn agy run with structured output (stand-in, reviewer,
 * video storyboard, author and reviewer). `model` is an `agy models` id; without it
 * agy uses its default. Resolves to { ok, output, error, blocked }.
 */

export function agyJson({ cwd, prompt, schemaPath, timeoutS = 180, model }) {
  const settingsPath = join(cwd, "..", `settings-${randomBytes(3).toString("hex")}.json`);
  writeJSON(settingsPath, lockedSettings());
  const tmp = join(cwd, ".tmp");
  mkdirSync(tmp, { recursive: true });
  const args = [
    "--sandbox", "--disable-slash-commands", "--settings", settingsPath,
    ...(model ? ["--model", model] : []),
    "--json-schema", schemaPath, "--output-format", "json",
    "--print-timeout", `${timeoutS}s`, "-p", prompt + folderNote(cwd),
  ];
  return new Promise((res) => {
    const child = spawn(AGY, args, { cwd, env: agyEnv(tmp), stdio: ["ignore", "pipe", "pipe"], detached: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const killer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* gone */
      }
    }, (timeoutS + 60) * 1000);
    child.on("close", (code) => {
      clearTimeout(killer);
      rmSync(settingsPath, { force: true });
      let r;
      try {
        r = JSON.parse(out.trim().split("\n").pop());
      } catch {
        const msg = (err || out || `agy exited ${code}`).trim().slice(0, 500);
        return res({ ok: false, error: msg, blocked: blockedReason(msg) });
      }
      if (r.status !== "SUCCESS" || !r.structured_output) {
        const msg = String(r.error || err || "no structured output").slice(0, 500);
        return res({ ok: false, error: msg, blocked: blockedReason(msg) });
      }
      res({ ok: true, output: r.structured_output });
    });
  });
}
