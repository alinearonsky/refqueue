# RefQueue Design System

The single source of truth for RefQueue's public pages (landing + status). Maker-internal
screens (dashboard, login) stay neutral (Geist) and are out of scope. Every color, size, and
spacing value on the public pages traces to a token here.

**Direction — "Admit One":** a **vintage theatre-ticket playbill**. An aged programme sheet
pinned to a board — letterpress type, playbill vermilion, double-ruled borders, film-grain and a
warm vignette — with a **real scanned Admit One ticket stub** as the hero object. The number is
the star: a numbered ticket you hold, then move toward the front of the house. Committed,
nostalgic, and tactile — deliberately *not* the warm-cream editorial or dark-neon AI defaults.

**Scope note — theming:** the accent is a *default* (playbill red `--red`). Makers override it
with `THEME_ACCENT_COLOR`, which sets `--accent`/`--accent-text` inline on `<main>` and wins over
the defaults below. The accent lives in the **interactive + emphasis layer** — CTA fill, the
kicker, the ticket border, the position numeral, links, small marks — so a maker's brand color
flows through the whole piece and still reads on aged paper (pick a saturated mid-tone).

---

## 1. Atmosphere & Identity

RefQueue reads like a **printed variety-show programme**: an aged paper sheet, a double-ruled
frame, a hand-set letterpress headline, and a torn ticket stub. The drama
is **material** — grain, vignette, ink-on-paper contrast, and one saturated red. Type carries the
period: an aged display face (Rye) for the headline and serials, a condensed grotesque (Oswald)
for uppercase utility lettering, and a slab serif (Zilla Slab) for programme body copy.

**Signature:** the **numbered ticket**. On the landing it is a real scanned *REFQUEUE Admit One*
stub (serial No 00247) beside a huge `No. 247` headline. On the status page it becomes **your live
position printed as a serial** — `No. 41` set huge in Rye red inside a bordered stub.

---

## 2. Color

Aged programme paper is the canvas; sepia-black is the ink; playbill red is the one saturated
voice. The board behind the sheet is a deeper tan. The accent (red by default) carries CTA, the
ticket border, and the numeral — never scattered as decoration.

| Role | Token | Value | Usage |
|---|---|---|---|
| Board | `--board` | `#c9b790` | Page backdrop the sheet is pinned to |
| Paper | `--paper` | `#ece0c6` | Aged programme paper (sheet body) |
| Paper (foot) | `--paper-2` | `#e6d8ba` | Deeper paper at the foot of the sheet gradient |
| Paper raised | `--paper-raised` | `#f1e7cf` | Input wells, card / ticket tops |
| Paper sunken | `--paper-sunken` | `#e2d3b0` | Sunken wells (referral link) |
| Ink | `--ink` | `#241c14` | Sepia-black letterpress — headlines, body, frame |
| Ink soft | `--ink-soft` | `#5a4b38` | Faded ink — subheads, captions |
| Ink faint | `--ink-faint` | `#8a7a5c` | Fine print, meta |
| Red (accent default) | `--red` | `#b5321f` | Playbill vermilion — CTA, kicker, ticket, numeral |
| Blue | `--blue` | `#2f4d6b` | Ink-blue, used sparingly |
| Line | `--line` | `#c3ad84` | Aged hairline rules |
| Line strong | `--line-strong` | `#b49b6d` | Card / well borders |
| Accent | `--accent` | `var(--red)` | Interactive + emphasis (themeable) |
| Accent text | `--accent-text` | `#f7ecd2` | Cream ink on an accent fill |
| Accent soft | `--accent-soft` | `color-mix(accent 12%)` | Unlocked-tier bg, focus ring |
| Status success | `--status-success-fg` | `#4a5d23` | Confirmed / verified (olive stamp) |
| Status warning | `--status-warning-fg` | `#8a3b1e` | Pending / notices (burnt sienna) |

