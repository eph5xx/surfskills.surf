// Pick's own helpers: card folder names and which skills already have one.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CARDS_DIR, readJSON } from "./shared/core.mjs";

/** `owner/repo/skill` -> `owner__repo__skill`, filesystem-safe. */
export function cardDirName(skillId) {
  return skillId.split("/").join("__").replace(/[^A-Za-z0-9._-]/g, "-");
}

/** Lowercased skill ids that already have a card folder (published or dropped). */
export function featuredSkillIds() {
  const ids = new Set();
  if (!existsSync(CARDS_DIR)) return ids;
  for (const ent of readdirSync(CARDS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const pickPath = join(CARDS_DIR, ent.name, "pick.json");
    let id = null;
    try {
      id = readJSON(pickPath).skill_id;
    } catch {
      /* no pick.json: fall back to the folder name */
    }
    ids.add((id || ent.name.split("__").join("/")).toLowerCase());
  }
  return ids;
}
