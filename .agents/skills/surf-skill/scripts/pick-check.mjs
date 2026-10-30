#!/usr/bin/env node
// Repo scan + basic checks for Pick. Implements references/1-pick/checks.md;
// keep the two in sync.
//
// scanRepo: GitHub metadata + file tree -> drop non-skill repos -> download the
// rest (tarball, or just the skill folders for big repos) -> checkSkill on every
// SKILL.md folder. Downloads are read as text only, never executed.
//
// Usage (debug): node pick-check.mjs <local skill folder>   -> checkSkill result

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PICK_DIR, listFiles, log, parseFrontmatter } from "./shared/core.mjs";
import { downloadFiles, downloadRepo, gh } from "./shared/github.mjs";

// A repo is an app that happens to ship a skill when both hold: few of its files
// are skill files, and it has real code outside the skill folders. Tune from the
// `dropped` reasons in the pool.
export const MIN_SKILL_SHARE = 0.3;
export const MAX_OUTSIDE_CODE = 30;
// GitHub reports repo size in KB. Bigger repos get only their skill folders.
const MAX_TARBALL_KB = 100_000;
const MAX_FILE_BYTES = 5_000_000;
const MAX_FILES = 3000;
const MIN_BODY_LINES = 10;
const MAX_SCAN_BYTES = 1_000_000;

// Files outside skill folders that say nothing about whether a repo is "skills first".
const NEUTRAL_PATH = [
  /(^|\/)(readme|license|licence|changelog|contributing|code_of_conduct|security|notice|authors)(\.[a-z]+)*$/i,
  /(^|\/)(claude|agents|cursor|gemini|codex|examples?)\.mdc?$/i,
  /^\.github\//,
  /^\.(gitignore|gitattributes|editorconfig|prettierrc.*|npmignore)$/,
  /^docs?\//,
  /^(tests?|evals?|examples?|benchmarks?)\//,
  // Agent/plugin config next to the skills (commands, hooks, manifests).
  /^\.(claude|claude-plugin|codex|cursor|agents|opencode|gemini)\//,
  /^(commands|agents|hooks|plugins)\//,
  /\.(png|jpe?g|gif|webp|svg|ico|mp4|mov|webm|mp3|wav|pdf|woff2?|ttf|otf)$/i,
];
const MEDIA_EXT = /\.(png|jpe?g|gif|webp|ico|bmp|mp4|mov|webm|mp3|wav|ogg|pdf|woff2?|ttf|otf|eot)$/i;
const BAD_BINARY_EXT = /\.(exe|dll|so|dylib|bin|wasm|jar|class|pyc|node|o|a|zip|tar|gz|tgz|bz2|xz|7z|rar|dmg|pkg|deb|rpm|msi|appimage)$/i;
const SCRIPT_EXT = /\.(sh|bash|zsh|fish|py|js|mjs|cjs|ts|mts|cts|jsx|tsx|rb|pl|php|ps1|psm1|bat|cmd|go|rs|lua|swift|kt|java)$/i;
const APP_CODE_EXT = /\.(py|js|mjs|cjs|ts|mts|cts|jsx|tsx|vue|svelte|rb|php|go|rs|swift|kt|java|c|cc|cpp|h|hpp|cs)$/i;
const TEST_PATH = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$/i;

