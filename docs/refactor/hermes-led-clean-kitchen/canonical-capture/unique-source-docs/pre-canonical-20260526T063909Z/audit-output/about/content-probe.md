# /about — Content & Copy Probe

Scope: `src/app/about/page.tsx` only. Read-only analysis.

---

## 1. Full copy inventory

### Metadata
- `page.tsx:16` title: `About - CryptoTubers Ranked`
- `page.tsx:18` description: `We independently track and verify crypto YouTube calls against real market data using the published Alpha Score methodology.`

### Hero / header
- `page.tsx:117` back link: `Back to Leaderboard`
- `page.tsx:125` badge: `Independent Analytics`
- `page.tsx:130-132` h1: `About CryptoTubers Ranked`
- `page.tsx:135-138` subhead: `We independently track and verify the accuracy of crypto YouTube influencers' altcoin predictions against real market data. No opinions, no bias -- just numbers.`

### Key-fact cards (lines 82-107)
- `{trackedCreators}` + `Creators Tracked`
- `{scoredCalls}` + `Calls Scored`
- `18.7M` + `Candle Data Points`
- `Daily` + `Ranking Updates`

### "Why we exist" section (162-190)
- h2: `Why We Exist`
- p1: `Most crypto influencer "ratings" are based on subscriber counts, engagement metrics, or popularity polls. None of these tell you whether the person's calls actually make money.`
- p2: `We built CryptoTubers Ranked to answer the only question that matters: when a crypto YouTuber says "buy this coin," does it actually go up?`
- p3: `Every ranking on this platform is backed by verifiable data -- real predictions extracted from real videos, scored against real price movements from Binance. We don't accept sponsorships from tracked creators and have zero incentive to inflate or deflate any score.`

### "How It Works" steps (39-68)
- Subhead: `From video upload to accuracy score in four steps`
- Step 1 `Extract Predictions`: `We pull auto-generated subtitles from every new video and use AI to identify specific, actionable altcoin predictions.`
- Step 2 `Match Against Real Prices`: `Each prediction is matched against Binance OHLCV candle data across 18 tracked coins to measure actual price movement.`
- Step 3 `Compute Accuracy Scores`: `We score every call on direction accuracy, alpha over Bitcoin, specificity, market regime difficulty, and target hit rate.`
- Step 4 `Rank by Performance`: `Creators are ranked by their average Alpha Score across all scored calls, updated daily as new data arrives.`

### CTA block (227-252)
- h2: `Want the full details?`
- body: `Our methodology page breaks down every formula, every weight, and every data source we use to compute scores.`
- primary button: `Learn About Our Scoring Methodology`
- secondary button: `View Leaderboard`

### Not found in `public-methodology.ts`
The file contains only `PUBLIC_COUNT_LABELS` (`Tracked Creators / Creators Ranked / Tracked Calls / Scored Calls`) and scoring math. No prose copy to audit there.

---

## 2. Voice diagnosis — AI-slop phrases

Quoted with file:line.

| # | File:Line | Phrase | Why it's slop |
|---|---|---|---|
| 1 | `page.tsx:18,135` | "We independently track and verify" | Corporate-press-release voice. Repeats twice. "Independently" is SEO boilerplate. |
| 2 | `page.tsx:174-175` | "the only question that matters" | Cliché hype. Presumptuous. Every B2B landing page uses this. |
| 3 | `page.tsx:124` | "Independent Analytics" (badge) | Empty label. Tells the reader nothing. |
| 4 | `page.tsx:138` | "No opinions, no bias -- just numbers." | Rhyming tricolon = ad-copy tell. Tries too hard. |
| 5 | `page.tsx:182-184` | "real predictions extracted from real videos, scored against real price movements" | "Real X, real Y, real Z" — AI slop rhythm. Triple "real" is a verbal crutch. |
| 6 | `page.tsx:184-187` | "We don't accept sponsorships from tracked creators and have zero incentive to inflate or deflate any score." | Over-protesting. Reads as defensive PR, not matter-of-fact. |
| 7 | `page.tsx:229` | "Want the full details?" | Generic CTA pattern. |
| 8 | `page.tsx:234-235` | "every formula, every weight, and every data source" | Anaphoric "every X, every Y, every Z" — textbook LLM rhythm. |
| 9 | `page.tsx:198` | "From video upload to accuracy score in four steps" | Marketing-deck boilerplate. |
| 10 | `page.tsx:42` | "actionable altcoin predictions" | "Actionable" is a sales-deck word. |

**One-paragraph voice diagnosis:**
The page reads like it was written by a committee trying to sound trustworthy. It uses institutional plural "we" without identifying who "we" is — no founder name, no face, no personal stake — which paradoxically undermines the credibility it's trying to project. Rhetorical devices (triple-"real", "every X, every Y, every Z", "the only question that matters") are the tells of LLM-flavoured marketing prose. There is also a defensiveness problem: protesting "zero incentive" before anyone has asked raises the question. The strongest paragraph is the subscriber-counts critique (p1 of "Why We Exist") because it's specific and factual. The weakest is the closing of that same section, which buries the real claim (Binance OHLCV, no sponsorships) in slogan-rhythm.

---

## 3. Reference pick

**Winner: Glassnode.**

Rationale: Crypto-tuber-ranked's audience is retail traders who are skeptical of influencers and want verifiable on-chain / market-data receipts. That is Glassnode's exact positioning — "we built this because the data did not exist, here are the specific metrics, here is the methodology." Messari is too analyst-desk / institutional, and its founder-heavy format fits a content company more than a scoring engine. Dune is community-forward (look at these dashboards), which doesn't match a single opinionated ranking. Glassnode's "we saw a gap in verifiable data, we built the primitive, here is how the math works" framing maps 1:1 onto this project's 18.7M candles + Alpha Score story.

