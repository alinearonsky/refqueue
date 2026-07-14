# RefQueue Design System

The single source of truth for RefQueue's public pages (landing + status). Maker-internal
screens (dashboard, login) stay neutral and are out of scope. Every color, size, and spacing
value on the public pages traces to a token here.

**Scope note — theming:** the accent is a *default*. Makers override it with `THEME_ACCENT_COLOR`
(Plan 5), which sets `--accent`/`--accent-text` inline on `<main>` and wins over the `:root`
defaults below. The whole system is built so any accent a maker picks flows into the CTA, the
glow, focus rings, and the position number and still looks good.

---

## 1. Atmosphere & Identity

RefQueue feels like **the inside track** — you got past the velvet rope, and there's a glowing
number over the door telling you exactly where you stand. The canvas is a deep, layered near-black;
the single accent behaves like **light**, not paint — it glows behind the position number, lights
the CTA, and rings focus. Type is confident and modern (Geist), with a **monospace, tabular position
number as the signature moment** — rendered oversized and lit from within, like a boarding number or
a stadium scoreboard. The atmosphere is premium and quiet, never loud; the drama is concentrated in
one place — the number — which is also the anchor for the future position-jump animation.

**Signature:** a luminous oversized position number over a layered-dark, accent-lit field.

---

## 2. Color

Near-black is a **ramp**, not one flat fill — layered surfaces build depth. The accent is used
ONLY as interactive light (CTA, glow, focus, unlocked-tier), never as decoration.

| Role | Token | Dark (primary) | Light | Usage |
|---|---|---|---|---|
| Surface base | `--surface-base` | `#08080b` | `#ffffff` | Page background (deepest) |
| Surface raised | `--surface-raised` | `#111116` | `#f7f7f9` | Cards, form field wells |
| Surface elevated | `--surface-elevated` | `#17171d` | `#ffffff` | Elevated cards, hover |
| Text primary | `--text-primary` | `#f4f4f6` | `#0b0b0f` | Headlines, body |
| Text secondary | `--text-secondary` | `#a1a1ad` | `#5a5a66` | Subhead, captions |
| Text tertiary | `--text-tertiary` | `#6b6b78` | `#8a8a96` | Muted, meta, credit |
| Border default | `--border-default` | `#26262e` | `#e6e6ea` | Dividers, field borders |
| Border subtle | `--border-subtle` | `#1b1b21` | `#f0f0f2` | Soft separations |
| Accent (default) | `--accent` | `#6d5efc` | `#6d5efc` | CTA fill, number, glow, focus |
| Accent text | `--accent-text` | `#ffffff` | `#ffffff` | Text/icon on accent fill |
| Accent glow | `--accent-glow` | `rgba(109,94,252,0.45)` | `rgba(109,94,252,0.30)` | Radial glow behind number/hero |
| Accent faint | `--accent-faint` | `rgba(109,94,252,0.10)` | `rgba(109,94,252,0.08)` | Tinted wells, unlocked-tier bg |
| Status success | `--status-success` | `#3ddc97` | `#0f9d63` | Confirmed / verified |
| Status warning | `--status-warning` | `#f5b544` | `#a86400` | Pending / notices |

### Rules
- The dark surface ramp (base → raised → elevated) creates depth; use tonal shift before borders.
- `--accent*` is interactive light only. Never a decorative block of color.
- Maker overrides: CSS reads `var(--accent, <default>)` — an inline `--accent` (themed) wins.
  The glow tokens are the ONE place a raw default rgba appears; when a maker overrides `--accent`,
  the glow falls back to a `color-mix(in srgb, var(--accent) 40%, transparent)` so it re-tints
  automatically (see globals.css).

---

## 3. Typography

Two families, both already loaded via `next/font` in `layout.tsx`.

| Level | Size (clamp) | Weight | Line | Tracking | Usage |
|---|---|---|---|---|---|
| Hero | `clamp(2.5rem, 6vw, 4rem)` | 700 | 1.05 | -0.03em | Landing headline |
| Position number | `clamp(4rem, 16vw, 9rem)` | 700 | 1 | -0.04em | Status hero (mono, tabular) |
| H2 | `1.375rem` | 600 | 1.3 | -0.01em | Card titles |
| Body/lg | `1.125rem` | 400 | 1.6 | 0 | Subhead / lead |
| Body | `1rem` | 400 | 1.55 | 0 | Default |
| Body/sm | `0.9rem` | 400 | 1.5 | 0 | Secondary |
| Overline | `0.7rem` | 600 | 1.3 | 0.14em | Uppercase labels (step kickers) |

