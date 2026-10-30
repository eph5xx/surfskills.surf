// Headless Chromium over CDP: raw DevTools Protocol over Node's WebSocket, no
// Playwright, no Puppeteer. Used by Run's screenshots and by Video's capture and
// composition checks.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { log, realTmp, sleep } from "./core.mjs";

/** A headless Chromium binary: SURF_CHROME, Playwright's headless shell, or Chrome. */
export function findChrome() {
  if (process.env.SURF_CHROME) return process.env.SURF_CHROME;
  const pw = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(pw)) {
    const dirs = readdirSync(pw)
      .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
      .sort((a, b) => b.split("-")[1] - a.split("-")[1]);
    for (const d of dirs) {
      for (const sub of readdirSync(join(pw, d))) {
        for (const bin of ["chrome-headless-shell", "headless_shell"]) {
          const p = join(pw, d, sub, bin);
          if (existsSync(p)) return p;
        }
      }
    }
  }
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Headless Chromium with a fresh profile; DNS resolves only the approved hosts
 * (IP literals such as 127.0.0.1 skip DNS). Returns { send, on, close }.
 */
export async function launchChrome(bin, hosts) {
  const profile = mkdtempSync(join(realTmp(), "surf-chrome-"));
  const rules = ["MAP * ~NOTFOUND", ...hosts.map((h) => `EXCLUDE ${h}`)].join(", ");
  const args = [
    "--headless", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--host-resolver-rules=${rules}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync", "--disable-background-networking",
    "--disable-component-update", "--disable-default-apps", "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb",
    "about:blank",
  ];
  const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
  const exited = new Promise((res) => child.once("exit", res));
  const kill = async () => {
    child.kill("SIGKILL");
    await Promise.race([exited, sleep(5000)]);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (e) {
      log(`could not remove the Chromium profile ${profile}: ${e.message}`);
    }
  };
  let wsUrl;
  try {
    wsUrl = await new Promise((res, rej) => {
      let err = "";
      const t = setTimeout(() => rej(new Error(`Chromium did not start: ${err.slice(0, 300)}`)), 20_000);
      child.stderr.on("data", (d) => {
        err += d;
        const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) {
          clearTimeout(t);
          res(m[1]);
        }
      });
      child.on("exit", () => rej(new Error(`Chromium exited: ${err.slice(0, 300)}`)));
    });
  } catch (e) {
    await kill();
    throw e;
  }
  const port = new URL(wsUrl).port;
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === "page");
  const sock = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    sock.onopen = res;
    sock.onerror = () => rej(new Error("CDP connection failed"));
  });
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  sock.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      const { res, rej } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      waiting.set(i, { res, rej });
      sock.send(JSON.stringify({ id: i, method, params }));
    });
  return {
    send,
    on: (fn) => listeners.push(fn),
    async close() {
      try {
        sock.close();
      } catch {
        /* closed */
      }
      await kill();
    },
  };
}

/**
 * Open `url`, wait for load, scroll through once (up to `maxScroll` px) so
 * reveal-on-scroll content shows, then return to the top. -> { height, title }.
 */
export async function loadPage(cdp, url, maxScroll = 12_000) {
  const loaded = new Promise((res) => {
    cdp.on((m) => m.method === "Page.loadEventFired" && res());
    setTimeout(res, 20_000);
  });
  await cdp.send("Page.navigate", { url });
  await loaded;
  await sleep(1500);
  const r = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const h = () => document.documentElement.scrollHeight;
      for (let y = 0; y < h() && y < ${maxScroll}; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      scrollTo(0, 0); await new Promise(r => setTimeout(r, 900));
      return { height: h(), title: document.title };
    })()`,
  });
  return r.result.value || {};
}

/** Page.captureScreenshot into `path` (png unless params.format says otherwise). */
export async function shoot(cdp, path, params = {}) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png", ...params });
  writeFileSync(path, Buffer.from(r.data, "base64"));
}
