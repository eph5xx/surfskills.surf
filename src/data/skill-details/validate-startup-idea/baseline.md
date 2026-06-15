---
# Provenance for the "without skill" baseline shown on the skill detail page.
# Generated 2026-06-10 by dispatching TWO parallel Claude runs with the identical
# prompt and pre-committing (before launch) to publishing whichever finished
# first, verbatim — no retries, no editing, no cherry-picking.
model: "Claude (Fable 5)"
modelId: "claude-fable-5"
date: "2026-06-10"
selectionPolicy: "First completed of two parallel runs · no retries · published verbatim"
durationSeconds: 58
prompt: |
  Evaluate this startup idea.

  Problem: AI output is mediocre by default, and people can't judge skill quality before wasting hours. Skills promise the fix but are black boxes — no visible result before install, no provenance, and real security risk. SKILL.md just standardized the format across Claude and Gemini, one-click install shipped, and supply exploded on GitHub with no quality layer on top.

  Solution: SurfSkills — the trusted library of AI skills ("Mobbin for AI skills"). Extract working skills and demand signal from GitHub, verify each through a pipeline (sandboxed run, security audit, live before/after demo — only verified skills hosted, the demo is the product page), and distribute via programmatic SEO where every demo doubles as a landing page. Wedge: solo founders (decks, landing pages, launch assets), where before/after is visceral. Why it wins: usage data feeds extraction and evals, the demo library compounds into owned distribution, trust brand sits on top. Any skill is clonable; the flywheel isn't. Demos free, subscription unlocks the library.

  Answer directly in markdown. Do not use any tools.
---

# SurfSkills — Evaluation

## Verdict up front

**Strong problem instinct, well-timed, but the business model as stated leaks value, and the biggest risk — platform absorption — is unaddressed.** This is a "great wedge, fragile castle" idea. I'd pursue it, but with a different monetization thesis than "Mobbin for skills."

---

## What's genuinely good

**Timing is the best part.** Format standardization + one-click install + supply explosion + zero trust layer is the classic aggregator setup (npm → Socket, apps → App Annie, designs → Mobbin). You've correctly identified the ~12–18 month window where supply outruns curation.

**Demo-as-product-page is the right insight.** Skills are experience goods — you can't evaluate them from a README. Making the before/after demo the landing page collapses evaluation cost to zero and doubles as SEO inventory. That's a real mechanic, not a slogan.

**The verification pipeline is real work nobody wants to do.** Sandboxed runs + security audit is genuinely valuable and genuinely tedious. Tedious-but-valuable is a decent moat ingredient.

## Where it breaks

**1. The content doesn't stay behind the paywall.** This is the core flaw in the Mobbin analogy. Mobbin's asset (thousands of curated app screenshots) is laborious to recreate and useless to "copy" from a glance. A skill is a text file — once your demo proves skill X works, the user finds it on GitHub in 30 seconds. You're charging for an index of free, one-search-away goods. Your paid tier monetizes *judgment*, but judgment leaks through the free demos you need for SEO. Expect high traffic, low conversion.

**2. Platform risk is existential, not incidental.** The trust layer for a platform's extension format is the single thing the platform owner is most incentivized to own — Anthropic already curates official skill repos and plugin marketplaces, and a "verified" badge program from them ends your trust brand in one announcement. Third-party trusted stores for someone else's ecosystem (Chrome extensions, App Store) have a near-perfect mortality rate. You need an answer better than "we'll move fast."

**3. The flywheel is asserted, not mechanized.** "Usage data feeds extraction and evals" — *what* usage data? A library with demos doesn't observe usage. You only get telemetry if you own the install path or runtime, and the pitch doesn't claim either. As written, the flywheel is: SEO → traffic → ...traffic. That's a media business, not a data moat.

**4. Verification decays.** A skill's quality is a function of (skill × model version × task). Every model release silently invalidates your evals; your "verified" badge has a shelf life measured in weeks. This is either a crippling cost center or — reframed — your actual product (continuous re-evaluation is the thing nobody else will maintain). The pitch treats it as a one-time gate, which is the wrong frame.

**5. Wedge audience mismatch.** Solo founders want *a deck*, not *a skill that makes decks*. The user who knows what SKILL.md is and the user making launch assets are mostly different people. The skill-aware buyer today is a developer; the visceral-before/after buyer is a non-technical founder. Picking the second to sell the first's infrastructure risks landing in prompt-marketplace territory — a historically dead category (PromptBase et al.).

**6. "Verified safe" is a liability, not just a badge.** The first verified skill that exfiltrates someone's env vars makes your trust brand a defendant. Security verification of arbitrary code+prompts is an arms race; budget for it like one.

## What I'd change

- **Monetize trust to businesses, not access to individuals.** The Socket.dev analogy fits better than Mobbin: enterprises will pay real money to govern which skills their employees/agents can install. "Demos free, library paid" becomes "demos free, *governance and continuous re-verification* paid." That also survives an official marketplace, because platforms certify for themselves, not for your compliance team.
- **Own the install path.** `surfskills install X` (or a registry endpoint) is the difference between a website and a flywheel. That's where telemetry, version pinning, and re-verification alerts live — and it's the part that's actually hard to clone.
- **Keep the solo-founder wedge as SEO bait, not as the buyer.** The before/after demos are top-of-funnel content. Fine. But qualify the real customer fast.

## Bottom line

| Dimension | Read |
|---|---|
| Problem | Real and worsening — 8/10 |
| Timing | Excellent — 9/10 |
| Wedge/demo mechanic | Clever — 7/10 |
| Moat as stated | Weak; asserted flywheel — 4/10 |
| Business model | Leaky paywall — 4/10 |
| Platform risk | Unaddressed, existential — 3/10 |

**Pursue, with surgery:** keep the demo-library and pSEO engine, swap the prosumer subscription for an install-path + enterprise-governance model, and have a written answer to "what happens the day Anthropic ships Verified Skills." The opportunity window is real; the current shape of the business doesn't capture it.
