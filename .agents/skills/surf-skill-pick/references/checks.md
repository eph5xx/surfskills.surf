# Pick: basic checks

Mechanical checks that answer two questions. Is this a real skill? Is it safe to install and try? Done by `scripts/pick-check.mjs`; keep this file and the script in sync.

- A **fail** removes the skill from the digest.
- A **flag** keeps the skill and tells the picker something worth weighing.

Nothing is ever run. Files are only read as text.

## A real skill file

Fail when:

- There is no SKILL.md, or it has no frontmatter.
- The frontmatter has no `name` or no `description`.
- The description is shorter than 20 characters, or is a placeholder ("TODO", "Replace…").
- SKILL.md has no instructions and there are no other docs in the folder.
- It is an unfilled template: a name like `template-skill` or `example`, or text like "Insert instructions here".

Flag when SKILL.md is short (under 10 lines).

## Safe to install and try

Fail when a script does any of these. In docs and tests they are only flags, because docs show install steps and tests contain attack strings on purpose.

- Runs a downloaded script: `curl … | sh`, `eval "$(curl …)"`, `iex (iwr …)`, `exec(requests.get(…))`.
- Runs hidden code: `base64 -d | sh`, `eval(atob(…))`, `exec(b64decode(…))`.
- Reads secrets: `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.kube`, `~/.docker`, `.git-credentials`, the keychain, browser cookies or saved passwords.
- Edits shell startup files (`.bashrc`, `.zshrc`, `.profile`…).
- Schedules itself: `crontab`, LaunchAgents, `launchctl`, `systemctl enable`.
- Has a long encoded blob or minified code in a file that also runs code (`eval`, `exec`, `subprocess`, `child_process`, `| sh`).

Also fail when:

- The skill folder holds executables or archives (`.exe`, `.so`, `.dylib`, `.wasm`, `.jar`, `.pyc`, `.zip`, `.tar.gz`…).
- A file has hidden bidi control characters (tests excepted).
- SKILL.md tells the agent to "ignore previous instructions" (or similar), and doesn't quote it as an example.

## Flags

- `needs keys`: env vars like `FOO_API_KEY`, `*_TOKEN`, `*_SECRET`.
- `mentions paid APIs`: OpenAI, Replicate, ElevenLabs, fal.ai, Firecrawl and others.
- `installs`: docker, pip, brew, global npm, cargo and others.
- `ships N script file(s)`, `scripts call: <hosts>` (hosts other than GitHub, npm, PyPI, common CDNs).
- `reads the whole environment`.
- Encoded blob or minified code in a file that doesn't run code, minified JS, binary data files, files too large to scan.
- Zero-width characters, an HTML comment in SKILL.md, prompt-injection wording that is quoted or outside SKILL.md, text that hides things from the user.
- Symlinks. They are never copied.
- `docs mention` / `test mention`: something from the fail list, found outside scripts.
- `also copied at N other path(s)`.

Repo flags: no license, file tree truncated by GitHub, files not downloaded (symlinks or files over 5 MB).

## Limits

Pattern checks can miss things, and they can misfire. Every fail and every dropped repo has a reason in the pool JSON. Read those reasons before you tune a rule.