Secondary note: borrow Messari's founder-signature pattern for the origin paragraph (one human being staking reputation on the rankings), but keep Glassnode's data-first structure for everything else.

---

## 4. Rewritten `/about` proposal

> Sections below are in markdown for review. Each section caps at ~60 words. Numbers are pulled from the project's actual constants: 20 tracked creators, 18.7M Binance candles, ~4,598 calls, 18 tracked coins, 30d/90d horizons, Alpha Score weights 40/25/15/10/10.
>
> **`[TODO: founder name + handle]`** markers indicate spots the user must fill before publishing.

### Hero

**CryptoTubers Ranked**
*Scorecards for the 20 loudest altcoin channels on YouTube.*

Every call gets checked against Binance candles. Every creator gets one number. If they beat Bitcoin over 30 days, it shows. If they didn't, it shows.

---

### Origin  <!-- first-person, founder voice -->

I built this because I got tired of picking YouTubers by vibes.

`[TODO: founder name, e.g. "I'm Omar"]`. I trade altcoins. In 2024 I started logging which channels I was actually making money from and realised nobody was doing this publicly — so I wrote the pipeline and put it online.

*(Max ~55 words — trim further if founder adds a handle.)*

---

### Method

Four steps, no magic:

1. Pull YouTube captions from 20 tracked channels.
2. Extract coin + direction + target with an LLM (confidence ≥ 0.70 or the call is dropped).
3. Match each call against Binance 1-day OHLCV — **18.7M candles** across 18 coins.
4. Score at 30d and 90d horizons. Weights: direction 40, alpha-vs-BTC 25, specificity 15, regime 10, target-hit 10.

Full formulas live on [/methodology](/methodology).

---

### Who's tracked

20 channels, picked for size and altcoin focus. Roughly **4,598 calls** scored to date. New videos ingested daily; scores recompute when the 30-day and 90-day windows close.

Creator inclusion is editorial — if you think a channel belongs, [tell me](/feedback). I don't take money from anyone on the list.

---

### Proof

- Extraction confidence threshold: **0.70** (below that, the call is marked invalid and excluded).
- Alpha is return minus BTC return over the same window — not just price up.
- Sponsorship calls and obvious shills are flagged during extraction.
- Methodology is versioned; changes show up in git.

Everything here is falsifiable. If a score looks wrong, open an issue.

---

### CTA

**→ [See the leaderboard](/)**
**→ [Read the methodology](/methodology)**

---

## 5. Diff-style before/after — three most offending paragraphs

### Change A — Hero subhead

- **File:line:** `src/app/about/page.tsx:134-138`
- **Current:**
  > We independently track and verify the accuracy of crypto YouTube influencers' altcoin predictions against real market data. No opinions, no bias -- just numbers.
- **Proposed:**
  > Every altcoin call from 20 tracked YouTube channels, checked against 18.7M Binance candles at 30 and 90 days. One score per creator. Update daily.
- **Rationale:** Replaces two AI-slop phrases ("independently track and verify", "no opinions no bias just numbers") with four verifiable facts (20 / 18.7M / 30-90 / daily). Removes institutional "we". Passes the "earn your place" test — every clause carries information.

---

### Change B — "Why We Exist" p2

- **File:line:** `src/app/about/page.tsx:173-180`
- **Current:**
  > We built CryptoTubers Ranked to answer the only question that matters: when a crypto YouTuber says "buy this coin," does it actually go up?
- **Proposed:**
  > I built this because ranking influencers by subscriber count is useless if you're trying to decide who to listen to. The only signal that matters is: did the coin they called go up, and did it beat BTC? So I measure that.
- **Rationale:** Drops "the only question that matters" cliché. Adds founder voice (singular "I"). Specifies the actual comparator (BTC, not just "go up"), which is what the scoring code actually does (`alpha_30d` in `public-methodology.ts:89`). Connects claim to the code.

---

### Change C — "Why We Exist" p3

- **File:line:** `src/app/about/page.tsx:181-187`
- **Current:**
  > Every ranking on this platform is backed by verifiable data -- real predictions extracted from real videos, scored against real price movements from Binance. We don't accept sponsorships from tracked creators and have zero incentive to inflate or deflate any score.
- **Proposed:**
  > Source of truth: Binance daily OHLCV, 18 coins, 18.7M candles. Extraction confidence <0.70 is dropped. No tracked creator pays me; if that ever changes it will be disclosed here with a date.
- **Rationale:** Kills the "real X, real Y, real Z" AI rhythm. Replaces performative non-denial ("zero incentive to inflate or deflate") with a concrete disclosure commitment. Surfaces the actual 0.70 confidence threshold from `public-methodology.ts:11`, which is load-bearing but nowhere visible on the current page.

---

## 6. Notes for implementer

- Remove the `Independent Analytics` badge (`page.tsx:124`) entirely, or replace with the data scope e.g. `20 channels · 18.7M candles`.
- The `HOW_STEPS` constant on `page.tsx:39-68` is fine structurally; only the prose inside `description` needs editing.
- `keyFacts` on `page.tsx:82-107` already uses real DB numbers for `trackedCreators` and `scoredCalls` via `getPublicCounts()` — keep, but consider adding a fifth card for `beatBtcCreators` since it's already computed and is the most interesting number on the page.
- `public-methodology.ts` exposes `SCORE_WEIGHTS` and `EXTRACTION_CONFIDENCE_THRESHOLD` — import and render these inline instead of hard-coding them into copy, so the page stays truthful when weights change.
