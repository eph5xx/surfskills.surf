#!/usr/bin/env node
// Publish a finished card: upload its video and cover to R2 and write it into
// Supabase's `skills` table with the first free day after today. The read policy
// hides a skill until its day starts in Yerevan, so nothing goes live here.
//
// Prints the reply as its last line:
//   ok: published YYYY-MM-DD  (exit 0)
//   failed: <why>          (exit 1)
//   blocked: <why>         (exit 3)  Supabase or wrangler login missing, or no skills.day column
//
// Usage: node publish.mjs <card folder> [--dry-run]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, extname, resolve, sep } from "node:path";
import {
  EXIT,
  PICK_DIR,
  PROJECT_ROOT,
  existsSync,
  join,
  log,
  parseArgs,
  parseFrontmatter,
  readJSON,
  validateSchema,
  writeJSON,
} from "./shared/core.mjs";
import { gh } from "./shared/github.mjs";
import { sbInsert, sbPatch, sbSelect, supabaseSecretEnv } from "./shared/supabase.mjs";

const BUCKET = "surfskills-media";
const MEDIA_ORIGIN = "https://media.surfskills.surf";
const CACHE_CONTROL = "public, max-age=31536000, immutable";
// Must match public.surf_today() in supabase/migrations/20261031120000_skill_day.sql.
const SITE_TZ = "Asia/Yerevan";
const DAY_MIGRATION = "supabase/migrations/20261031120000_skill_day.sql";
const MEDIA = {
  video: { exts: { ".mp4": "video/mp4" }, maxBytes: 5 * 1024 * 1024 },
  cover: { exts: { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }, maxBytes: 2 * 1024 * 1024 },
};
const MAX_DATE_TRIES = 10;

class Stop extends Error {
  constructor(kind, msg) {
    super(msg);
    this.kind = kind;
  }
}
const fail = (msg) => new Stop("failed", msg);
const block = (msg) => new Stop("blocked", msg);

const out = (s) => process.stdout.write(s + "\n");
const lower = (s) => String(s).toLowerCase();
const eq = (col, v) => `${col}=eq.${encodeURIComponent(v)}`;

// --- inputs -------------------------------------------------------------------

async function readValid(card, file, schema) {
  const path = join(card, file);
  if (!existsSync(path)) throw fail(`${file} is missing`);
  let data;
  try {
    data = readJSON(path);
  } catch (e) {
    throw fail(`${file} is not valid JSON: ${e.message}`);
  }
  const errors = await validateSchema(schema, data);
  if (errors.length) throw fail(`${file} is invalid: ${errors.join("; ")}`);
  return data;
}

/** A media file named in video.json -> { abs, ext, type, bytes, sha8 }. Must stay inside the card. */
function mediaFile(card, rel, kind) {
  const rule = MEDIA[kind];
  const abs = resolve(card, rel);
  if (!existsSync(abs)) throw fail(`${kind} ${rel} does not exist`);
  const st = lstatSync(abs);
  if (!st.isFile()) throw fail(`${kind} ${rel} is not a regular file`);
  const real = realpathSync(abs);
  const root = realpathSync(card) + sep;
  if (!real.startsWith(root)) throw fail(`${kind} ${rel} is outside the card folder`);
  const ext = extname(real).toLowerCase();
  if (!rule.exts[ext]) throw fail(`${kind} ${rel}: ${ext || "no extension"} is not allowed (${Object.keys(rule.exts).join(", ")})`);
  if (st.size === 0) throw fail(`${kind} ${rel} is empty`);
  if (st.size > rule.maxBytes) throw fail(`${kind} ${rel} is ${(st.size / 1048576).toFixed(1)} MB; the limit is ${rule.maxBytes / 1048576} MB`);
  const sha8 = createHash("sha256").update(readFileSync(real)).digest("hex").slice(0, 8);
  return { abs: real, ext, type: rule.exts[ext], bytes: st.size, sha8 };
}

/** Page slug: the skill segment of the id, colon-free like the live media names. */
const slugOf = (skillId) => skillId.split("/").pop().replace(/:/g, "-");

