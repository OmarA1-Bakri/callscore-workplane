# /about — Three Visual Design Directions

Design spike for crypto-tuber-ranked `/about` page. Read-only; no code changes.
Target audience: retail traders burned by influencer hype. Tone: skeptical, data-forward, non-hype.

Current baseline we are deliberately breaking with:
- Inter for everything
- Dark `#0a0a0f` + gold `#f5b947` + white
- Centered hero, 4-card stat row, "Why We Exist" paragraph, 4-card "How It Works", CTA card
- AI-marketing phrasing ("We independently track and verify...")

Anti-patterns explicitly avoided (per frontend-design skill): Inter, Space Grotesk, purple-on-white, generic SaaS card grid heroes, logo clouds, decorative gradients as content.

---

## Direction A — "The Ledger" (Editorial)

### Visual thesis
A long-form investigative newspaper spread that treats crypto influencer accountability as a serious beat, not a landing page.

### Typography pairing
- **Display:** *GT Sectra* (or *Canela*) — a contemporary serif with sharp, slightly blade-like terminals. Signals journalism, not fintech.
- **Body:** *Source Serif 4* at 19–20px for reading comfort; generous 1.65 line-height.
- **UI / captions / bylines:** *GT America Mono* at 11px, tracked +60, uppercase — used sparingly for datelines ("ISSUE 07 · APR 19 2026") and figure captions.
- *Rationale:* Two serifs + mono is the Bloomberg Businessweek / The Baffler stack. Nothing about it looks like a crypto product, which is the point.

### Color evolution
Full inversion. Dark mode is dropped.
- Paper: `#F4EFE6` (warm cream, newsprint not white)
- Ink: `#14120E` (near-black with warmth, not pure `#000`)
- Rule lines / underscores: `#14120E` at full weight, hairline (0.5px)
- Accent: a single blood-red `#B3261E` used *only* for pull-quotes, redaction bars over failed calls, and the CTA. Gold is retired here — it reads too crypto-Twitter.
- One photographic duotone option using cream + ink for any imagery.

### First-viewport composition
Imagine the front page of a broadsheet.
- Left two-thirds: massive serif headline set over 3 lines, ragged right, leading tight (1.02). Below it a one-sentence deck in italic serif.
- Right one-third: a narrow column labeled "THE NUMBERS, APR 2026" — a vertical stack of four figures (20 creators, 4,598 calls, 18.7M candles, daily updates) in tabular mono, each with a hairline rule beneath.
- Above everything: a thin cream-on-ink masthead strip with "THE LEDGER / A public record of crypto influencer accuracy / VOL I".
- No hero image. The typography *is* the image.

### Section architecture
1. **Masthead + headline page** (the hero above)
2. **The Lede** — a single 3-paragraph editor's note, drop-cap, set in two columns like a feature article. Tells the origin: retail got burned, nobody kept receipts, we did.
3. **Methodology, Annotated** — expository long-form with numbered footnotes (¹ ² ³) that anchor to a sidebar explaining the scoring math (return_30d, percent convention, candle source).
4. **Figures** — three full-width data-viz inserts with typeset captions ("Fig. 1 — Distribution of 30-day returns across 4,598 scored calls"). Charts are cream/ink only, no gradients.
5. **Masthead of Sources** — who the 20 tracked creators are, as a typeset list with channel handle, start date, total calls. Reads like a bibliography.
6. **Corrections & Caveats** — a deliberately prominent section listing known limitations (stale creator_stats rows, date-backfill gaps). Builds credibility through humility.
7. **Subscribe / Read the rankings** — a cream box with a red rule above it, one sentence and one link styled as an editor's sign-off.

### Signature interaction
On scroll, footnote numbers in the body text quietly reveal their definition in the right margin as that paragraph enters the viewport — a typeset hover without requiring a hover. Desktop only; mobile gets a tap-to-expand.

### Imagery approach
Almost none. One black-and-white editorial portrait-style illustration at the top of "The Lede" (etched/stippled, not AI-gradient). All other visual weight carried by typography, rule lines, and data charts.

### ASCII mockup (50 × 20)
```
+------------------------------------------------+
| THE LEDGER  vol I           APR 19 2026 · No.7 |
| ---------------------------------------------- |
|                                                |
|  We kept the receipts     | THE NUMBERS        |
|  they hoped you'd         | ------------------ |
|  forget.                  | 20     creators    |
|                           | 4,598  calls       |
|  An independent public    | 18.7M  candles     |
|  record of every crypto   | daily  updates     |
|  call, scored against     |                    |
|  18.7 million candles.    | ------------------ |
|                           | [Read rankings ->] |
|  ---- by the editors ---- |                    |
|                                                |
|  Drop-cap paragraph begins the editor's note   |
|  here, set in a warm serif at reading size...  |
+------------------------------------------------+
```

### Copy sample (hero headline)
> **We kept the receipts they hoped you'd forget.**

