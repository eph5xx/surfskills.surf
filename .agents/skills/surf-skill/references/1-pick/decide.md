# Pick: decide

You are the picker. Choose one skill, or "none".

Your pick becomes a "skill of the day": a card on surfskills.surf with a short video of an agent using the skill. If the repo is new to the catalog, the pick also adds it to the catalog. That is the best outcome.

## Gate

Reject a skill if any of these is true:

1. **Skills aren't the repo's main product.** The repo is an app, a tool or a framework, and the skill only teaches an agent how to use it. The scripts drop obvious apps; you catch the rest.
2. **It can't run in a throwaway container without accounts.** It needs a paid service, an API key, a login, private data, or special hardware. Start from the flags (`needs keys`, `mentions paid APIs`, `installs`), then read the SKILL.md. A key that is only optional is fine.
3. **It isn't finished.** The steps are vague, it refers to files that aren't there, or it says "coming soon".
4. **A flag points at a risk that the SKILL.md doesn't explain**, such as unknown hosts, reading the whole environment, or hidden text.

## Rank

Rank what's left in this order:

1. **No paid accounts.** It works fully with free, local tools.
2. **Looks good on video.** It makes something visible within a few minutes: a web page, slides, an image, a chart, a designed document, a clear before and after. Skills that only change how the agent thinks or codes are hard to show.
3. **Useful to many.** It solves a common task, not a niche one.
4. **Hype.** On more lists, at higher positions, with more stars gained. A young repo counts extra.
5. **New.** A repo that is new to the catalog is a plus. So is a skill without a page yet.

Hype breaks ties between good skills. It never rescues a skill that fails the gate.

## Inside a pack

Packs often have one or two finished skills and many thin ones. A finished skill has concrete steps, an example of what goes in and what comes out, and it actually uses the scripts or references it ships.

## How to look

1. Read the digest. Shortlist 3–6 skills from names, descriptions, flags and hype. Don't open every skill in a 200-skill pack.
2. Open each shortlisted SKILL.md (the digest's `Files` folder plus the skill folder). Glance at its references and scripts.
3. Choose.

## Answer

- **One pick:** a `skill_id` from the digest and a `why` of 1–3 sentences: what it makes, why it will look good, and the hype. Then save it (README step 4).
- **"none":** one sentence on why. Then go to the fallback (README step 3).