// --- Pick's cached repo copy ----------------------------------------------------

function cachedRepoDir(pick) {
  const dir = join(PICK_DIR, "repos", pick.repo.replace("/", "__"), pick.commit);
  return existsSync(dir) ? dir : null;
}

/** Every skill id in the cached repo at pick.commit, the way pick-check names them. */
function repoSkillIds(pick) {
  const dir = cachedRepoDir(pick);
  const ids = new Map();
  const add = (id) => {
    if (!ids.has(lower(id))) ids.set(lower(id), id);
  };
  if (dir) {
    const walk = (abs, rel) => {
      for (const ent of readdirSync(abs, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (ent.name === ".git" || ent.name === "node_modules") continue;
          walk(join(abs, ent.name), rel ? `${rel}/${ent.name}` : ent.name);
        } else if (ent.isFile() && /^skill\.md$/i.test(ent.name)) {
          let name = null;
          try {
            name = parseFrontmatter(readFileSync(join(abs, ent.name), "utf8")).data?.name || null;
          } catch {
            /* unreadable: fall back to the folder name */
          }
          const seg = name || (rel ? basename(rel) : pick.repo.split("/")[1]);
          add(`${pick.repo}/${seg.replace(/\//g, "-")}`);
        }
      }
    };
    walk(dir, "");
  }
  add(pick.skill_id);
  return [...ids.values()].sort((a, b) => a.localeCompare(b));
}

/** The SKILL.md file name as the repo spells it (skill.md, SKILL.md…). */
function skillFileName(card, pick) {
  const dirs = [];
  const cached = cachedRepoDir(pick);
  if (cached) dirs.push(pick.path ? join(cached, pick.path) : cached);
  dirs.push(join(card, "skill"));
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    const hit = readdirSync(d).find((f) => /^skill\.md$/i.test(f));
    if (hit) return hit;
  }
  return "SKILL.md";
}

// --- rows -----------------------------------------------------------------------

function skillRow({ pick, card, collectionId, branch, skillFile, videoUrl, coverUrl }) {
  const slug = slugOf(pick.skill_id);
  const file = pick.path ? `${pick.path}/${skillFile}` : skillFile;
  return {
    id: pick.skill_id,
    collection_id: collectionId,
    name: card.name,
    description: { short: card.short_description },
    reference_file: `https://github.com/${pick.repo}/blob/${branch}/${file}`,
    install_command: `Install the skill or give me an instruction how to install it - ${slug} from https://github.com/${pick.repo}`,
    tools: [],
    preview_video: videoUrl,
    preview_image: coverUrl,
    kind: card.kind,
    use_cases: card.use_cases,
    related_slugs: [],
    sort_order: null,
    long_description: card.long_description,
    when_to_use: card.when_to_use,
    faq: card.faq,
  };
}

async function collectionRow({ pick, card, meta }) {
  const owner = meta.owner.login;
  let author = owner;
  try {
    const user = await gh(`users/${encodeURIComponent(owner)}`);
    author = user.name?.trim() || user.login || owner;
  } catch (e) {
    throw fail(`GitHub user ${owner}: ${e.message}`);
  }
  const c = card.collection;
  const spdx = meta.license?.spdx_id;
  return {
    id: pick.repo,
    name: c.name,
    short_description: c.short_description,
    repository_url: `https://github.com/${pick.repo}`,
    website_url: meta.homepage?.trim() || null,
    external_links: [],
    author_name: author,
    author_url: `https://github.com/${owner}`,
    author_avatar_url: `https://github.com/${owner}.png`,
    license: spdx && spdx !== "NOASSERTION" ? spdx : null,
    github_stars: meta.stargazers_count ?? null,
    updated_at: (meta.pushed_at || "").slice(0, 10) || null,
    install_command: `Install this skill collection or give me an instruction how to install it: https://github.com/${pick.repo}`,
    skills: repoSkillIds(pick),
    long_description: c.long_description,
    when_to_use: c.when_to_use,
    faq: c.faq,
  };
}

