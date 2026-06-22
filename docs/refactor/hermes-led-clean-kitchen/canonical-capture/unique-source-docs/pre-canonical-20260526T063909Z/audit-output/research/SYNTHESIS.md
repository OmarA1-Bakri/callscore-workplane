# Revenue Proposal — Evidence-Backed

**Date:** 2026-04-19
**Basis:** 4 parallel research reports (R1-R4). All claims here cite the source report; source reports cite URLs + quotes.

---

## 1. Market verdict — the wedge is real

- **Category of one in YouTube lane.** 12 competitors checked (R1); zero ingest YouTube transcripts + score against price candles. Every accuracy-scoring competitor operates on Twitter / Telegram / on-chain wallets. YouTube is the loudest crypto media channel (Coin Bureau 2M+, Altcoin Daily 1.64M) and it is structurally unscored because calls are buried inside 20-min videos without structured posts.
- **People pay real money in this space.** Kaito $1.8M ARR at $99-$833/mo (on *gameable* mindshare). Nansen $9M revenue. Benzinga Pro ~$60-100M. TipRanks $200M acquisition. Action Network $240M acquisition. (R1, R2)
- **Demand is documented academically.** HBS Prof. Pacelli: influencer tweets → +1.83% day 1, −19% by month 3. Arkham (Mar 2025): 76% of influencer-endorsed tokens fail to deliver. Academic paper on 7 top YouTubers (Cowen, BitBoy, CryptosRUs, Lark Davis, etc.) concluded they are *not correct in market analyses*. (R3)

---

## 2. Pricing verdict — the user's "kill free tier" instinct is evidence-rejected

**R4 Q3 answer, direct quote:**
> "No — hard-trial-only is not well-evidenced for crypto-retail. Zero of the named crypto-info comparables (Nansen, Glassnode, Messari, Koyfin, Seeking Alpha, Substack) succeeded without a free tier."

**The evidence-backed move: reverse trial into a thin free tier.**

- 14 days full premium access, no credit card required at sign-up
- After day 14 → downgrade to thin free tier (not lockout)
- Conversion benchmark: **15-30%** (reverse trial) vs **2-5%** (pure freemium) vs **1-3%** (Substack paid newsletter median)

**Why thin free tier beats no free tier:**
- Opt-out (CC required): 48-50% trial-to-paid but 60-70% fewer signups
- Opt-in (no CC) + reverse trial: 18-25% trial-to-paid, **100% higher end-to-end paid yield** once 90-day retention is factored in (R4)

**Pricing anchor (R2 data points from 10 products):**
- TipRanks $30 · Seeking Alpha $25 · Pikkit $25 · WallStreetZen $19 · Action Network $30 · Stratechery $15 · TradingView $30 · Bankless $22
- **$19-$29/mo is the gravity well.** Dead zone $60-$199. Power tier clusters at $49-$59.

**Proposed pricing structure:**

| Tier | Price | Positioning |
|---|---|---|
| Free (thin) | $0 | The public research surface. Full leaderboard, full history, methodology, score breakdowns — always free. This is the moat. |
| **Pro** | **$19/mo or $190/yr** ("2 months free") | The daily-driver tier |
| **Pro+** (or "Alpha") | **$49/mo or $490/yr** | Anchor-decoy. Drives Pro-tier conversion per SaaStr data. Real customers for API. |

---

## 3. Feature verdict — what goes behind the paywall

**Unanimous across R2, R3, R4:** free = rankings/history/methodology/math. Paid = alerts, filters, exports, simulators, digests, API.

### Pro ($19/mo) — ship this first

| Feature | Evidence | Effort |
|---|---|---|
| **Per-creator alert subscriptions** (email + push when tracked creator makes a new call or a prior call scores as HIT/MISS) | R3: "Strongest paid gate = alerts." R4: +258% conversion vs calendar alerts, +190% retention. Nansen Smart Alerts is their #1 paid lever. | **1 week** (watchlist table + cron scanning new calls + Resend/SendGrid email) |
| **Watchlist / favorites** (save N creators, personalized feed) | R3 #4 ranked. R4: McKinsey 5-15% revenue lift from personalization. DexCheck sells exactly this. | Bundled into alerts work |
| **Recent-performance filter** (30/90-day performance instead of all-time) | R3 "STRONG": aligns with known project gotcha (stale `creator_stats`). Users want "who's good RIGHT NOW". | **2 days** (SQL windowing + UI filter) |
| **CSV export** of creator call history | R2: universal paid-tier feature. R3 bucket 5. | **4 hours** |

### Pro+ / Alpha ($49/mo) — ship next

| Feature | Evidence | Effort |
|---|---|---|
| **API access** (read-only endpoints, API keys, rate-limited) | R3 #5 + R4 Tier 3: "ship it, price high, don't build UX around it." B2B upsell for quants / analysts. | **1 week** |
| **Webhook notifications** (programmatic alerts on new calls or consensus events) | R4 Tier 1 (alerts, programmatic flavor). | **3 days** on top of alerts infrastructure |
| **Anti-consensus / consensus-convergence alerts** (≥N creators converge → notify) | R3 #5: cool but no direct demand signal. Ship as differentiator, not conversion driver. | **4 days** (clustering on existing consensus pipeline) |
| **Historical backtest simulator** ("What if I'd followed creator X starting Jan 2024?") | R3 #3 STRONG. Seeking Alpha's Alpha Picks template ($499 → sells hard on backtest + receipts). | **1 week** |

