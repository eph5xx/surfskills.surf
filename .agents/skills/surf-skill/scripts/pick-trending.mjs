#!/usr/bin/env node
// Trending repos from trendshift.io (daily + weekly) and github.com/trending
// (daily + weekly), merged into one list with hype signals per repo.
//
// trendshift embeds a schema.org ItemList as JSON-LD; GitHub trending is plain
// HTML. Both are public pages. If a list fails we keep going with the others.
//
// Usage (debug): node pick-trending.mjs   -> prints the merged list as JSON

import { fileURLToPath } from "node:url";
import { log } from "./lib.mjs";

const UA = "Mozilla/5.0 (compatible; surfskills-pick/1.0; +https://surfskills.surf)";

const LISTS = [
  { key: "trendshift_daily", url: "https://trendshift.io/", parse: parseTrendshift },
  { key: "trendshift_weekly", url: "https://trendshift.io/weekly", parse: parseTrendshift },
  { key: "github_stars_today", url: "https://github.com/trending?since=daily", parse: parseGithubTrending },
  { key: "github_stars_week", url: "https://github.com/trending?since=weekly", parse: parseGithubTrending },
];

/** -> [{ repo, value, description }], value = list position (1 = top). */
function parseTrendshift(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let doc;
    try {
      doc = JSON.parse(m[1]);
    } catch {
      continue;
    }
    for (const el of doc.itemListElement || []) {
      const item = el.item || {};
      const repo = repoFromUrl(item.codeRepository || item.url) || (/^[^/\s]+\/[^/\s]+$/.test(item.name || "") ? item.name : null);
      if (repo) out.push({ repo, value: el.position, description: item.description || null });
    }
  }
  return out;
}

/** -> [{ repo, value, description }], value = stars gained in the period. */
function parseGithubTrending(html) {
  const out = [];
  for (const chunk of html.split(/<article class="Box-row"/).slice(1)) {
    const href = chunk.match(/<h2[^>]*>\s*<a[^>]*href="\/([^"/]+\/[^"/]+)"/);
    if (!href) continue;
    const stars = chunk.match(/([\d,]+)\s+stars\s+(?:today|this week|this month)/);
    const desc = chunk.match(/<p class="col-9[^"]*">\s*([\s\S]*?)\s*<\/p>/);
    out.push({
      repo: href[1],
      value: stars ? Number(stars[1].replace(/,/g, "")) : null,
      description: desc ? decodeEntities(desc[1].replace(/<[^>]+>/g, "").trim()) : null,
    });
  }
  return out;
}

function repoFromUrl(url) {
  const m = (url || "").match(/github\.com\/([^/\s]+\/[^/\s#?]+)/);
  return m ? m[1].replace(/\.git$/, "") : null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** -> [{ repo, description, hype: { trendshift_daily, ... } }], sorted by hype. */
export async function trendingRepos() {
  const byRepo = new Map();
  let ok = 0;
  for (const list of LISTS) {
    let rows;
    try {
      const res = await fetch(list.url, { headers: { "User-Agent": UA, Accept: "text/html" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      rows = list.parse(await res.text());
      if (!rows.length) throw new Error("no repos found (page layout changed?)");
    } catch (e) {
      log(`warning: ${list.url}: ${e.message}`);
      continue;
    }
    ok++;
    for (const r of rows) {
      const k = r.repo.toLowerCase();
      if (!byRepo.has(k)) byRepo.set(k, { repo: r.repo, description: r.description, hype: {} });
      const entry = byRepo.get(k);
      entry.hype[list.key] = r.value;
      entry.description ||= r.description;
    }
  }
  if (!ok) throw new Error("every trending list failed");
  return [...byRepo.values()].sort((a, b) => hypeScore(b.hype) - hypeScore(a.hype));
}

/** Rough ordering only: number of lists a repo is on, then stars gained. */
export function hypeScore(h) {
  const lists = Object.values(h).filter((v) => v != null).length;
  return lists * 10000 + (h.github_stars_today || 0) + (h.github_stars_week || 0) / 7;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  trendingRepos().then(
    (rows) => process.stdout.write(JSON.stringify(rows, null, 2) + "\n"),
    (e) => {
      log(e.message);
      process.exit(1);
    },
  );
}