// --- dates ----------------------------------------------------------------------

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Today's date in SITE_TZ, YYYY-MM-DD. */
function siteToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Midnight of `day` in SITE_TZ as an ISO timestamp with its offset, e.g. 2026-11-01T00:00:00+04:00. */
function siteMidnight(day) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: SITE_TZ, timeZoneName: "longOffset" })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName").value;
  const m = /GMT([+-]\d{2}:\d{2})?/.exec(name);
  return `${day}T00:00:00${m?.[1] || "+00:00"}`;
}

/** First day after today that no skill holds. */
function firstFreeDay(taken, today) {
  let d = addDays(today, 1);
  while (taken.has(d)) d = addDays(d, 1);
  return d;
}

// --- R2 -------------------------------------------------------------------------

async function headOk(url, tries = 1) {
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.status === 200) return true;
    } catch {
      /* retry */
    }
  }
  return false;
}

function upload(key, file) {
  try {
    execFileSync(
      "npx",
      ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file.abs, "--content-type", file.type, "--cache-control", CACHE_CONTROL, "--remote"],
      { cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000 },
    );
  } catch (e) {
    const text = `${e.stdout || ""}\n${e.stderr || ""}`;
    if (/not (be )?(logged|authenticated)|wrangler login|authentication|\b(10000|10001)\b|unauthori[sz]ed/i.test(text)) {
      throw block("wrangler is not logged in to Cloudflare (run `npx wrangler login`)");
    }
    const last = text.trim().split("\n").filter(Boolean).slice(-3).join(" | ");
    throw fail(`R2 upload of ${key} failed: ${last || e.message}`);
  }
}

// --- main -----------------------------------------------------------------------

