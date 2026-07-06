---
name: Surf Skills
description: A warm golden-hour directory of verified AI skills, proven by real demo videos.
colors:
  burnt-sienna: "#dd6b4d"
  vintage-teal: "#3d5a80"
  sunlit-gold: "#f2b134"
  bleached-sand: "#fcf9f5"
  sand-dollar: "#f4eae1"
  sand-line: "#e7d9c8"
  wetsuit-black: "#2a2c41"
  deep-plum: "#1c1a28"
  sea-info: "#4f7396"
  sage-success: "#6f8f4f"
  ember-error: "#b8442f"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(40px, 8.5vw, 92px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  field: "0.5rem"
  thumb: "0.75rem"
  box: "1rem"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.burnt-sienna}"
    textColor: "{colors.deep-plum}"
    rounded: "{rounded.field}"
  button-primary-pill:
    backgroundColor: "{colors.burnt-sienna}"
    textColor: "{colors.deep-plum}"
    rounded: "{rounded.pill}"
  button-neutral:
    backgroundColor: "{colors.bleached-sand}"
    textColor: "{colors.wetsuit-black}"
    rounded: "{rounded.field}"
  badge-verified:
    backgroundColor: "{colors.sunlit-gold}"
    textColor: "{colors.wetsuit-black}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.bleached-sand}"
    textColor: "{colors.wetsuit-black}"
    rounded: "{rounded.box}"
---

# Design System: Surf Skills

## 1. Overview

**Creative North Star: "The Golden Hour Beach Walk"**

Every surface on surfskills.surf should feel like browsing at the end of a warm afternoon: unhurried, friendly, and lit from the side. The audience is non-technical builders who arrive skeptical of anything that looks like a developer tool, so the system trades the entire dev-tool visual vocabulary (dark terminals, monospace, neon) for a retro-surf palette of sand, burnt sienna, vintage teal, and sunlit gold. Evidence does the selling: the most important visual object on any page is a real demo video of a skill working, and the design's job is to frame that evidence calmly, never to shout over it.

The system explicitly rejects four worlds named in PRODUCT.md: dev-tool dark mode, the generic SaaS landing page, the sketchy marketplace, and corporate enterprise polish. Density stays low, pacing stays calm, and nothing pressures. Components are friendly and sun-rounded — pill navigation buttons, generously rounded cards, soft diffuse shadows that read as light rather than structure.

**Key Characteristics:**
- Warm sand-on-sand layering: cards in Bleached Sand sit one tonal step above the Sand Dollar page.
- One display voice (Bricolage Grotesque at regular weight) over a plain, legible body (Onest).
- Demo video thumbnails are the hero imagery; the palette frames them, never competes.
- Pill shapes and 1rem+ radii everywhere a hand might land.
- Shadows are afternoon light: very diffuse, long-throw, never hard-edged.

## 2. Colors: The Golden Hour Palette

A warm, sunlit light-mode palette — three saturated surf-era brand colors over a ramp of sand neutrals, mapped onto DaisyUI semantic slots in [src/styles/globals.css](src/styles/globals.css).