### Risk / cost
Typesetting quality is unforgiving — hyphenation, widow control, drop caps, and footnote anchoring all need real attention; licensing GT Sectra or Canela is not free (~$400–$800), though Source Serif + a serif like *Newsreader* from Google Fonts is a credible free substitute.

---

## Direction B — "The Terminal" (Data-forward)

### Visual thesis
A Bloomberg / `htop` hybrid: the `/about` page *is* a live system-status board for the tracker itself, and the copy lives inside the data.

### Typography pairing
- **Display + UI:** *Berkeley Mono* (or *JetBrains Mono* as free fallback) — the whole page is monospace. Hierarchy comes from size and weight, not from face changes.
- **One exception:** a single humanist sans, *Söhne Breit* (or free *IBM Plex Sans Condensed*), used only for the one full-sentence "why this exists" line — it lands harder because it breaks the monospace spell once.
- *Rationale:* Monospace-as-brand signals instrument, not influencer. Every character aligns to a grid, which is the visual rhyme for "we score everything consistently."

### Color evolution
Keep dark, retire the gold. Gold reads crypto-bro; replace with phosphor.
- Base: `#0B0F0E` (near-black, slight green undertone)
- Surface: `#121815`
- Primary text: `#C8D3CA` (warm off-white)
- Muted: `#5B6B63`
- Accent-pos: `#3FD67A` (terminal green, used for hits / green-candle moments)
- Accent-neg: `#FF5B5B` (terminal red, used for misses / red-candle moments)
- Exactly two accents. Gold is gone.

### First-viewport composition
A full-viewport status console. No centered hero, no headline poster. The page boots on load.
- Top bar: `CRYPTO-TUBER-RANKED :: v2.3.1 :: last-sync 00:04:17 ago`
- Left column (30%): a vertical menu of "modules" (OVERVIEW, METHODOLOGY, COVERAGE, LIMITATIONS, CHANGELOG) styled like a TUI sidebar with bracket-select state `> [OVERVIEW]`.
- Main pane: four monospace panels laid out in a 2×2 grid, each rendering a *live* figure with a sparkline:
  - `CREATORS_TRACKED ......... 20`
  - `CALLS_SCORED ......... 4,598  (+12 today)`
  - `CANDLES_INDEXED ......... 18,712,334`
  - `LAST_RESCORE ......... 04:17 UTC`
- Bottom strip: a scrolling ticker of the five most recent scored calls (`$SOL · TA-creator-x · +14.2% / 30d · HIT`).

### Section architecture
1. **Status console hero** (above)
2. **`> METHODOLOGY`** — expands to a terminal-style printout explaining the scoring formula; rendered as a fake `cat methodology.md` output with line numbers.
3. **`> COVERAGE`** — a heatmap of which creators have data for which months; cells are green/red/gray. Hovering a cell reveals a tooltip with call count.
4. **`> LIMITATIONS`** — deliberately rendered as a `cat KNOWN_ISSUES.txt` block. Signals engineering humility, not marketing polish.
5. **`> CHANGELOG`** — reverse-chronological commit-log style list of methodology updates, each dated. "APR 19 — Fixed stale creator_stats rows (gotcha: compute-scores never clears)."
6. **`> EXIT` (CTA)** — a single prompt line: `ready to see the rankings? [Y/n] _` with a blinking cursor. `Y` links to `/rankings`.

### Signature interaction
The page "boots" on load: for ~900ms the four stat values tick from `--------` to their real numbers digit-by-digit (like old departure-board split-flap). After load, the ticker at the bottom scrolls continuously and the `last-sync` counter increments in real seconds. One-shot boot, then calm.

### Imagery approach
Zero photos, zero illustration. All visual interest from monospaced type, hairline rules, sparklines, and heatmap cells. The `coverage` heatmap is the single most-photographable moment.

### ASCII mockup (50 × 20)
```
+------------------------------------------------+
| CTR :: v2.3.1 :: last-sync 00:04:17 ago        |
+------------------------------------------------+
| > [OVERVIEW]     | CREATORS_TRACKED ..... 20   |
|   METHODOLOGY    | CALLS_SCORED ...... 4,598   |
|   COVERAGE       |   (+12 today)               |
|   LIMITATIONS    | CANDLES_INDEXED 18,712,334  |
|   CHANGELOG      | LAST_RESCORE .... 04:17 UTC |
|                  |                             |
|                  | we score every public crypto|
|                  | call against 18.7M candles. |
|                  |                             |
+------------------+-----------------------------+
| TICKER: $SOL crypto-x +14.2%/30d HIT  $ETH ... |
+------------------------------------------------+
| > ready to see the rankings? [Y/n] _           |
+------------------------------------------------+
```

### Copy sample (hero headline)
> `$ tail -f /var/log/influencer-accuracy`

(As a second line under it, the one humanist-sans exception: "Every public crypto call, scored against 18.7 million candles.")

### Risk / cost
The "boot" sequence and live ticker must feel calm, not gimmicky — easy to over-animate. Heatmap needs real data wiring (cheap since DB exists), but accessibility of a pure-monospace page needs careful focus states and a non-TUI fallback for screen readers.

