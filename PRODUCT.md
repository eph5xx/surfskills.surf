# Product

## Register

brand

## Users

Non-technical builders — people building with AI coding tools (Claude Code and
similar agents) who don't have a developer background. They arrive skeptical
and time-poor: they can't audit a skill's source themselves, so they need the
site to do the vetting for them. The job to be done: find a skill that
demonstrably works, understand what it does in plain language, and get it
installed without touching anything that feels like a developer workflow.

## Product Purpose

surfskills.surf is a directory of verified AI coding skills, each shown
actually working via a real demo video. The marketing site sells a
subscription (Polar) that gates skill downloads; the catalog itself lives in
Supabase and is browsable at /discover with per-skill pages at /s/**. Success
looks like: a visitor watches a demo, believes it, subscribes, and installs a
skill — without ever feeling like they wandered into a dev tool.

## Brand Personality

Warm, proven, unhurried. Golden-hour surf energy: friendly guide, not
salesperson. Evidence does the selling — demo videos and verification are the
substance; the warm retro-surf palette (sand, burnt sienna, vintage teal,
sunlit gold) is the voice. Copy is plain-language and jargon-free; the tone
never rushes or pressures.

## Anti-references

- **Dev-tool dark mode**: terminal-black, monospace-everywhere, neon-accent
  AI/devtool aesthetic. This site is for people intimidated by that look.
- **Generic SaaS landing**: gradient heroes, hero-metric cards, identical
  feature grids, stock-photo polish.
- **Sketchy marketplace**: crowded listings, aggressive badges and upsells,
  affiliate-blog energy — anything that undermines the verified-and-vetted
  trust claim.
- **Corporate enterprise**: navy B2B tone, whitepaper vibes, suit-speak.

## Design Principles

1. **Show, don't tell.** Every skill is proven with a real demo of it working.
   Prefer showing the artifact over describing it; claims without evidence
   don't ship.
2. **Plain words, no jargon.** Non-technical builders are the audience. If a
   label needs developer context to parse, rewrite it.
3. **Evidence over hype.** Verification, demos, and honest framing sell the
   subscription. No superlatives, no urgency mechanics, no dark patterns.
4. **Golden hour, not neon.** The warm surf identity is the differentiator
   from every dark-mode dev tool. Protect it — new surfaces inherit the warmth
   rather than drifting toward techy defaults.
5. **Unhurried by design.** Calm pacing, generous space, no pressure.
   Browsing the directory should feel like a beach walk, not a bazaar.

## Accessibility & Inclusion

- WCAG 2.1 AA: ≥4.5:1 body-text contrast, keyboard navigable, visible focus.
- `prefers-reduced-motion` alternatives for every animation.
- Explicit care for autoplaying skill demo videos: poster fallbacks,
  accessible labels, muted autoplay only, no motion traps, and pause/stop
  affordances where videos loop.
