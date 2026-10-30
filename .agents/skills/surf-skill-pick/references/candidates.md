# Pick: candidates

Where candidates come from, and what the digest tells you. Done by `scripts/pick-candidates.mjs`.

## Sources

1. **Trending (first choice).** Four public lists:
   - trendshift.io, today and this week: list position, 1 = top. Trendshift ranks repos by momentum.
   - github.com/trending, today and this week: stars gained in that period.

   A repo can be on several lists. The digest sorts repos by how many lists they're on, then by stars gained.
2. **Catalog (fallback).** The skill packs already on surfskills.surf (Supabase `collections`). No hype numbers here, so they're sorted by total stars. Most packs have only 1–2 really finished skills; finding them is the job.

## From repo to skills

For each repo the script:

1. Drops it if it has no SKILL.md, is archived, or is a fork.
2. Drops apps that ship a skill on the side: less than 30% of the files are skill files **and** there are more than 30 code files outside the skill folders.
3. Downloads the rest at the latest commit of the default branch into `cards/.pick/repos/<owner>__<repo>/<commit>/`. For very big repos it downloads only the skill folders.
4. Runs the [basic checks](checks.md) on every folder that holds a SKILL.md.
5. Lists a skill only once when it is copied for several agents (`claude/`, `codex/`…).

## Files

- `cards/.pick/<date>-<source>.json`: the full pool (`assets/candidates.schema.json`). It includes failed skills and dropped repos, each with a reason. It is built once a day and then reused.
- `cards/.pick/<date>-<source>.md`: the digest. It lists passing skills only, minus skills that already have a card. Rewritten on every run.

## Reading the digest

Per repo:

- **NEW to catalog** or **in catalog**: whether surfskills.surf already lists the repo.
- **Hype**: `trendshift today #N` and `trendshift this week #N` (lower is hotter), `+N stars today` and `+N stars this week`.
- **Created**: a young repo with big numbers is fresh hype. An old repo back on the list is a revival.
- **License**, **% skill files**, **repo flags**.
- **Files**: the local copy. A skill's SKILL.md is at `<Files>/<skill folder>/SKILL.md`.

Per skill: the `skill_id`, its folder, the SKILL.md length in lines, **has page** when it already has a page on surfskills.surf, its description, and its flags.