---

## Direction C — "The Receipts" (Founder / Manifesto)

### Visual thesis
A personal letter from a builder who got burned and refuses to let it go — quiet, confident, zero marketing voice, almost unsettlingly minimal.

### Typography pairing
- **Headline:** *Reckless Neue* (display serif with subtle contrast) at heroic sizes (96–128px). If budget-constrained: *Fraunces* from Google Fonts, optical size maxed.
- **Body:** *Tiempos Text* at 22px with 1.55 line-height. Substitute: *Newsreader*.
- **Signature / date:** a handwritten-but-legible script, *Caveat* (Google Fonts), used *once* to sign off the manifesto.
- *Rationale:* One big serif carrying emotional weight + one readable serif body is the Paul Graham essay / Stripe Press move. The single hand-lettered signature is the only non-digital mark on the page, and it's the thing people remember.

### Color evolution
Keep the dark palette, radically reduce it.
- Base: `#0E0E10` (slightly warmer than current `#0a0a0f`, less engineering-y)
- Text: `#E8E4DB` (warm off-white, not pure white)
- Muted: `#7A7468`
- Accent: a single desaturated copper `#C06438` — used only for the signature, the underline under key phrases, and the one CTA. Gold is gone; copper reads older, more oxidized, more human.
- No second accent. No gradients. No surface elevation.

### First-viewport composition
A page that looks like it's almost empty on purpose.
- Upper-left: tiny mono label `a note from the maintainer · apr 2026` in muted copper.
- Centered-left, taking roughly 55% of the viewport width: a single sentence in 120px Reckless serif, left-aligned, wrapped across 3 lines.
- Below it, a lot of whitespace. No visible CTA above the fold.
- Lower-right of the viewport, small: `↓ keep reading` in muted text — the only cue to scroll.
- No navigation bar styling; nav shrinks to a tiny top-right `rankings  ·  sources  ·  github`.

### Section architecture
1. **Opening line** (the hero above) — one sentence, nothing else.
2. **"Here is what happened to me"** — three short paragraphs of body serif, first-person, about losing money on a pump call. No stats, no charts. Pure narrative. This is the emotional anchor of the page.
3. **"Here is what I built instead"** — three more paragraphs, still first-person, explaining the tracker in plain language. One inline stat: "As of today, I have scored **4,598 calls** from **20 creators** against **18.7 million candles**." Numbers in copper, not gold.
4. **"Here is what I will not do"** — a short creed, set as a vertical list with copper bullets: I will not charge creators. I will not take sponsorships from tracked creators. I will not hide methodology. I will not hide my mistakes. This is the page's memorable moment.
5. **"Here is how to check my work"** — two short paragraphs pointing to the open methodology and the public data. One inline link to the GitHub. No "trust us" — "verify us."
6. **Sign-off** — the handwritten signature in copper, a date, a first name, and a single sentence: "If I ever stop updating this, assume I sold out." Below it, the one CTA as a plain underlined text link: `see the rankings →`.

### Signature interaction
Scroll-linked reveal: each paragraph fades in *only* when the previous paragraph has fully left the top of the viewport, enforcing a one-idea-at-a-time reading pace. Effectively a soft "scrollytell" without snap-scrolling. The signature draws itself stroke-by-stroke (SVG path animation, ~1.2s) when it enters view — this is the single delightful moment.

### Imagery approach
None, with one exception: the handwritten signature rendered as an SVG path. No stock photos, no illustrations, no data charts on this page (charts live on `/rankings`, not here). The absence of imagery is the statement.

### ASCII mockup (50 × 20)
```
+------------------------------------------------+
| a note from the maintainer   apr 2026          |
|                                                |
|                                                |
|   I lost $11,400 the month                     |
|   I started trusting                           |
|   YouTube.                                     |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                               keep reading ↓   |
+------------------------------------------------+
```

### Copy sample (hero headline)
> **I lost $11,400 the month I started trusting YouTube.**

(Alternate, less personal: "Nobody was keeping score. So I did.")

### Risk / cost
Copy quality is the whole product — the page collapses instantly if the narrative sounds fake, AI-generated, or marketing-polished; requires a real human voice and probably an actual number to anchor the opening line. Low technical cost, high copywriting cost.

---

## Cross-direction summary

| Direction | Audience read | Trust signal | Primary risk |
|---|---|---|---|
| A — The Ledger | "This is journalism" | Footnotes, corrections, sources list | Typesetting quality + font licensing |
| B — The Terminal | "This is an instrument" | Live data, changelog, known issues | Motion-as-gimmick, a11y of TUI aesthetic |
| C — The Receipts | "This is one human" | First-person, public creed, signature | Copy must be genuinely human-written |

All three kill the gold-accent + Inter + centered-stat-card pattern. All three replace marketing voice with something more specific. All three can coexist with the existing `/rankings` dark theme because they are the *about* page — the one page where tone can do the most work.
