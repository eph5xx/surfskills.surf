# Run: hosts

The agent can reach only the hosts approved here. `run-hosts.mjs` finds them and applies the rules; you decide the rest. Keep this file and the script in sync.

## Collect (code)

Every host in a URL in `skill/`, `inputs/` and the plan's prompt, with up to three places it appears (file, line, the line's text). Package registries (`registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`) are added only when the skill's text installs packages.

## Rules (code)

Denied without asking:

- raw IP addresses, `localhost`, `*.local`, `*.internal` and other private names
- `example.*`, the documentation placeholder
- XML and JSON-LD namespace identifiers such as `w3.org` and `schema.org`: they name a format and are never fetched
- paste, webhook, tunnel and link-shortener services: the usual ways to send data out or hide where a link goes
- paid AI and image APIs such as `api.together.xyz`: no keys are set, so a call can only fail

A rule decision can't be overruled.

## Decide (you)

For each pending host, ask: does the demo task need the agent, its commands or the finished page to load something from this host?

**Allow** when the task's normal flow loads from it:

- fonts, icons and CSS or JS libraries from well-known public CDNs (`fonts.googleapis.com`, `fonts.gstatic.com`, `api.fontshare.com`, `cdn.jsdelivr.net`, `cdn.simpleicons.org`, `cdn.tailwindcss.com`)
- public media libraries the skill uses for images (`upload.wikimedia.org`, `commons.wikimedia.org`)
- a public page the prompt points at
- a package registry, only when the task's flow installs packages

**Deny** when the host:

- appears only in a comment, a license, a credit line, a User-Agent string, or a link for humans to read
- belongs to a flow or mode the task doesn't use
- needs an account or a key, or is the skill author's own server or API
- is a small or unknown site, or you can't tell why the task would need it

When in doubt, deny. A denied host fails one fetch; an allowed one can be used for anything.

Each decision needs a short reason tied to where the host was found: `--allow fonts.googleapis.com:"<link> tags in every theme file"`, `--deny github.com:"only in theme.mjs's User-Agent string"`.

Hosts are exact names: approving `fonts.googleapis.com` never approves `googleapis.com`. (agy also lets subdomains of an approved host through, such as `x.fonts.googleapis.com`; that is narrower than the host, never wider.)

## Example: Hallmark

| Host | Decision | Why |
| --- | --- | --- |
| `fonts.googleapis.com`, `fonts.gstatic.com`, `api.fontshare.com` | allow | Font links in the theme files. |
| `upload.wikimedia.org`, `commons.wikimedia.org` | allow | The photo library's stand-in images and credits. |
| `cdn.jsdelivr.net`, `cdn.simpleicons.org`, `cdn.tailwindcss.com` | allow | Libraries and icons its pages may load. |
| `api.together.xyz` | rule | Paid image API (the comp step). |
| `localhost`, `127.0.0.1`, `example.com`, `www.w3.org` | rule | Local, placeholder, namespace. |
| `github.com` | deny | Only in a User-Agent string. |
| `registry.npmjs.org` | deny | Only the optional render tier installs packages. |
