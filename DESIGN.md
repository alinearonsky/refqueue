# RefQueue Design System

The single source of truth for RefQueue's public pages (landing + status). Maker-internal
screens (dashboard, login) stay neutral (Geist) and are out of scope. Every color, size, and
spacing value on the public pages traces to a token here.

**Direction, "Admit One":** a **vintage theatre-ticket playbill**, rebuilt as a navy-and-red
Victorian broadside. An aged paper sheet pinned to a dark board, a navy double-keyline frame,
two-tone letterpress numerals, engraved illustrations (a strongman, a horse), pointing-hand
manicules, and star flourishes, with a **real Admit One ticket stub** as the hero object. The
number is the star: a numbered ticket you hold, then move toward the front of the house.
Committed, nostalgic, and tactile, deliberately *not* the warm-cream editorial or dark-neon AI
defaults.

**Scope note, theming:** `--accent` is a *default* (playbill red `--red`). A maker's
`THEME_ACCENT_COLOR` sets `--accent` / `--accent-text` inline on `<main>` and wins over the
default. The accent drives the primary interactive layer (the CTA fill and the focus ring). Note
the fixed identity marks (the two-tone numeral, the red hairline rules, the card underlines) call
`--red` directly, so they stay playbill red even when a maker themes the accent. See section 7.

---

## 1. Atmosphere & Identity

RefQueue reads like a **printed variety-show playbill**: an aged paper sheet, a navy double-ruled
frame, hand-set letterpress numerals, engraved figures, and a torn ticket stub. The drama is
**material**: paper grain, ink-on-paper contrast, navy and one saturated red. Type carries the
period, an ornate Tuscan display face (Rye) for the numerals, a bold condensed slab (Patua One)
for uppercase utility lettering, and a Clarendon-ish slab serif (Bitter) for programme body copy.

**Signature:** the **numbered ticket** rendered as **two-tone letterpress**, red fill with a cream
keyline stroke and an offset navy drop-shadow. On the landing it is a huge `No. 247` beside a real
*REFQUEUE Admit One* stub (serial No 00247). On the status page it becomes **your live position
printed as a serial**: `No. 1` in the same letterpress, inside a bordered stub.

---

## 2. Color

Aged paper is the canvas; navy is the ink; playbill red is the one saturated voice; the sheet is
pinned to a dark board. Red carries the CTA, the numeral, and the hairline marks, never scattered
as decoration.

| Role | Token | Value | Usage |
|---|---|---|---|
| Board | `--board` | `#26170f` | Dark board the sheet is pinned to |
| Paper | `--paper` | `#ecdcb8` | Aged paper (fallback under the texture image) |
| Cream | `--cream` | `#efe6d0` | Input wells, ticket/card tops, ink on accent fills |
| Navy (ink) | `--navy` | `#24405f` | Letterpress ink: numeral shadow, body, frame, borders |
| Navy deep | `--navy-2` | `#1c3350` | Deeper navy for body copy |
| Ink | `--ink` | `var(--navy)` | Alias: primary ink |
| Ink soft | `--ink-soft` | `#4a5a6e` | Faded ink, captions, referral count |
| Ink faint | `--ink-faint` | `#6f5f42` | Placeholder text, fine print (AA on the cream well) |
| Red (accent default) | `--red` | `#bf392a` | Playbill vermilion: CTA, numeral fill, rules, underlines |
| Line | `--line` | `rgba(36,64,95,0.42)` | Aged navy hairline rules |
| Accent | `--accent` | `var(--red)` | Primary interactive (CTA fill, focus ring; themeable) |
| Accent text | `--accent-text` | `var(--cream)` | Cream ink on an accent fill |
| Accent soft | `--accent-soft` | `color-mix(accent 12%)` | Focus ring, unlocked-tier bg |
| Status success | `--status-success-fg` | `#3f5a2a` | Confirmed / verified (olive stamp); `-bg` = mix 14% |
| Status warning | `--status-warning-fg` | `#8a3b1e` | Pending / notices (burnt sienna); `-bg` = mix 12% |

### Rules
- The sheet always carries the **paper texture** (`.rq-sheet` uses `/playbill/paper.jpg` at
  `background-size: cover`). That grain is the anti-AI signal, do not flatten it to a solid fill.
- The **two-tone letterpress** numeral is fixed: red fill (`--red`), 2px `--cream` stroke, `5px 6px
  0 --navy` shadow. It is the identity mark, not the themeable accent.
- Body text is `--navy` / `--navy-2` on paper, both clear >=4.5:1. `--ink-faint` is reserved for
  the cream input well (placeholder) and genuinely secondary fine print.

---

## 3. Typography

Five families via `next/font` in `layout.tsx`, three for the public surface, Geist Sans/Mono
retained for the maker dashboard.