### Rules
- The sheet always carries **grain + a warm vignette** (`.rq-sheet::before/::after`). That texture
  is the anti-AI signal — do not flatten it to a solid fill.
- `--accent` is interactive/emphasis only (CTA, ticket border, kicker, numeral, links). Default is
  playbill red; a maker's `THEME_ACCENT_COLOR` overrides it and must stay saturated enough to read
  as ink on aged paper.
- Body text is `--ink` / `--ink-soft` on paper — both clear ≥4.5:1. Fine print (`--ink-faint`) is
  reserved for genuinely secondary lines (letterhead flourish, stub fine print).

---

## 3. Typography

Five families via `next/font` in `layout.tsx` — three for the public surface, Geist Sans/Mono
retained for the maker dashboard.

| Level | Family | Size (clamp) | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| Display / hero | Rye | `clamp(38px, 6vw, 74px)` | 400 | 0.01em | Landing headline |
| Serial / numeral | Rye | `clamp(60px, 15vw, 100px)` | 400 | 0.09em | Status position number |
| Section head | Rye | `1.3–1.35rem` | 400 | 0 | Card / act titles |
| Utility caps | Oswald | `10.5–14px` | 600 | 0.12–0.22em | Letterhead, kicker, labels, CTA, share |
| Body / lead | Zilla Slab | `clamp(16px, 1.5vw, 19px)` | 400 | 0 | Lede, card copy |
| Body / sm | Zilla Slab | `13.5px` | 400 | 0 | Act copy, referral count |
| Mono | Geist Mono | `0.82rem` | 400 | 0 | Referral link |

### Font stack
- Display: `var(--font-rye), Georgia, 'Times New Roman', serif`
- Utility caps: `var(--font-oswald), system-ui, sans-serif`
- Body: `var(--font-zilla), Georgia, serif`
- Mono: `var(--font-geist-mono), ui-monospace, monospace`

### Rules
- **Rye is for statements only** (headline, serials, section heads). Its numerals are chunky —
  always give multi-digit numbers ≥0.06em tracking so digits don't kiss (serial uses 0.09em).
- Oswald caps carry all uppercase utility lettering (letterhead, kicker, CTA, labels). Never set
  Rye in a running label.
- Headline/serial use `clamp()`; a `text-shadow: 1px 1px 0 rgba(90,60,25,.12)` gives the letterpress
  bite. Never a fixed px that overflows mobile.

---

## 4. Spacing & Layout

Base unit **4px**. The public page is a centered **sheet** floating on the board.

- Landing sheet max-width **1080px** (two-column hero: copy left, ticket right). Status sheet
  max-width **600px** (single column: stub → cards). Both wrapped in a `.rq-frame` double border.
- Shared chrome lives in `globals.css`: `.rq-sheet` (paper + grain + vignette + shadow),
  `.rq-frame` (2px double border), `.rq-rule` / `.rq-rule--thick` (aged rules), `.rq-caps` (Oswald
  utility caps). Page modules own their own layout only.
- `min-height: 100svh`; the sheet is vertically centered on the board.
- Mobile (`≤760` landing / `≤560` status): hero collapses to one column with the ticket on top;
  acts stack; the box-office button drops under the input; letterhead simplifies. No horizontal
  scroll at 375px (`.rq-sheet` is `overflow: hidden`, `main` is `overflow-x: hidden`).

### Rules
- Every spacing value maps to a token. No magic numbers.
- The frame + rules are structural, not decoration — they set the programme rhythm.

---

## 5. Components (public pages)

### The sheet (shared chrome)
- **Structure:** `.rq-sheet` = warm paper gradient + film-grain (`::before`, `mix-blend multiply`)
  + warm vignette (`::after`) + drop shadow. Inside, a `.rq-frame` double border wraps the content.
- **States:** static; entrance = fade + rise (`.rq-enter`), reduced-motion safe.