### Font stack
- Display / body: `var(--font-geist-sans), system-ui, sans-serif`
- Mono (the position number, referral link, code): `var(--font-geist-mono), ui-monospace, monospace`

### Rules
- The position number is ALWAYS mono + `font-variant-numeric: tabular-nums` (so digits don't jitter
  when it changes — matters for the future animation).
- Hero and number use `clamp()` for fluid responsive sizing; never a fixed px that overflows mobile.

---

## 4. Spacing & Layout

Base unit **4px**. Tokens: `--space-1..24` = 4,8,12,16,20,24,32,40,48,64,80,96 px (as needed).

- Public page max content width: **560px** (landing form column) / **640px** (status). Centered.
- Vertical rhythm: hero block uses `--space-20`/`--space-24` breathing room; the page is a single
  centered column, `min-height: 100svh`, flex-centered, with `--space-16` bottom reserve for the
  fixed credit.
- Breakpoints: sm 640, md 768, lg 1024. Mobile-first; no horizontal scroll at 375px.

### Rules
- Every spacing value maps to a token. No magic numbers.

---

## 5. Components (public pages)

### Atmospheric field (background)
- **Structure:** the `<main>` carries a layered background — the base surface plus a large,
  soft radial accent glow positioned top-center (behind the hero), built with `radial-gradient`
  using `--accent-glow`. Not a flat fill.
- **States:** static (the glow is decorative, GPU-cheap; no animation required for launch).
- **Accessibility:** decorative only; sufficient contrast maintained for text above it.

### Hero headline (landing)
- **Structure:** `<h1>` at Hero scale; optional themed logo `<img>` above (44px). Subhead below in Body/lg secondary.
- **States:** static.

### Email capture (SignupForm)
- **Structure:** a single rounded field-well (`--surface-raised`, `--border-default`) containing the
  email input and the accent CTA button, inline on desktop, stacked on mobile.
- **Variants:** default; the button label is `ctaLabel` (themed) default "Join the waitlist".
- **States:** default / focus (accent ring on the well) / pending (button dimmed, "Joining…") /
  error (message below, `--status-error`-ish) / success (result message replaces the form).
- **Accessibility:** input has `aria-label`; button is a real submit; focus-visible ring on both.
- **Motion:** button hover raises an accent glow (`box-shadow` with `--accent-glow`), 150ms ease-out.

### How-it-works strip (landing)
- **Structure:** three steps (Join → Share your link → Move up), each an overline kicker + short line,
  in a responsive row (stacks on mobile). Gives the landing body and explains the mechanic.
- **States:** static.

### Position hero (status)
- **Structure:** an overline label ("Your position"), then the giant mono tabular number with a
  radial accent glow behind it, then the referral-count line. This is THE signature moment.
- **States:** static now; the glow + number are the anchor for the wave-two position-jump animation.
- **Accessibility:** the number is real text (screen-reader legible); glow is decorative.

### Card (status: "Move up the line", "Rewards")
- **Structure:** `--surface-raised` panel, `--border-subtle`, generous padding, H2 title.
- **Sub-parts:** referral link row (mono code in a well + CopyButton), share row (text links),
  reward tiers (unlocked = `--accent-faint` bg + success check; next = plain).

### Credit (PoweredBy) — unchanged from Plan 5
- Fixed bottom-center, `--text-tertiary`, hover underline. Reads on dark.

---

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 120ms | ease-out | Button/link hover, focus ring |
| Standard | 240ms | cubic-bezier(0.16,1,0.3,1) | Hero/number entrance (fade+scale) |

### Rules
- **GPU-composited only** — `transform`, `opacity`, `filter`, `box-shadow`. Never animate layout.
- Respect `prefers-reduced-motion`: entrance animations become instant.
- The position number's tabular-nums + mono is deliberate so the wave-two count animation won't
  reflow. No count animation ships in this plan.

---

## 7. Accepted debt / deferred

- **Position-jump animation** — deferred to wave two (its own mini-plan). The number's material
  (mono, tabular, glow) is built now as its anchor.
- **Light mode is clean-but-correct, dark is the hero.** Dark is the designed, screenshot/video
  surface; light mode is functional and accessible but not the showcase.
- **Full Lighthouse-100 audit + react-scan tooling** — not run this pass (SSR, near-zero client JS,
  fast by architecture; adding dev deps to a launch repo is a net negative). Revisit if needed.