| Level | Family | Size (clamp) | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| Serial / numeral | Rye | `clamp(88px, 15vw, 200px)` | 400 | 0.02em | Landing hero `247`, status position |
| Headline override | Rye | `clamp(52px, 9vw, 118px)` | 400 | 0.02em | `theme.headline`, pending "Almost there" |
| Act numeral | Rye | `clamp(20px, 2.2vw, 25px)` | 400 | 0 | `I. / II. / III.` |
| Utility caps | Patua One | `11–21px` | 400 | 0.06–0.16em | Labels, act titles, CTA, share, credit |
| Body / lead | Bitter | `clamp(17px, 2vw, 24px)` | 500 | 0 | Landing subhead |
| Body / copy | Bitter | `0.74–0.98rem` / `clamp(14px,1.5vw,17px)` | 400 | 0 | Act copy, card copy, referral count |
| Mono | Geist Mono | `0.82rem` | 400 | 0 | Referral link |

### Font stack
- Numeral / display: `var(--font-rye), Georgia, 'Times New Roman', serif`
- Utility caps: `var(--font-patua), Georgia, serif`
- Body: `var(--font-bitter), Georgia, serif`
- Mono: `var(--font-geist-mono), ui-monospace, monospace`

### Rules
- **Rye is for numerals and statements only** (hero number, status serial, act numerals, the
  pending headline). Its numerals are chunky Tuscan; keep >=0.02em tracking so digits do not kiss.
- Patua One caps carry all uppercase utility lettering (labels, act titles, CTA, share, credit).
  Never set Rye in a running label.
- The numeral's letterpress bite comes from `.rq-num` (stroke + offset shadow). Live/dynamic text
  (the status position, act titles, labels) also wears a subtle **ink-erosion mask** (`.rq-fade` /
  `.rq-tfade`, an SVG `feTurbulence` alpha mask) so it looks printed while staying real,
  selectable text. Never bake the number into an image.
- Sizes use `clamp()`; never a fixed px that overflows mobile.

---

## 4. Spacing & Layout

Base unit **4px**. The public page is a centered **sheet** floating on the dark board.

- Landing sheet max-width **1340px** (two-column hero: copy left, ticket right), with extra
  `padding-bottom` reserving room for the flanking engravings + footer. Status sheet max-width
  **620px** (single column: stub -> cards). Both wrap their content in a `.rq-frame` navy double
  keyline.
- Shared chrome lives in `globals.css`: `.rq-sheet` (paper texture + shadow), `.rq-frame` (2px
  double navy border with a board-gap margin), `.rq-num` (two-tone letterpress numeral), `.rq-caps`
  (Patua utility caps), `.rq-fade` / `.rq-tfade` (ink-erosion masks), `.rq-rule` / `.rq-rule--thick`
  (aged hairlines). Page modules own their own layout only.
- `min-height: 100svh`; the sheet is vertically centered on the board.
- Mobile (`<=860` landing / `<=560` status): the hero collapses to one column with the ticket on
  top; acts stack; the box-office button drops under the input; the "present your address" and fine
  print rows become centered blocks (their flourishes/manicules hide); the flanking engravings
  hide. No horizontal scroll at 375px (`main` is `overflow-x: hidden`; `.sheet` is `min-width: 0`
  so it never grows past the viewport).

### Rules
- Every spacing value maps to a token or a `clamp()`; no stray magic numbers.
- The frame, rules, and flourishes are structural, they set the playbill rhythm.

---

## 5. Components (public pages)

### The sheet (shared chrome)
- **Structure:** `.rq-sheet` = aged paper texture (`/playbill/paper.jpg`, cover) + drop shadow,
  `isolation: isolate`. Inside, a `.rq-frame` navy double keyline (with a board-gap margin) wraps
  the content.
- **States:** static; entrance = fade + rise (`.rq-enter`), reduced-motion safe.

### Hero (landing)
- **Structure:** a "No." wordmark image (`/playbill/no.png`) + a pointing-hand manicule
  (`/playbill/hand.png`), then the Rye `<h1>` **"247"** as `.rq-num .rq-fade` (huge letterpress),
  then a Bitter lede. A star-flanked Patua caps line ("Present your address at the window") sits
  above the form; a manicule-flanked fine-print line ("Admit one, No fee, Keep this stub") sits
  below. `theme.headline` / `theme.subhead` override the defaults (headline uses `.rq-num .rq-fade`
  at the smaller `.title` scale).

### Ticket stub, landing
- **Structure:** the *REFQUEUE Admit One* cutout (`/playbill/ticket.png`, transparent PNG), rotated
  4.5deg with a drop-shadow; straightens and lifts on hover (`.rq-ticketDrop` entrance).
  Decorative, with a descriptive `alt`.