### Unique differentiator no competitor ships

**Self-correction index.** Score creators on how many past calls they publicly revised vs silently deleted. Rewards Cowen-type behavior, exposes creators who memory-hole bad calls. R3 explicitly flags this as a gap. Zero build cost once data pipeline is in place (we already extract calls from transcripts; we just need to flag delta-events).

---

## 4. Messaging — the homepage writes itself

All drawn from R3 sourced claims (academic + Arkham + ZachXBT):

> **76% of influencer-endorsed tokens fail to deliver** (Arkham, Mar 2025)
> **Crypto YouTubers are right about direction 22% of the time** (peer-reviewed academic study, 4,607 videos, 7 top creators)
> **HBS found influencer-tweeted tokens returned −19% over 3 months** (36,000 tweets)
>
> We score every call from 20 top crypto YouTubers against 18.7 million candles. No opinions. No bias. Just the numbers.

This is honest, evidence-backed, and DAMAGE to every incumbent.

---

## 5. Moat — the 5-move credibility defense (R2)

Every successful track-record-tracking product (TipRanks, Seeking Alpha, Pikkit, Metaculus) shares these 5 moves. We already have all 5 or can trivially ship them:

| Move | Our state |
|---|---|
| 1. **Deterministic scoring** (no opinion) | ✅ Already — 5-component Alpha Score |
| 2. **Minimum-N threshold** (anti-cherry-pick) | ✅ Already — "Low N" badge on <50 calls |
| 3. **Public methodology page** with exact formula | ✅ Already — `/methodology` |
| 4. **Benchmark comparison** (vs BTC, not just raw return) | ✅ Already — Alpha Over BTC is a component |
| 5. **Founder origin story** framed as accountability mission | ⚠️ Partial — `/about` has no founder voice (flagged earlier) |

**Move 5 is the missing piece.** The earlier content probe already proposed a rewrite. Ship it.

---

## 6. Revenue velocity — realistic 90-day math

- Assume homepage traffic = 1,000 uniques / week (plausible for a niche crypto tool; growth depends on marketing which is out of scope here)
- Trial signup rate (no-CC): **3-6%** of uniques (R4 benchmark) → 30-60 trials/week
- Reverse-trial conversion: **15-20%** → 5-12 paying/week
- Monthly churn: **7-10%** (R4 aggressive target for crypto-retail)
- **At steady state: ~$1,000-3,000 MRR by month 3** with *no marketing spend*.
- Annual plan uptake lifts LTV ~2x (R4). Bundle push: 17% discount framed as "2 months free."

**This is not life-changing money, but it's real revenue that validates the wedge and covers hosting + 1 creator salary.** Marketing (a single thread on crypto-Twitter referencing the Arkham 76% stat + ZachXBT co-sign) could 10x traffic cheaply.

---

## 7. Proposed build order (2-3 week MVP to paid revenue)

| Week | Deliverable | Unlocks |
|---|---|---|
| 1 | Alerts infrastructure (watchlist table + cron + email provider + unsubscribe). Whop checkout wired to real plan IDs. Pricing page rewrite (3 tiers + reverse trial messaging). | Day 1 revenue possible |
| 2 | Recent-performance filter. CSV export. About-page rewrite with founder voice. Homepage stat-callouts (76% / 22% / -19%). | Trial → paid conversion drivers live |
| 3 | Backtest simulator (Pro+ tier). API read endpoints + API key provisioning (Alpha tier). | Pro+ tier has real value; API opens B2B lane |

---

## 8. What NOT to do (evidence-rejected)

1. **Don't kill the free tier.** R4 is unambiguous. Reverse trial, not lockout.
2. **Don't price below $19 or above $59.** R2 data is unambiguous. $12 underpositions; $79 is the dead zone.
3. **Don't over-build Alpha tier before Pro has real value.** Alpha is the anchor — it sells Pro. R4: 60-70% of customers pick the middle tier when priced as good/better/best.
4. **Don't gate the methodology or score breakdowns.** R2 universal rule — rankings/math stay free or the credibility moat collapses.
5. **Don't ship API-first.** R4 Tier 3: small audience, high build cost, low conversion lever. Ship last.
6. **Don't use gold accent anywhere.** (Earlier design lock — not revenue-related but worth reinforcing.)

---

## 9. Open questions for the user

1. **Email provider choice:** Resend ($0-$20/mo, devex-friendly) vs SendGrid (Free tier OK, enterprise-y) vs Postmark (boring and reliable). My default: Resend.
2. **Alert frequency caps on free tier:** 0 alerts (Pro upsell), 1-2/week (soft gate), or N across all watchlists? My default: 0 (hard paid gate — strongest conversion lever).
3. **Whop vs Stripe:** Whop is already wired for auth; pricing is their native checkout. Stripe is the industry standard and recurring-billing-first. R1 note: token-gating (AlphaScan/CallScan) caps scale; Stripe-style pricing wins. Whop's hosted checkout is Stripe-like enough to avoid migration.
4. **Founder identity:** the `/about` rewrite needs a real name/handle/loss story. Is this you (Omar)? Or an anonymous persona?

---

## Sources

- [R1 — Direct crypto competitors](./R1-crypto-competitors.md)
- [R2 — Adjacent markets & pricing](./R2-adjacent-markets.md)
- [R3 — Demand signals from Reddit / X / academic](./R3-demand-signals.md)
- [R4 — Conversion patterns & trial mechanics](./R4-conversion-patterns.md)
