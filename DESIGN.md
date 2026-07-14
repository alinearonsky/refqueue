# RefQueue Design System

The single source of truth for RefQueue's public pages (landing + status). Maker-internal
screens (dashboard, login) stay neutral and are out of scope. Every color, size, and spacing
value on the public pages traces to a token here.

**Direction — "New Genre":** a cinematic editorial broadsheet on warm paper (adapted from the
Refero "New Genre" style). Near-black serif display on a warm paper canvas, one charred-umber
dark contrast band for drama, and a soft golden-hour light instead of any saturated glow. The
look is intentional and human — deliberately *not* the dark-neon-gradient AI default.

**Scope note — theming:** the accent is a *default* (a warm near-black — the classic
editorial black-on-paper). Makers override it with `THEME_ACCENT_COLOR` (Plan 5), which sets
`--accent`/`--accent-text` inline on `<main>` and wins over the defaults below. The accent lives
in the **interactive layer** — CTA fill, links, the success numeral, small marks — so a maker's
brand color flows through and still looks right on paper. The giant hero position number stays
near-black `--ink` (a neutral folio that harmonizes with the warm wash *and* any brand accent —
a cool accent on the golden light would clash).

---

## 1. Atmosphere & Identity

RefQueue reads like the **front page of a well-set broadsheet**: warm paper, confident serif
headlines, generous rag-right space, and one column of quiet authority. The drama is not a glow —
it's **contrast and light**: a single charred-umber band cutting across the paper, and a soft
golden-hour wash that falls across the hero like late-afternoon sun on a page. Type does the
heavy lifting: a high-contrast display serif (Fraunces) for statements, a clean grotesque (Geist)
for everything functional.

**Signature:** the **position number as an oversized serif numeral** — set like a magazine folio
or a drop-cap, lit by the golden-hour wash, on warm paper. Editorial, not neon.

---

## 2. Color

Warm paper is the canvas; near-black ink is the voice; one dark band and one warm light are the
only drama. The accent is used sparingly — CTA, links, the number — never as decoration.

| Role | Token | Value | Usage |
|---|---|---|---|
| Paper canvas | `--paper` | `#fbfaf7` | Page background (warm off-white) |
| Paper raised | `--paper-raised` | `#ffffff` | Cards, input wells |
| Paper sunken | `--paper-sunken` | `#f4f1ea` | Subtle sunken bands |
| Band (dark) | `--band-dark` | `#1e1310` | The one charred-umber contrast band |
| Ink | `--ink` | `#14100c` | Primary text & headlines (warm near-black) |
| Ink secondary | `--ink-secondary` | `#63615c` | Subheads, captions |
| Ink tertiary | `--ink-tertiary` | `#9a978f` | Meta, credit |
| Hairline | `--hairline` | `#e7e2d8` | Dividers, field borders |
| Hairline strong | `--hairline-strong` | `#d8d2c5` | Emphasized borders |
| Accent (default) | `--accent` | `#14100c` | CTA fill, links, success numeral (themeable) |
| Accent text | `--accent-text` | `#fbfaf7` | Text on an accent fill |
| Accent soft | `--accent-soft` | `color-mix(accent 7%)` | Tinted wells, unlocked-tier bg |
| Ember (light) | `--ember` | `rgba(255,209,128,.5)` | Golden-hour wash behind hero/number |
| Ember faint | `--ember-faint` | `rgba(255,221,158,.24)` | Softer secondary wash |
| Status success | `--status-success-fg` | `#3f6212` | Confirmed / verified (olive on paper) |
| Status warning | `--status-warning-fg` | `#92400e` | Pending / notices (sienna on paper) |

### On the dark band
Inside `.rq-onDark` (the charred-umber section) the ink/hairline tokens invert to paper tones
(`--ink: #f3ede2`, `--ink-secondary: #b9b1a2`, `--hairline: #3a2c25`) so the same components read
correctly on dark.

### Rules
- The golden-hour ember is a **soft directional wash**, never a centered radial blob. Low opacity.
- `--accent` is interactive only (CTA / link / number). Default is warm near-black; a maker's
  `THEME_ACCENT_COLOR` overrides it and must stay legible on paper (pick a mid-to-dark color).
- Exactly **one** dark band per page — overusing it kills the paper feel.

---

## 3. Typography

Three families, all via `next/font` in `layout.tsx`.

| Level | Family | Size (clamp) | Weight | Line | Tracking | Usage |
|---|---|---|---|---|---|---|
| Display / hero | Fraunces (serif) | `clamp(2.75rem, 6vw, 4.75rem)` | 500 | 1.03 | -0.02em | Landing headline |
| Position number | Fraunces (serif) | `clamp(5rem, 18vw, 11rem)` | 500 | 0.9 | -0.03em | Status hero (folio numeral) |
| Section head | Fraunces (serif) | `1.75rem` | 500 | 1.15 | -0.01em | Card / section titles |
| Body / lg | Geist Sans | `1.15rem` | 400 | 1.6 | 0 | Subhead / lead |
| Body | Geist Sans | `1rem` | 400 | 1.6 | 0 | Default |
| Body / sm | Geist Sans | `0.9rem` | 400 | 1.5 | 0 | Secondary |
| Overline | Geist Sans | `0.72rem` | 600 | 1.3 | 0.14em | Uppercase kickers/labels |
| Mono | Geist Mono | `0.85rem` | 400 | 1.4 | 0 | Referral link / code |