async function publish(card, dryRun) {
  const pick = await readValid(card, "pick.json", "pick");
  const data = await readValid(card, "card.json", "card");
  const video = await readValid(card, "video.json", "video");
  const files = { video: mediaFile(card, video.video, "video"), cover: mediaFile(card, video.cover, "cover") };

  let secret;
  try {
    secret = supabaseSecretEnv();
  } catch (e) {
    throw e.blocked ? block(e.message) : e;
  }
  if (!secret) throw block("PUBLIC_SUPABASE_URL is not set (.env)");

  // Secret key: scheduled skills are hidden from the publishable key.
  let skills, collections;
  try {
    [skills, collections] = await Promise.all([
      sbSelect(secret, "skills", "select=id,collection_id,day"),
      sbSelect(secret, "collections", "select=id"),
    ]);
  } catch (e) {
    if (e.code === "42703") throw block(`skills has no day column; apply ${DAY_MIGRATION}`);
    if (e.status === 401 || e.status === 403) throw block(`the secret key was refused (${e.status})`);
    throw fail(`can't read the catalog: ${e.message.split("\n")[0]}`);
  }

  const today = siteToday();
  const existing = skills.find((r) => r.id === pick.skill_id) || skills.find((r) => lower(r.id) === lower(pick.skill_id));
  if (existing && existing.day <= today) throw fail(`${existing.id} is already live (since ${existing.day})`);
  // A rename in casing would orphan media and links, so the row keeps its own id.
  if (existing && existing.id !== pick.skill_id) throw fail(`scheduled as ${existing.id}, but pick.json says ${pick.skill_id}`);

  let meta;
  try {
    meta = await gh(`repos/${pick.repo}`);
  } catch (e) {
    throw fail(`GitHub repo ${pick.repo}: ${e.message}`);
  }

  const knownCollection = collections.find((c) => lower(c.id) === lower(pick.repo));
  let collection = null;
  if (!knownCollection) {
    if (!data.collection) throw fail(`${pick.repo} is not in the catalog, so card.json needs "collection"`);
    collection = await collectionRow({ pick, card: data, meta });
  }

  const slug = slugOf(pick.skill_id);
  const keys = {
    video: `skills/${slug}-demo-${files.video.sha8}${files.video.ext}`,
    cover: `skills/${slug}-demo-${files.cover.sha8}${files.cover.ext}`,
  };
  const urls = { video: `${MEDIA_ORIGIN}/${keys.video}`, cover: `${MEDIA_ORIGIN}/${keys.cover}` };

  const skill = skillRow({
    pick,
    card: data,
    collectionId: knownCollection ? knownCollection.id : pick.repo,
    branch: meta.default_branch,
    skillFile: skillFileName(card, pick),
    videoUrl: urls.video,
    coverUrl: urls.cover,
  });
  const withDay = (day) => ({ ...skill, day, created_at: siteMidnight(day) });

  const taken = new Set(skills.map((r) => r.day));
  let day = existing ? existing.day : firstFreeDay(taken, today);

  if (dryRun) {
    out(JSON.stringify({ day, today, already_scheduled: !!existing, r2: keys, urls, skill: withDay(day), collection }, null, 2));
    out(`dry run: would ${existing ? "update" : "insert"} ${pick.skill_id} for ${day}${collection ? " with a new collection" : ""}`);
    return;
  }

  for (const k of ["video", "cover"]) {
    if (await headOk(urls[k])) log(`${keys[k]} is already in R2`);
    else {
      log(`uploading ${keys[k]} (${(files[k].bytes / 1024).toFixed(0)} KB)`);
      upload(keys[k], files[k]);
    }
  }
  for (const k of ["video", "cover"]) {
    if (!(await headOk(urls[k], 5))) throw fail(`${urls[k]} does not answer 200 after upload`);
  }

  // Updates leave `day` alone; a skill that went live in the meantime is not touched.
  const updateRow = async () => {
    const { day: _d, created_at: _c, ...fields } = withDay(day);
    const rows = await sbPatch(secret, "skills", `${eq("id", pick.skill_id)}&day=gt.${today}`, fields);
    if (!rows.length) throw fail(`${pick.skill_id} went live or vanished during the update`);
    return rows[0].day;
  };

  if (existing) {
    day = await updateRow();
  } else {
    if (collection) {
      try {
        await sbInsert(secret, "collections", [collection]);
      } catch (e) {
        // Another run added it first; collections are never updated here.
        if (e.code !== "23505") throw fail(`collection insert failed: ${e.message.split("\n")[0]} ${e.detail || ""}`.trim());
        collection = null;
      }
    }
    let done = false;
    for (let i = 0; i < MAX_DATE_TRIES && !done; i++) {
      try {
        await sbInsert(secret, "skills", [withDay(day)]);
        done = true;
      } catch (e) {
        if (e.code !== "23505") throw fail(`skill insert failed: ${e.message.split("\n")[0]} ${e.detail || ""}`.trim());
        if (/skills_day_key|Key \(day\)/.test(e.detail || "")) {
          taken.add(day);
          day = firstFreeDay(taken, today);
        } else {
          day = await updateRow();
          done = true;
        }
      }
    }
    if (!done) throw fail(`no free day after ${MAX_DATE_TRIES} tries`);
  }

  const receipt = {
    publish_on: day,
    video_url: urls.video,
    cover_url: urls.cover,
    collection_queued: !!collection,
    queued_at: new Date().toISOString(),
  };
  const errors = await validateSchema("publish", receipt);
  if (errors.length) throw fail(`publish.json would be invalid: ${errors.join("; ")}`);
  writeJSON(join(card, "publish.json"), receipt);
  out(`  skill: ${pick.skill_id}${collection ? ` (+ collection ${collection.id})` : ""}`);
  out(`  video: ${urls.video}`);
  out(`  cover: ${urls.cover}`);
  out(`ok: published ${day}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const arg = args._[0];
  if (!arg) {
    log("Usage: publish.mjs <card folder> [--dry-run]");
    process.exit(2);
  }
  const card = resolve(arg);
  if (!existsSync(card)) {
    out(`failed: ${card} does not exist`);
    process.exit(EXIT.failed);
  }
  try {
    await publish(card, !!args["dry-run"]);
  } catch (e) {
    if (e instanceof Stop) {
      out(`${e.kind}: ${e.message}`);
      process.exit(e.kind === "blocked" ? EXIT.blocked : EXIT.failed);
    }
    log(e.stack || e.message);
    out(`failed: ${e.message.split("\n")[0]}`);
    process.exit(EXIT.failed);
  }
}

main();