### Primary
- **Burnt Sienna** (#dd6b4d): the action color. Primary buttons, hover states on links and nav, the active segment in toggles. It is the "do this next" voice — warm, not alarming.

### Secondary
- **Vintage Teal** (#3d5a80): the supporting brand color. Secondary badges and accents where a second voice is needed without competing with sienna. Used sparingly.

### Tertiary
- **Sunlit Gold** (#f2b134): the trust color. Verified/pass/free badges and the hero "Last updated" badge, always with Wetsuit Black text. Gold is a brand signal, not a semantic warning — see the named rule below.

### Neutral
- **Bleached Sand** (#fcf9f5): surfaces — cards, the header bar, dropdowns, buttons at rest. Also the text color on teal and dark-sienna banner fills; on flat Burnt Sienna fills (buttons) the ink is Deep Plum instead, for AA contrast.
- **Deep Plum** (#1c1a28): the sanctioned dark — the demo-video canvas, and the ink on flat Burnt Sienna fills.
- **Sand Dollar Beige** (#f4eae1): the page background. The whole site sits on this warm sand, one tonal step below the cards.
- **Sand Line** (#e7d9c8): borders, hairlines, and dividers. Always 1px.
- **Wetsuit Black** (#2a2c41): all text. A deep ink-navy, not pure black — softer against sand. Muted text uses opacity steps of this same ink (70% body-secondary, 55–60% captions, 35–40% decorative icons).

Semantic states: **Sea Info** (#4f7396), **Sage Success** (#6f8f4f), **Ember Error** (#b8442f). Warning shares Sunlit Gold's value but with warning semantics only in true alert contexts.

### Named Rules
**The Gold Means Verified Rule.** Sunlit Gold is reserved for the brand claims "verified / pass / free." True semantic success states use Sage Success instead. Never use gold as a generic highlight.

**The One Step Down Rule.** The page background is always Sand Dollar Beige (base-200); cards and raised surfaces are always Bleached Sand (base-100). Depth comes from stepping the sand ramp, not from darkening with gray.

## 3. Typography

**Display Font:** Bricolage Grotesque (variable, opsz 12–96, wght 400–700; falls back to system-ui)
**Body Font:** Onest (400/500/600/700; falls back to system-ui)

**Character:** Bricolage's quirky, humanist grotesque carries the retro-surf warmth at regular weight — friendly without being cartoonish. Onest stays out of the way: plain, rounded, highly legible for an audience that distrusts jargon. No serif, no monospace, anywhere.

### Hierarchy
- **Display** (400, clamp(40px, 8.5vw, 92px), line-height 0.98, letter-spacing -0.02em): the hero headline only. Regular weight at huge size is the signature move — big but not loud. The 40px floor is for phones: at a 52px floor a 375px viewport rewraps the headline into four ragged lines.
- **Headline** (400, 28px mobile / 31–34px desktop, tight leading): section headings. All h1–h4 default to Bricolage at weight 400 via the base layer.
- **Title** (600, 22px, snug): skill card and list-item titles — the one place display type goes semibold, so skill names pop in a grid.
- **Body** (400, 16px, line-height 1.6): paragraphs, capped around 700px (~70ch) measure. Secondary body text is Wetsuit Black at 70% opacity.
- **Label** (500–600, 13–15px): UI chrome — nav links (15px semibold), badges, filter labels, footer links. Sentence case, never uppercase-tracked.

### Named Rules
**The Regular Weight Rule.** Headings are weight 400 by default. Boldness comes from size and Bricolage's character, not from heavy weights. Semibold is reserved for card titles and UI labels.

## 4. Elevation

Depth is afternoon light, not architecture. Layering starts tonally (The One Step Down Rule: Bleached Sand surfaces on the Sand Dollar page, Sand Line 1px borders), and shadows are added as soft, very diffuse, long-throw washes that read as ambient sunlight. There is no hard-edged or short-blur shadow anywhere in the system. The sticky header and footer add `backdrop-blur` over translucent Bleached Sand (80% / 70%) — glass used functionally for floating chrome, never decoratively.

### Shadow Vocabulary
- **Chrome** (`shadow-md`, DaisyUI/Tailwind default): the sticky navbar card and dropdown menus.
- **Resting card** (`box-shadow: 0 1px 2px rgba(42,44,65,0.04), 0 22px 46px -32px rgba(42,44,65,0.5)`): featured/collection cards and the skill sidebar (`0 24px 50px -36px`) — a whisper of contact plus a long soft throw, always tinted with Wetsuit Black, never pure black.
- **Media frame** (`box-shadow: 0 30px 70px -28px rgba(42,44,65,0.55)`): the large demo-video player on skill pages; the deepest shadow in the system, reserved for the evidence itself.
- **CTA glow** (`box-shadow: 0 10px 26px -12px var(--color-primary)`): sienna-tinted warmth under high-intent subscribe/download buttons — the light of the button itself, used only on the money CTA.

### Named Rules
**The Afternoon Light Rule.** Every shadow is heavily blurred with a large negative spread and ink-navy tint. If a shadow has a visible edge, it is wrong.

## 5. Components

Friendly and sun-rounded: DaisyUI primitives themed by the goldenhour theme, with pill shapes wherever a hand lands.

### Buttons
- **Shape:** DaisyUI field radius (0.5rem) by default; header CTAs and filter controls override to full pills (999px).
- **Primary:** Burnt Sienna fill, Deep Plum ink text (`btn btn-primary`) — sand text on sienna is only 3.2:1, plum reaches 5.4:1 (WCAG AA). Hover brightens the fill toward the sun instead of DaisyUI's default darken, which would sink the plum ink back below 4.5:1. Sizes: `btn-sm` pill in the header ("Join for free"), `btn-lg` in the hero. High-intent purchase CTAs go full-width with 14px radius and the sienna CTA glow. Saturated *banner surfaces* (the collection hero's darker sienna gradient) keep Bleached Sand `primary-content` text, which passes there.
- **Hover / Focus:** DaisyUI's default darken-on-hover and focus ring; links and nav items shift to Burnt Sienna on hover.
- **Neutral / Ghost:** default `btn` is a Bleached Sand-toned neutral (paired next to the primary in the hero); `btn-ghost` for icon-only chrome like the mobile menu toggle.

### Chips / Badges
- **Style:** DaisyUI badges, pill-shaped. `badge-accent` (Sunlit Gold on Wetsuit Black) = verified/free/updated trust signals. `badge-ghost` at 60% ink = quiet category tags on skill cards.
- **State:** active filter selections render as removable chips above Discover results; the segmented view toggle marks its active option with a Burnt Sienna pill.

### Cards / Containers
- **Corner Style:** 1rem (`rounded-box`) standard; featured surfaces go softer still (1.25–1.6rem); video thumbnails 0.75rem (`rounded-xl`).
- **Background:** Bleached Sand on the Sand Dollar page, always one tonal step up.
- **Shadow Strategy:** flat with a 1px Sand Line border for utility cards (filter rail); the resting-card shadow for featured/collection surfaces (see Elevation).
- **Internal Padding:** 1rem–1.25rem utility, 1.5rem featured, up to 3rem for hero-scale collection banners.
- **Skill card:** the workhorse — a 16:9 autoplaying muted demo video in a rounded thumb, then a 22px semibold Bricolage title beside a ghost category badge. Whole card is the link; hover lifts it 2px (`hover:-translate-y-0.5`). Unavailable skills render at 80% opacity, pointer-events off, with a "Demo coming soon" placeholder.

### Inputs / Fields
- **Style:** DaisyUI `input` at 0.5rem radius on translucent Sand Dollar (`bg-base-200/60`), with an inline 16px search icon at 40% ink; 14px text.
- **Focus:** DaisyUI's default focus outline in the field's color.

### Navigation
- **Style:** a sticky floating card — `rounded-box` navbar in 80% Bleached Sand with backdrop blur, 1px Sand Line border, and the chrome shadow, inset 12px from the top.
- **Typography:** 15px semibold Onest links; current page and hover state in Burnt Sienna.
- **Mobile:** DaisyUI dropdown menu card below a ghost hamburger; auth CTAs stay visible as pills.
- **Footer:** full-bleed translucent Bleached Sand with backdrop blur and a Sand Line top border; quiet 60–70% ink links that warm to sienna on hover.

### Demo Video Frame (signature)
The evidence surface. Skill pages present the demo in a large 16:9 player on a near-black plum canvas (#1c1a28, the one intentionally dark surface, so video edges never flash sand) with an 18px radius and the deepest shadow in the system. Catalog thumbnails autoplay muted, loop, `playsinline`, `preload="metadata"`, and always have a poster/placeholder fallback.

## 6. Do's and Don'ts

### Do:
- **Do** put a real demo video wherever a skill is shown — the video is the hero imagery; a placeholder with "Demo coming soon" is the only acceptable substitute.
- **Do** keep the page on Sand Dollar Beige (#f4eae1) and surfaces on Bleached Sand (#fcf9f5) — The One Step Down Rule.
- **Do** use pills (999px) for header CTAs, badges, filter chips, and segmented controls; 1rem+ radii for cards.
- **Do** tint every shadow with Wetsuit Black rgba(42,44,65,…) and keep it long-throw and diffuse — The Afternoon Light Rule.
- **Do** write UI text in plain language, sentence case; new surfaces inherit the warmth ("golden hour, not neon").
- **Do** ship `prefers-reduced-motion` alternatives for every animation, and keep autoplaying demos muted with pause/stop affordances where they loop.

### Don't:
- **Don't** drift toward **dev-tool dark mode** — no terminal-black surfaces, no monospace type, no neon accents. The single dark video canvas (#1c1a28) is the only sanctioned dark surface.
- **Don't** build the **generic SaaS landing** — no gradient heroes, no hero-metric cards, no identical icon-heading-text feature grids, no stock-photo polish.
- **Don't** create **sketchy marketplace** energy — no crowded listings, no aggressive badges or upsells, no urgency mechanics, no dark patterns.
- **Don't** go **corporate enterprise** — no navy B2B tone, no whitepaper vibes, no suit-speak in UI copy.
- **Don't** use Sunlit Gold for anything other than verified/pass/free trust signals — The Gold Means Verified Rule.
- **Don't** use colored side-stripe borders, gradient text, decorative glassmorphism (blur belongs only on floating chrome), or tiny uppercase tracked eyebrows above sections.
- **Don't** introduce a third font family, heavy heading weights as a default, or pure-black text or shadows — Wetsuit Black (#2a2c41) is the ink.