### Letterhead (status only)
- **Structure:** an Oswald-caps masthead — a single centered `★ The {name} Variety Co. ★`
  followed by a thick double rule. The landing has **no** letterhead; it opens straight on the hero.

### Hero headline (landing)
- **Structure:** the Rye `<h1>` alone — default **"No. 247"** with `247` in `--accent`, set large
  (`clamp(56px, 10vw, 118px)`) — then a Zilla Slab lede. No kicker. `theme.headline` /
  `theme.subhead` override the defaults.

### Ticket stub — landing
- **Structure:** the real scanned *REFQUEUE Admit One* cutout (`/ticket-admit-one.webp`,
  transparent WebP keyed from a generated ticket, ~85KB), rotated 4.5°. Decorative; descriptive
  `alt` on the image.

### Box office (SignupForm)
- **Structure:** an Oswald-caps label ("Present your address at the window"), a hard-ruled field
  (2px `--ink` border) with the email input and the accent **"Claim your seat"** button inline
  (stacked ≤460px), then Oswald fine print ("Admit one · No fee · Keep this stub").
- **States:** default / focus (accent soft ring) / pending ("Joining…") / error (red line) /
  success (a stub-style confirmation with the position in Rye red replaces the form).
- **Accessibility:** `aria-label` on the input; real submit button; visible focus.

### Acts (landing "how it works")
- **Structure:** three columns — Rye red numerals `I. / II. / III.`, an Oswald caps title, Zilla
  Slab copy (Join the line → Send your friends → Move up the line). Stacks ≤760px.

### Ticket stub — status (signature)
- **Structure:** a bordered stub (`--accent` border + inner dashed rule) holding: an Oswald overline
  ("Your position on {name}"), "ADMIT ONE — IN LINE" with flanking rules (rules hidden on mobile),
  the **live position as a Rye red serial** (`No. 41`), and the referral-count line.
- **States:** static now; the stub is the anchor for the wave-two position-jump animation.
- **Accessibility:** the number is real text; the frame/pointer are decorative.

### Cards (status: "Move up the line", "Rewards")
- **Structure:** aged-paper panel (`--line-strong` border), Rye section title, Zilla Slab copy.
- **Sub-parts:** referral link row (Geist Mono in a sunken well + Oswald-caps CopyButton), share row
  (Oswald-caps links with an underline that goes accent on hover), reward tiers (unlocked =
  `--accent-soft` bg + olive check; next = plain).

### Credit (PoweredBy)
- Oswald caps, `--ink-soft`, centered **inside** the sheet footer (below the closing thick rule).
  `RefQueue` goes `--ink` → `--accent` on hover. On by default; `POWERED_BY=false` removes it.

---

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 120ms | ease-out | Button/link hover, focus ring, active press |
| Standard | 480ms | cubic-bezier(0.16,1,0.3,1) | Sheet entrance (fade + rise) |

### Rules
- **GPU-composited only** — `transform`, `opacity`, `filter`, `box-shadow`. Never animate layout.
- Respect `prefers-reduced-motion`: entrance becomes instant.
- Hover on the CTA brightens the ink slightly and presses on active — no glow.

---

## 7. Accepted debt / deferred

- **Position-jump animation** → wave two (its own mini-plan). The status ticket stub is its anchor.
- **Rye serial isn't tabular** — acceptable for a static number; the ≥0.09em tracking keeps digits
  legible. Digit alignment handled in the animation mini-plan.
- **Light-only** — the public pages are always the aged-paper surface (the designed screenshot/video
  surface). No dark variant; grain + vignette + red supply the drama.
- **Landing ticket is a fixed demo serial (REFQUEUE · No 00247)** — a scanned image, so it does not
  reflect a visitor's real number (they have none yet). The *status* stub is the live, dynamic serial.
- **Full Lighthouse-100 audit + react-scan tooling** — not run this pass (SSR, near-zero client JS,
  one ~92KB image, fast by architecture). Revisit if needed.
