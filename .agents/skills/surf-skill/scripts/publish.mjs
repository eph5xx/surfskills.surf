#!/usr/bin/env node
// Publish a finished card: upload its video and cover to R2 and queue it in
// Supabase's private `skill_queue` table with the first free date. Nothing goes
// live here; the queue row holds ready `skills` / `collections` rows for later.
//
// Prints the reply as its last line:
//   published: YYYY-MM-DD  (exit 0)
//   failed: <why>          (exit 1)
//   blocked: <why>         (exit 3)  Supabase or wrangler login missing, or no queue table
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
  gh,
  join,
  log,
  parseArgs,
  parseFrontmatter,
  readJSON,
  sbInsert,
  sbPatch,
  sbSelect,
  supabaseEnv,
  supabaseSecretKey,
  validateSchema,
  writeJSON,
} from "./lib.mjs";

const BUCKET = "surfskills-media";
const MEDIA_ORIGIN = "https://media.surfskills.surf";
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const QUEUE = "skill_queue";
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

/** First day from tomorrow (UTC) that no queue row holds. */
function firstFreeDate(taken) {
  let d = addDays(new Date().toISOString().slice(0, 10), 1);
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

  const pub = supabaseEnv();
  if (!pub) throw block("PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set (.env)");
  let secret;
  try {
    secret = { url: pub.url, key: supabaseSecretKey(pub.url) };
  } catch (e) {
    throw e.blocked ? block(e.message) : e;
  }

  // Live catalog, publishable key: the same view the site has.
  let liveSkills, liveCollections;
  try {
    [liveSkills, liveCollections] = await Promise.all([
      sbSelect(pub, "skills", "select=id"),
      sbSelect(pub, "collections", "select=id"),
    ]);
  } catch (e) {
    throw fail(`can't read the live catalog: ${e.message.split("\n")[0]}`);
  }
  if (liveSkills.some((s) => lower(s.id) === lower(pick.skill_id))) throw fail(`${pick.skill_id} is already live on the site`);

  let queue;
  try {
    queue = await sbSelect(secret, QUEUE, "select=skill_id,publish_on");
  } catch (e) {
    if (e.status === 404 || e.code === "PGRST205" || e.code === "42P01") {
      throw block(`the ${QUEUE} table doesn't exist; apply supabase/migrations/20261029120000_skill_queue.sql`);
    }
    if (e.status === 401 || e.status === 403) throw block(`the secret key was refused (${e.status})`);
    throw fail(`can't read ${QUEUE}: ${e.message.split("\n")[0]}`);
  }

  let meta;
  try {
    meta = await gh(`repos/${pick.repo}`);
  } catch (e) {
    throw fail(`GitHub repo ${pick.repo}: ${e.message}`);
  }

  const liveCollection = liveCollections.find((c) => lower(c.id) === lower(pick.repo));
  let collection = null;
  if (!liveCollection) {
    if (!data.collection) throw fail(`${pick.repo} is not on the site, so card.json needs "collection"`);
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
    collectionId: liveCollection ? liveCollection.id : pick.repo,
    branch: meta.default_branch,
    skillFile: skillFileName(card, pick),
    videoUrl: urls.video,
    coverUrl: urls.cover,
  });

  const existing = queue.find((q) => q.skill_id === pick.skill_id) || queue.find((q) => lower(q.skill_id) === lower(pick.skill_id));
  const taken = new Set(queue.map((q) => q.publish_on));
  let date = existing ? existing.publish_on : firstFreeDate(taken);

  if (dryRun) {
    out(JSON.stringify({ publish_on: date, already_queued: !!existing, r2: keys, urls, skill, collection }, null, 2));
    out(`dry run: would ${existing ? "update" : "queue"} ${pick.skill_id} for ${date}${collection ? " with a new collection" : ""}`);
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

  const patchRow = async (skillId) => {
    const rows = await sbPatch(secret, QUEUE, eq("skill_id", skillId), { skill, collection });
    if (!rows.length) throw fail(`the queue row for ${skillId} vanished during the update`);
    return rows[0].publish_on;
  };

  if (existing) {
    // A rename in casing would break the row's id check, so the row keeps its own id.
    if (existing.skill_id !== pick.skill_id) throw fail(`queued as ${existing.skill_id}, but pick.json says ${pick.skill_id}`);
    date = await patchRow(existing.skill_id);
  } else {
    let done = false;
    for (let i = 0; i < MAX_DATE_TRIES && !done; i++) {
      try {
        await sbInsert(secret, QUEUE, [{ skill_id: pick.skill_id, publish_on: date, skill, collection }]);
        done = true;
      } catch (e) {
        if (e.code !== "23505") throw fail(`queue insert failed: ${e.message.split("\n")[0]} ${e.detail || ""}`.trim());
        if (/skill_queue_pkey|skill_id/.test(e.detail || "")) {
          date = await patchRow(pick.skill_id);
          done = true;
        } else {
          taken.add(date);
          date = firstFreeDate(taken);
        }
      }
    }
    if (!done) throw fail(`no free date after ${MAX_DATE_TRIES} tries`);
  }

  const receipt = {
    publish_on: date,
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
  out(`published: ${date}`);
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
