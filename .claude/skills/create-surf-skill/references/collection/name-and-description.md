# Name & description guide — the collection's name, blurb, and site link

Covers the naming fields under `steps.card.collection`: `name`, `shortDescription`, and
`websiteURL`. These name the **whole toolkit** — the set of skills in the repo as one installable
thing — not any single skill. For `longDescription`/`whenToUse`/`faq` see their own guides in
[`../sections/`](../sections/). Voice, hype, and the hard blurb limit live in
[`../shared/voice.md`](../shared/voice.md); read it first.

## Never state the number of skills (IMPORTANT)

No "45 marketing skills", "20 skills", "a suite of six". The roster changes as skills are added or
removed, and a hard-coded count silently goes stale and outlives the edit. Name the throughline
instead ("marketing skills for SEO, ads, and analytics", not "47 marketing skills"). A count of a
*product feature* that is part of the toolkit's identity (for example "33 documented AI-writing
tells") is fine — the ban is on the skill count.

## The fields

These land on the collection landing page `/s/<owner>/<repo>` and head **every sibling skill
page** in the repo — you are editing the shared masthead. The mirror-the-live-row protocol is in
[`card-guide.md`](card-guide.md) §check-the-live-catalog.

**`collection.name`** — the H1: the display name from the README H1, stripped of badges, shields,
and emoji. Title Case, the toolkit's own name. If the H1 is a bare repo slug like `acme/toolkit`,
do not use the slug: take the prose title from the first paragraph ("Toolkit is a set of…" becomes
`Toolkit`). It is a name, not a tagline and not a feature list.

**`collection.shortDescription`** — 1 to 2 sentences naming what the whole toolkit is plus the
outcome it delivers across its skills. Capture the throughline that unites the roster, not one
skill's feature, and not a skill count; if it only fits one skill in the repo, it is too narrow.
The H1 sits above it, so don't reintroduce the name.

**`collection.websiteURL`** — the hero's "Visit site" link: a real product or landing page found
in the README, else `null`. Not the GitHub repo, not a docs or wiki URL, not a badge target, and
never a guessed domain. The `steps.enrich.collection.homepage` value is a hint to verify, not an
answer to trust. When in doubt, `null`.

## Examples

Name — bad: `awesome-dev/marketing-skills` (bare slug, unreadable). Good: `Marketing Skills` (the
prose title from paragraph 1).

Blurb — bad: "47 marketing skills that seamlessly handle all your marketing needs, empowering teams
with a powerful all-in-one suite." (skill count, "seamlessly/powerful/all-in-one", vague). Good:
"Turn your AI coding agent into a marketing team: copy, SEO, ads, and lifecycle emails, each a
working playbook you run on your own site." (No count, names the throughline, stands alone, under
200 chars, passes humanizer.)