// --- dangerous patterns: fail in scripts, flag in docs (docs often show them as
// install steps or as things to look out for) ---------------------------------
const DANGER = [
  { why: "runs a downloaded script", re: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba|z|da|k)?sh\b/ },
  { why: "runs a downloaded script", re: /\beval\s*\(?\s*["'`]?\$\(\s*(curl|wget)\b/ },
  { why: "runs a downloaded script", re: /\b(iex|Invoke-Expression)\b[^\n]*\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod|DownloadString)\b/i },
  { why: "runs a downloaded script", re: /\bexec\s*\(\s*(requests\.get|urllib\.request\.urlopen|urlopen)\(/ },
  { why: "runs a downloaded script", re: /\beval\s*\(\s*(await\s+)?\(?\s*(await\s+)?fetch\(/ },
  { why: "runs hidden code", re: /\b(base64\s+(-d|--decode)|xxd\s+-r)\b[^\n]*\|\s*(ba|z)?sh\b/ },
  { why: "runs hidden code", re: /\beval\s*\(\s*(atob|Buffer\.from)\(/ },
  { why: "runs hidden code", re: /\bexec\s*\(\s*(base64\.b64decode|codecs\.decode|zlib\.decompress)\(/ },
  { why: "reads secrets", re: /(~|\$HOME|\$\{HOME\}|homedir\(\)[^\n]{0,20})\/?\.(ssh|aws|gnupg|kube|docker)\b|\/\.git-credentials\b/ },
  { why: "reads secrets", re: /\bsecurity\s+(find|dump)-(generic-password|internet-password|keychain)\b|\blogin\.keychain\b/ },
  { why: "reads secrets", re: /\b(Cookies\.binarycookies|Login Data|Local State)\b|\/(Google\/Chrome|Chromium|BraveSoftware)\/[^\n]*\/(Cookies|Login Data)/ },
  { why: "edits shell startup files", re: /(>>?|\btee\s+(-a\s+)?)\s*["']?((~|\$HOME|\$\{HOME\})\/)?\.(bashrc|zshrc|bash_profile|zprofile|profile|zshenv)\b/ },
  { why: "edits shell startup files", re: /["'`](~|\$HOME)?\/?\.(bashrc|zshrc|bash_profile|zprofile|zshenv)["'`]/ },
  { why: "schedules itself to run", re: /\bcrontab\b|\/LaunchAgents\/|\/LaunchDaemons\/|\blaunchctl\s+(load|bootstrap)\b|\bsystemctl\s+(--user\s+)?enable\b/ },
];

// Long encoded data or minified code only fails when the same file can run code.
const BLOB = /[A-Za-z0-9+/]{1000,}={0,2}|(?:\\x[0-9a-fA-F]{2}){100,}|\b[0-9a-fA-F]{2000,}\b/;
const DATA_URI = /data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g;
const DYNAMIC_EXEC = /(?<![.\w])(eval|exec)\s*\(|\bnew\s+Function\s*\(|\bchild_process\b|\bsubprocess\b|\bos\.system\b|\|\s*(ba|z)?sh\b/;

// --- flags: kept, shown to the picker ----------------------------------------
const ENV_KEY = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_KEY|API_TOKEN|ACCESS_TOKEN|TOKEN|SECRET|SECRET_KEY|KEY)\b/g;
const PAID_API = /\b(openai|replicate|elevenlabs|fal\.ai|heygen|runwayml|midjourney|stability\.ai|perplexity|serpapi|firecrawl|apify|browserbase|exa\.ai|tavily|anthropic api|gemini api)\b/gi;
const HEAVY_INSTALL = /\b(docker\s+(run|build|compose|pull)|docker-compose|nvidia-smi|cuda|npm\s+(i|install)\s+(-g|--global)|pnpm\s+(add|install)\s+-g|pip3?\s+install|uv\s+(pip\s+install|tool\s+install)|brew\s+install|apt(-get)?\s+install|cargo\s+install|go\s+install)\b/gi;
const ENV_DUMP = /\bprintenv\b|\benv\s*(\||>)|process\.env(?![.[\w])|os\.environ(?!\s*\[|\.get|\.setdefault)|\bdict\(os\.environ\)/;
const KNOWN_HOSTS = /(^|\.)(github\.com|githubusercontent\.com|npmjs\.(com|org)|pypi\.org|pythonhosted\.org|localhost|127\.0\.0\.1|0\.0\.0\.0|example\.(com|org)|schema\.org|w3\.org|googleapis\.com|gstatic\.com|jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|json-schema\.org)$/i;

const INJECTION = /\bignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)\b|\bdisregard\s+(all\s+)?(previous|prior|your)\s+(instructions|rules)\b/i;
const SECRECY = /\b(do not|don't|never)\s+(tell|inform|show|mention\s+(this\s+)?to)\s+the\s+user\b|\bwithout\s+(telling|informing|asking)\s+the\s+user\b/i;
const BIDI = /[\u202A-\u202E\u2066-\u2069]/;
const ZERO_WIDTH = /[\u200B\u200C\u2060\u180E]|(?!^)\uFEFF/;
// Unfilled skill templates. Fill-in blanks like "[Your name]" are normal in output templates.
const PLACEHOLDER_NAME = /^(skill[-_ ]?)?(template|example|sample|placeholder|test|demo|my)([-_ ]?skill)?$/i;
const PLACEHOLDER_TEXT = /\b(insert (your )?instructions (here|below)|replace (this|me) with (a |the |your )?(description|instructions)|this is a (template|placeholder) skill)\b/i;
const PLACEHOLDER_DESC = /^(todo|tbd|placeholder|replace\b|a (short )?description\b|description of)/i;

/** Line number (1-based) of a character offset. */
function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Markdown with fenced code blocks blanked out (line numbers preserved). */
function proseOnly(md) {
  return md.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, (block) => block.replace(/[^\n]/g, " "));
}

function isScript(rel, text) {
  return SCRIPT_EXT.test(rel) || /^#!/.test(text);
}

/**
 * files: [{ rel, abs, size, symlink }] relative to the skill folder.
 * -> { name, description, lines, files, status: "pass"|"fail", flags[], reasons[] }
 */
export function checkSkill(files) {
  const reasons = [];
  const flags = [];
  const flag = (s) => flags.includes(s) || flags.push(s);
  const fail = (s) => reasons.includes(s) || reasons.push(s);

  // 1. A real skill file.
  const skillMd = files.find((f) => /^skill\.md$/i.test(f.rel));
  const text = skillMd && !skillMd.symlink ? readFileSync(skillMd.abs, "utf8") : "";
  const { data, body } = parseFrontmatter(text);
  const name = data?.name || null;
  const description = data?.description || null;
  const bodyLines = body.split("\n").filter((l) => l.trim()).length;
  const otherDocs = files.filter((f) => f !== skillMd && !f.symlink && /\.(md|mdx|txt)$/i.test(f.rel)).length;

  if (!skillMd || skillMd.symlink) fail("no SKILL.md file");
  else if (!data) fail("SKILL.md has no frontmatter");
  else {
    if (!name) fail("frontmatter has no name");
    if (!description) fail("frontmatter has no description");
    else if (description.length < 20) fail(`description too short (${description.length} chars)`);
    else if (PLACEHOLDER_DESC.test(description)) fail("placeholder description");
  }
  if (skillMd && !bodyLines && !otherDocs) fail("SKILL.md has no instructions");
  else if (skillMd && bodyLines < MIN_BODY_LINES) {
    flag(`short SKILL.md (${bodyLines} lines${otherDocs ? `, plus ${otherDocs} reference file(s)` : ""})`);
  }
  if (name && PLACEHOLDER_NAME.test(name)) fail(`placeholder skill name "${name}"`);
  if (PLACEHOLDER_TEXT.test(body)) fail("SKILL.md is an unfilled template");

  // 2. Safe to install and try.
  const envKeys = new Set();
  const paid = new Set();
  const installs = new Set();
  const hosts = new Set();
  let scripts = 0;

  for (const f of files) {
    if (f.symlink) {
      flag(`symlink ${f.rel} (not copied)`);
      continue;
    }
    if (MEDIA_EXT.test(f.rel)) continue;
    if (BAD_BINARY_EXT.test(f.rel)) {
      fail(`executable or archive in skill folder: ${f.rel}`);
      continue;
    }
    if (f.size > MAX_SCAN_BYTES) {
      flag(`large file not scanned: ${f.rel} (${Math.round(f.size / 1024)} KB)`);
      continue;
    }
    const buf = readFileSync(f.abs);
    if (buf.subarray(0, 8000).includes(0)) {
      flag(`binary data file: ${f.rel}`);
      continue;
    }
    const src = buf.toString("utf8");
    const script = isScript(f.rel, src);
    // Tests often contain attack strings on purpose; they only get flags.
    const test = TEST_PATH.test(f.rel);
    const isMd = /\.(md|mdx)$/i.test(f.rel);
    if (script) scripts++;

    for (const d of DANGER) {
      const m = d.re.exec(src);
      if (!m) continue;
      const where = `${f.rel}:${lineOf(src, m.index)}`;
      if (script && !test) fail(`${d.why} (${where})`);
      else flag(`${test ? "test" : "docs"} mention: ${d.why} (${where})`);
    }

    // Obfuscation. Inline data URIs (fonts, images) are fine.
    const plain = src.replace(DATA_URI, "");
    const blob = BLOB.exec(plain);
    const minified = script && !/\.min\.(js|css)$/i.test(f.rel) && plain.split("\n").some((l) => l.length > 5000);
    if (blob || minified) {
      const what = blob ? `long encoded blob (${f.rel}:${lineOf(plain, blob.index)})` : `minified code (${f.rel})`;
      if (script && !test && DYNAMIC_EXEC.test(plain)) fail(`${what} in a file that runs code`);
      else flag(what);
    }
    if (/\.min\.js$/i.test(f.rel)) flag(`ships minified JS: ${f.rel}`);
    if (BIDI.test(src)) (test ? flag : fail)(`hidden bidi control characters (${f.rel})`);
    if (ZERO_WIDTH.test(src)) flag(`zero-width characters (${f.rel})`);

    // Instructions aimed at the agent, outside code examples.
    if (isMd) {
      const prose = proseOnly(src);
      const inj = INJECTION.exec(prose);
      if (inj) {
        const where = `${f.rel}:${lineOf(prose, inj.index)}`;
        const quoted = /["“'‘`(]\s*$/.test(prose.slice(Math.max(0, inj.index - 3), inj.index));
        if (f === skillMd && !quoted) fail(`prompt injection (${where})`);
        else flag(`prompt-injection wording${quoted ? ", quoted" : ""} (${where})`);
      }
      const sec = SECRECY.exec(prose);
      if (sec) flag(`hides things from the user (${f.rel}:${lineOf(prose, sec.index)})`);
      if (f === skillMd && /<!--[\s\S]*?-->/.test(prose)) flag("HTML comment in SKILL.md (hidden from readers)");
    }

    if (script && ENV_DUMP.test(src)) flag(`reads the whole environment (${f.rel})`);
    for (const m of src.matchAll(ENV_KEY)) envKeys.add(m[0]);
    for (const m of src.matchAll(PAID_API)) paid.add(m[0].toLowerCase());
    for (const m of src.matchAll(HEAVY_INSTALL)) installs.add(m[0].replace(/\s+/g, " ").toLowerCase());
    if (script) {
      for (const m of src.matchAll(/\bhttps?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
        if (!KNOWN_HOSTS.test(m[1])) hosts.add(m[1].toLowerCase());
      }
    }
  }

  const list = (set, n = 6) => [...set].slice(0, n).join(", ") + (set.size > n ? `, +${set.size - n} more` : "");
  if (envKeys.size) flag(`needs keys: ${list(envKeys)}`);
  if (paid.size) flag(`mentions paid APIs: ${list(paid)}`);
  if (installs.size) flag(`installs: ${list(installs)}`);
  if (scripts) flag(`ships ${scripts} script file(s)`);
  if (hosts.size) flag(`scripts call: ${list(hosts)}`);

  return {
    name,
    description,
    lines: bodyLines,
    files: files.length,
    status: reasons.length ? "fail" : "pass",
    flags,
    reasons,
  };
}

/** Folders (repo-relative, "" = root) that hold a SKILL.md. */
function skillDirs(paths) {
  return paths.filter((p) => /(^|\/)skill\.md$/i.test(p)).map((p) => p.replace(/\/?[^/]*$/, "")).sort();
}

function inSkillDir(path, dirs) {
  return dirs.some((d) => d === "" || path.startsWith(d + "/"));
}

/** Share of repo files that live inside skill folders, ignoring neutral files outside them. */
export function skillShare(paths, dirs) {
  if (dirs.includes("")) return 1;
  const counted = paths.filter((p) => inSkillDir(p, dirs) || !NEUTRAL_PATH.some((re) => re.test(p)));
  if (!counted.length) return 1;
  const inside = counted.filter((p) => inSkillDir(p, dirs)).length;
  return Math.round((inside / counted.length) * 100) / 100;
}

/**
 * entry: { repo, description, hype }. index: catalogIndex() result or null.
 * -> { dropped: reason } | repo record for the pool (see candidates.schema.json).
 */
export async function scanRepo(entry, index) {
  let meta;
  try {
    meta = await gh(`repos/${entry.repo}`);
  } catch (e) {
    return { dropped: e.status === 404 ? "repo not found" : e.message };
  }
  if (meta.archived) return { dropped: "archived" };
  if (meta.fork) return { dropped: "fork" };

  const branch = await gh(`repos/${meta.full_name}/branches/${encodeURIComponent(meta.default_branch)}`);
  const commit = branch.commit.sha;
  const tree = await gh(`repos/${meta.full_name}/git/trees/${commit}?recursive=1`);
  const blobs = tree.tree.filter((t) => t.type === "blob");
  const paths = blobs.map((t) => t.path);
  const dirs = skillDirs(paths);
  if (!dirs.length) return { dropped: "no SKILL.md" };

  const share = skillShare(paths, dirs);
  const outsideCode = paths.filter(
    (p) => APP_CODE_EXT.test(p) && !inSkillDir(p, dirs) && !TEST_PATH.test(p) && !NEUTRAL_PATH.some((re) => re.test(p)),
  ).length;
  if (share < MIN_SKILL_SHARE && outsideCode > MAX_OUTSIDE_CODE) {
    return {
      dropped: `app, not a skill pack (${Math.round(share * 100)}% skill files, ${outsideCode} code files outside skill folders)`,
    };
  }

  const flags = [];
  const repoDir = join(PICK_DIR, "repos", meta.full_name.replace("/", "__"), commit);
  if (meta.size <= MAX_TARBALL_KB) await downloadRepo(meta.full_name, commit, repoDir);
  else {
    // Symlinks (mode 120000) and very large files stay behind.
    const wanted = blobs.filter((t) => t.mode !== "120000" && t.size <= MAX_FILE_BYTES && inSkillDir(t.path, dirs));
    if (wanted.length > MAX_FILES) return { dropped: `too many skill files to download (${wanted.length})` };
    const skipped = blobs.filter((t) => inSkillDir(t.path, dirs)).length - wanted.length;
    if (skipped) flags.push(`${skipped} symlink/large file(s) in skill folders not downloaded`);
    await downloadFiles(meta.full_name, commit, wanted.map((t) => t.path), repoDir);
  }

  const repoId = meta.full_name;
  const all = dirs.map((dir) => {
    const abs = dir ? join(repoDir, dir) : repoDir;
    // A skill's files stop where a nested skill folder starts.
    const nested = new Set(dirs.filter((d) => d !== dir && (dir === "" || d.startsWith(dir + "/"))).map((d) => join(repoDir, d)));
    const result = checkSkill(listFiles(abs, nested));
    // Ids are owner/repo/skill, so a "/" inside a frontmatter name becomes "-".
    const skillId = `${repoId}/${(result.name || (dir ? basename(dir) : meta.name)).replace(/\//g, "-")}`;
    return { skill_id: skillId, path: dir, has_page: index ? index.skills.has(skillId.toLowerCase()) : null, ...result };
  });

  // The same skill copied for several agents (claude/, codex/…): keep the shortest path.
  const byId = new Map();
  for (const s of all.sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path))) {
    const k = s.skill_id.toLowerCase();
    if (!byId.has(k)) byId.set(k, s);
    else byId.get(k).copies = (byId.get(k).copies || 0) + 1;
  }
  const skills = [...byId.values()].map(({ copies, ...s }) => {
    if (copies) s.flags.push(`also copied at ${copies} other path(s)`);
    return s;
  });

  if (!meta.license || meta.license.spdx_id === "NOASSERTION") flags.push("no license");
  if (tree.truncated) flags.push("file tree truncated by GitHub");

  return {
    repo: repoId,
    description: meta.description || entry.description || null,
    in_catalog: index ? index.collections.has(repoId.toLowerCase()) : null,
    stars: meta.stargazers_count,
    license: meta.license && meta.license.spdx_id !== "NOASSERTION" ? meta.license.spdx_id : null,
    created_at: (meta.created_at || "").slice(0, 10) || null,
    pushed_at: (meta.pushed_at || "").slice(0, 10) || null,
    commit,
    files_dir: repoDir,
    hype: entry.hype,
    skill_share: share,
    flags,
    skills,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    log("Usage: pick-check.mjs <local skill folder>");
    process.exit(2);
  }
  process.stdout.write(JSON.stringify(checkSkill(listFiles(dir)), null, 2) + "\n");
}