### Box office (SignupForm)
- **Structure:** a hard-ruled field (2px `--navy` border, `--cream` well) with the Bitter email
  input and the accent **"Claim your seat"** Patua-caps button inline (stacked <=460px).
- **States:** default / focus (accent-soft ring) / pending ("Joining...") / error (red line) /
  success (a stub-style confirmation with the position in Rye replaces the form).
- **Accessibility:** `aria-label` on the input; real submit button; visible focus.

### Acts (landing "how it works")
- **Structure:** three columns, Rye red numerals `I. / II. / III.` + a manicule, a Patua caps title
  with a red underline, Bitter copy (Join the line -> Send your friends -> Move up the line).
  Dotted column dividers with a small red diamond on desktop; a star-flourish separator sits above
  the row. Stacks to one column <=860px (dividers hide).

### Flanking engravings + footer (landing)
- **Structure:** anchored to the foot of the sheet, a strongman (`/playbill/strongman.png`, left)
  and a horse (`/playbill/horse.png`, right) frame a centered footer: a star, the "Powered by
  RefQueue" credit (Patua caps, `RefQueue` in red), and a mirrored star. Engravings hide on mobile.

### Ticket stub, status (signature)
- **Structure:** a bordered stub (2px double `--navy` + inner red dashed rule, `--cream` well)
  holding: a Patua caps line **"Your position on {name}"** with flanking red rules (rules hide on
  mobile), the **live position as a two-tone letterpress serial** (`.rq-num .rq-fade`, e.g.
  `No. 1`, with "No." reset to plain navy Patua), and the referral-count line.
- **States:** the serial enters with a stamp (`.rq-stamp`); a `welcome=1` visit shows an olive
  confirmation banner (`.rq-bannerStamp`).
- **Accessibility:** the number is real text (with an `sr-only` `<h1>`); the frame is decorative.

### Cards (status: "Move up the line", "Rewards")
- **Structure:** an aged-paper panel (`--line` border, cream-tinted fill), a Patua caps title with a
  red underline, Bitter copy.
- **Sub-parts:** referral link row (Geist Mono in a navy-bordered well + a red Patua CopyButton,
  which pops on copy via `.rq-pop`), share row (Patua caps links, navy going red on hover), reward
  tiers (unlocked = red-tint bg + olive check; next = plain). The Rewards card only renders when the
  maker has configured tiers.

### Credit (PoweredBy)
- Patua caps, `--ink-soft`, centered inside the sheet footer. `RefQueue` is `--red`. On by default;
  `POWERED_BY=false` removes it.

---

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 120ms | ease-out | Button/link hover, focus ring, active press |
| Standard | 480ms | cubic-bezier(0.16,1,0.3,1) | Sheet entrance (fade + rise) |
| Ticket | 560ms | cubic-bezier(0.22,1,0.36,1) | Ticket drop-in (`.rq-ticketDrop`) |
| Stamp | 360–420ms | cubic-bezier(0.16,1,0.3,1) | Position serial + welcome banner |
| Pop | 260ms | cubic-bezier(0.22,1,0.36,1) | Copy-link confirmation (`.rq-pop`) |

### Rules
- **GPU-composited only**: `transform`, `opacity`, `filter`. Never animate layout.
- Every animation is gated behind `prefers-reduced-motion: no-preference` and enhances an
  already-visible default; reduced-motion is instant.
- Hover on the CTA brightens the ink slightly and presses on active, no glow.

---

## 7. Accepted debt / deferred

- **Accent theming is narrowed.** The fixed identity marks (the two-tone numeral, the red hairline
  rules, the act/card underlines, the status COPY LINK) reference `--red` directly, so
  `THEME_ACCENT_COLOR` currently retints the CTA fill + focus ring but not those marks. Intentional
  for now (it keeps the letterpress identity intact under any maker color); revisit if full
  re-tinting is wanted (route the marks through `--accent`).
- **Position-jump animation** -> wave two (its own mini-plan). The status ticket stub is its anchor.
- **Rye serial is not tabular**: acceptable for a static number; the tracking keeps digits legible.
  Digit alignment is handled in the animation mini-plan.
- **Light-only**: the public pages are always the aged-paper surface (the designed
  screenshot/video surface). No dark variant; paper grain + navy + red supply the drama.
- **Landing ticket is a fixed demo serial (REFQUEUE, No 00247)**: a cutout image, so it does not
  reflect a visitor's real number (they have none yet). The *status* stub is the live, dynamic
  serial.
- **Full Lighthouse-100 audit + react tooling**: not run this pass (SSR, near-zero client JS, a few
  transparent PNGs + one paper JPG, fast by architecture). Revisit if needed.
