# Design — Surf Skills "How it works" step clips

Brand-matched to the site's **goldenhour** DaisyUI theme
(`website/src/styles/globals.css`). Three short, muted, **seamless-loop** UI motion
graphics (one per step), rendered to MP4 and embedded on the homepage hero.

## Palette (exact, from globals.css)

| Token | Hex | Use |
|-------|-----|-----|
| Bleached Sand | `#fcf9f5` | card / surface fills |
| Sand Dollar Beige | `#f4eae1` | scene background (page) |
| Darker Sand | `#e7d9c8` | borders / hairlines |
| Wetsuit Black | `#2a2c41` | ink / primary text, dark chips |
| Burnt Sienna (primary) | `#dd6b4d` | step number, primary accents |
| Vintage Teal (secondary) | `#3d5a80` | secondary labels |
| **Sunlit Gold (accent)** | `#f2b134` | verified / Match / Copied ✓ / verdict — the hero accent |
| Sage (success) | `#6f8f4f` | GO verdict |
| Error | `#b8442f` | STOP accent (used lightly) |

Text on gold/sand is ink `#2a2c41`; text on dark `#2a2c41` chips is `#fcf9f5`.

## Type
- Display / headings: **Bricolage Grotesque** (`fonts/bricolage-grotesque.woff2`, variable).
- Body / UI / labels: **Onest** (`fonts/onest.woff2`, variable).
- Mono (install command): system mono stack (`ui-monospace, "SF Mono", monospace`).

## Form
- Field radius **8px**, card/box radius **16px**. Light, flat, low depth — soft single
  shadow only (`0 1px 2px rgba(42,44,65,.06), 0 8px 24px rgba(42,44,65,.06)`). No heavy
  glows, no gradients on light bg (H.264 banding).

## Canvas & motion
- **1280×800 (16:10)**, 30fps, ~4.2–4.8s each. Elements kept large/simple — the clip
  displays small (~380px) and is decorative (captions carry the meaning).
- **Seamless loop:** first frame == last frame. Each timeline starts on a resting state,
  plays one action cycle, then settles back to that same resting state in the final beat.
- Shared shell across all three: sand background, one centered surface card, a soft SVG
  cursor that moves/clicks. Vary eases; offset the first tween ~0.2s.

## The three clips
1. **step-1-discover** — search field types "validate idea"; `validate-startup-idea` card lifts with a gold **Match** pill.
2. **step-2-paste** — install command in a mono box; cursor clicks **Paste into your agent** → **Copied ✓** (gold); command highlights.
3. **step-3-result** — input line → processing pulse → output chips (Risks & Assumptions · Dimensions research · Next steps) stagger in, **GO** verdict stamps in.