### Font stack
- Display (serif): `var(--font-fraunces), Georgia, 'Times New Roman', serif`
- Body / UI: `var(--font-geist-sans), system-ui, sans-serif`
- Mono: `var(--font-geist-mono), ui-monospace, monospace`

### Rules
- Serif is for **statements only** (hero, section heads, the number). Never for UI/body/labels.
- The hero and number use `clamp()` for fluid sizing; never a fixed px that overflows mobile.
- Accepted debt: the serif position number is **not** tabular — fine for a static number; the
  wave-two position-jump animation will handle digit alignment in its own mini-plan.

---

## 4. Spacing & Layout

Base unit **4px**. Tokens as needed: 4,8,12,16,20,24,32,40,48,64,80,96 px.

- Public page max content width: **600px** (landing column) / **660px** (status). Left-leaning or
  centered per component; generous vertical rhythm (editorial whitespace is the point).
- The hero sits high with air above; the dark band runs edge-to-edge (full-bleed width, padded
  content). `min-height: 100svh`, bottom reserve for the fixed credit.
- Breakpoints: sm 640, md 768. Mobile-first; no horizontal scroll at 375px.

### Rules
- Every spacing value maps to a token. No magic numbers.
- Whitespace is a feature — do not crowd to fill.

---

## 5. Components (public pages)

### Golden-hour wash (background)
- **Structure:** the `<main>` carries the warm paper plus a soft directional golden-hour wash
  (a large, low-opacity radial/linear using `--ember`, offset to a corner — light *across* the
  page, not a glow *behind* a blob).
- **States:** static; decorative; text contrast preserved above it.

### Hero headline (landing)
- **Structure:** small overline kicker, then the Fraunces serif `<h1>` at Display scale, then a
  Geist-Sans subhead in `--ink-secondary`. Optional themed logo above.
- **States:** static. Entrance = fade + rise (`.rq-enter`), reduced-motion safe.

### Email capture (SignupForm)
- **Structure:** a single rounded field-well (`--paper-raised`, `--hairline` border) with the
  email input and the accent CTA button inline on desktop, stacked on mobile.
- **States:** default / focus (accent hairline + soft ring on the well) / pending ("Joining…") /
  error (sienna message below) / success (result message replaces the form).
- **Accessibility:** input has `aria-label`; real submit button; visible focus.

### How-it-works band (landing)
- **Structure:** the **one dark moment** — a full-bleed charred-umber band (`.rq-onDark`) holding
  three steps (Join → Share your link → Move up), each a serif index numeral + label + line.
  Provides cinematic contrast against the paper.
- **States:** static.

### Position hero (status)
- **Structure:** overline label ("Your position"), then the giant **Fraunces serif numeral** with
  the golden-hour wash behind it, then the referral-count line. THE signature moment.
- **States:** static now; the wash + numeral are the anchor for the wave-two position-jump animation.
- **Accessibility:** the number is real text; the wash is decorative.

### Card (status: "Move up the line", "Rewards")
- **Structure:** `--paper-raised` panel, `--hairline` border, generous padding, serif section title.
- **Sub-parts:** referral link row (mono code in a sunken well + CopyButton), share row (text
  links, hover → accent), reward tiers (unlocked = `--accent-soft` bg + olive check; next = plain).

### Credit (PoweredBy)
- Fixed bottom-center, `--ink-tertiary`, hover underline. Reads on paper.

---

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 120ms | ease-out | Button/link hover, focus ring |
| Standard | 320ms | cubic-bezier(0.16,1,0.3,1) | Hero/number entrance (fade + rise) |

### Rules
- **GPU-composited only** — `transform`, `opacity`, `filter`, `box-shadow`. Never animate layout.
- Respect `prefers-reduced-motion`: entrance becomes instant.
- Hover on the CTA deepens the ink / lifts a subtle shadow — no glow.

---

## 7. Accepted debt / deferred

- **Position-jump animation** → wave two (its own mini-plan). The serif numeral + wash are its anchor.
- **Serif number isn't tabular** — acceptable for a static number; digit alignment handled in the
  animation mini-plan.
- **Light-only** — the public pages are always the warm-paper surface (the designed screenshot/video
  surface). No dark variant; the charred-umber band supplies contrast.
- **Full Lighthouse-100 audit + react-scan tooling** — not run this pass (SSR, near-zero client JS,
  fast by architecture). Revisit if needed.
