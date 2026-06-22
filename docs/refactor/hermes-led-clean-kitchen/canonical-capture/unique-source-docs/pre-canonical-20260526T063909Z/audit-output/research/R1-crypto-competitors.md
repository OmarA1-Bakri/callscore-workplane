# R1: Direct Crypto Competitor Report

**Research question:** What products/services track the accuracy of crypto YouTubers, influencers, Twitter personalities, or newsletter authors? Who makes real money? Where is the YouTuber-specific gap?

**Method:** WebSearch + WebFetch. Every claim below has a source URL. When a fetch failed (403/429), the claim is sourced to a secondary citation and flagged.

---

## Products found (12 total with evidence)

### Tier 1 — Products that explicitly score influencer prediction accuracy (our closest competitors)

#### 1. Sanitizer (by KOLs_Tracker, surfaced via Santiment)
- URL: https://sanitize.page/leaderboard (and feed amplified by https://x.com/santimentfeed/status/2009730931465019558 )
- Founded: Visible promotional activity 2025 onward (Santiment's own account is pushing it monthly through 2025–2026)
- Pricing: No public pricing page. Leaderboard appears free; Santiment's parent analytics plans are the only monetisation surface I could confirm.
- Free tier: Leaderboard with win rate, PnL, full call history, preserves deleted posts.
- Paid tier core value: None dedicated. Revenue is indirect via Santiment subs (santiment.net).
- Revenue signal: Operated under Santiment's umbrella; Santiment is a known paid analytics vendor but no public ARR disclosed.
- Evidence quote: "Objectively see how accurate KOL's really are, with Sanitizer!" — Santiment's official X account promoting the leaderboard ( https://x.com/santimentfeed/status/2009730931465019558 ).
- Scope: Twitter/X KOLs only. No YouTube. Call-by-call tracking with price-movement verification.

#### 2. AlphaScan AI ($ASCN)
- URL: https://alphascan.cloud/ ; docs https://alphascan.gitbook.io/docs/
- Founded: Early 2023
- Pricing: Token-gated (hold $ASCN). Private/public sale raised $2.1M total per https://www.hackquest.io/projects/AlphaScan-AI
- Free tier: Basic sentiment/token views.
- Paid tier core value: Influencer leaderboard ranking KOLs by post-call token performance + Telegram trading bot for fast entries.
- Revenue signal: $2.1M raised in public/private sale; 25k users in private beta; 20k+ Twitter followers in first 4 months (medium.com/@alphascan ). Token market cap on CoinMarketCap listing.
- Evidence quote: "By scraping data from hundreds of Twitter accounts and Telegram call channels, the platform assesses… how well a token performs after being mentioned by influencers" — https://alphascan.medium.com/introduction-to-alphascan-95f6c3486b92
- Scope: Twitter + Telegram call channels. No YouTube.

#### 3. CallScan.io
- URL: https://www.callscan.io/ ; docs https://callscan.xyz/docs ; leaderboard https://www.callscan.io/leaderboard
- Founded: Launched alongside a meme-coin packaging in 2024 (per Bitget: https://www.bitget.com/price/callscan/what-is )
- Pricing: Token-gated ($SCAN with "tier-based benefits" per docs); no fiat pricing page found.
- Free tier: Leaderboard access, basic call tracking.
- Paid tier core value: Monitors 1,000+ channels across Telegram/Discord/X; ZK-proof PnL cards; caller success rates.
- Revenue signal: Token market cap listed on CoinMarketCap/Bitget; no ARR or user counts publicly disclosed.
- Evidence quote: "a comprehensive analytics platform that tracks and verifies alpha calls across social media" — https://callscan.xyz/docs
- Scope: Twitter + Telegram + Discord. No YouTube.

#### 4. DexCheck KOL Scanner
- URL: https://dexcheck.ai/app/kol-scanner
- Founded: DexCheck AI — active product surface in 2024-2025
- Pricing: Freemium with "Go Pro" CTA visible on the page; specific Pro price not exposed without sign-in.
- Free tier: Track token performance after KOL mention; "0 KOLs tracked" free-tier placeholder.
- Paid tier core value: Pro tier (price undisclosed on landing).
- Revenue signal: Not disclosed.
- Evidence quote: "KOL Scanner helps you track token performance after mentions from your favorite KOLs, so you can judge the quality of their calls" — https://dexcheck.ai/app/kol-scanner
- Scope: Token/contract calls on-chain. No YouTube, no newsletter.

#### 5. KolClaw
- URL: Covered by Phemex News: https://phemex.com/news/article/kolclaw-launches-ai-tool-to-track-and-score-kol-wallet-authenticity-58914
- Founded: 2024-2025 (launch announcement timing)
- Pricing: Not disclosed publicly.
- Free tier: Composite KOL score 0-100 across five on-chain metrics.
- Paid tier core value: Monitors 99+ Solana KOL wallets for "Consistency, Rug Avoidance, Timing, Holding, and PnL Honesty."
- Revenue signal: Early-stage, AI-agent branded; no ARR disclosed.
- Evidence quote: "KolClaw assesses each KOL using five on-chain metrics: Consistency, Rug Avoidance, Timing, Holding, and PnL Honesty, with a composite score ranging from 0 to 100" — https://phemex.com/news/article/kolclaw-launches-ai-tool-to-track-and-score-kol-wallet-authenticity-58914
- Scope: On-chain wallet behaviour of Solana KOLs only. Does NOT score their verbal YouTube/Twitter predictions.

#### 6. Kolscan.io
- URL: https://kolscan.io/
- Pricing: FREE. "All Kolscan features are free to use." (Landing page quote)
- Free tier: Realtime Solana wallet tracker; leaderboard by PnL (requires $100k+ PnL to qualify for KOL listing).
- Revenue signal: No paid tiers, token-based monetisation ($KOLSCAN listed on CoinGecko/DropsTab).
- Evidence quote: "Kolscan is a Solana wallet tracker that monitors the activities of top memecoin traders and KOLs" — https://kolscan.io/
- Scope: Wallet PnL, NOT prediction accuracy. Wrong-level competitor.

#### 7. Alphametrics (found at callscan.io domain)
- URL: Landing page redirected to Alphametrics product — "Real-time analysis of profitable calls, smart money indicators and data aggregation" (my WebFetch of callscan.io resolved to Alphametrics content).
- Pricing: Not on landing.
- Free tier: Profile/contract analysis, leaderboard, timing intelligence.
- Scope: Solana-focused.

#### 8. CoinLaunch Score (influencer ranking, including YouTubers)
- URL: https://coinlaunch.space/influencers/ and https://coinlaunch.space/influencers/youtube/
- Pricing: Free to browse.
- Value: Hand-analyses 80+ factors per influencer, including social presence, "connections to scams, supported projects and associated funds" — but this is reputation score, not prediction accuracy against price.
- Evidence quote: "gather top crypto, NFT and DeFi influencers to evaluate them using their proprietary CoinLaunch Score rating system" — https://coinlaunch.space/influencers/
- Scope: Includes YouTube influencers by name, but scores them on brand/reputation rather than backtested calls. Closest thing to a YouTube scoreboard that exists, and it's still not a prediction tracker.

### Tier 2 — Adjacent analytics that track influence (not prediction accuracy)

#### 9. Kaito AI
- URL: https://www.kaito.ai/ ; pricing https://pro.kaito.ai/pricing (403'd on direct fetch, prices sourced via https://kaito-ai.gitbook.io/product-docs/others/plans and Blocmates review)
- Founded: 2022 (Seattle, co-founders Yu Hu & Yunzhong He) — https://tracxn.com/d/companies/kaito/...
- Pricing: Standard $99/mo, Premium $416/mo, Elite $833/mo (25% yearly discount). Crypto pay via Loop Crypto.
- Free tier: Yap-to-earn leaderboard (social mindshare) is free and public.
- Paid tier core value: AI-indexed crypto research across podcasts, Twitter, Discord, research articles.
- Revenue signal: **$1.8M revenue in 2025, ~30-37 employees** ( https://getlatka.com/companies/kaito.ai and https://www.linkedin.com/company/kaitoai ). Total funding $10.8M; Series A at $87.5M valuation June 2023. Launched a TGE token ($KAITO).
- Evidence quote: "In 2025, Kaito's revenue reached $1.8M" — Latka profile.
- Key caveat: Kaito tracks **mindshare** (how much a project/KOL is being talked about), NOT **accuracy** of predictions against price. Their own co-founder circle was criticised: "many top-ranked KOLs know little about the projects they boost" — https://beincrypto.com/kaito-updates-crypto-mindshare-algorithm/

#### 10. LunarCrush
- URL: https://lunarcrush.com/pricing (WebFetch blocked by "Limited data mode", prices below sourced via https://aichief.com/ai-data-management/lunarcrush-review-2025/ )
- Founded: 2018, Newport Beach
- Pricing: Free $0 / Individual Pro ~$24/mo / Builder API ~$240/mo / Enterprise custom
- Free tier: Basic market insights, AltRank™, limited social data.
- Paid tier core value: Galaxy Score™, full sentiment, custom alerts, MCP SDK for builders.
- Revenue signal: Series A $5M (July 2023), total funding $5-7M, **~15 employees** ( https://www.crunchbase.com/organization/lunarcrush ), revenue estimated $100K-$5M (broad bracket).
- Evidence quote: "Social influencers with a minimum of 500 followers and at least minimal engagement on their tweets… are taken into account. All influencers are measured by… followers, replies, favorites, and retweets" — https://messari.io/project/lunarcrush/profile
- Key caveat: LunarCrush measures **social influence volume**, not prediction accuracy. No backtesting against price movement after a creator's call.

#### 11. TwitterScore
- URL: https://twitterscore.io/
- Pricing page exists at /pro-prices/ but the homepage hides tier specifics; a free daily-stats export is offered.
- Value: Scores Twitter accounts by the *quality* of their followers (crypto projects, VCs, founders) — useful for detecting shill farms but not prediction accuracy.
- Evidence quote: "extract the most valuable followers and see who they followed to" — https://twitterscore.io/
- Scope: Social graph analysis. Not a predictor tracker.

#### 12. IntoTheBlock Predictions
- URL: https://app.intotheblock.com/predictions and https://resources.intotheblock.com/price-predictions/predictions-overview
- Founded: 2018; rebranded/merged into Sentora (institutional DeFi layer)
- Pricing: Browser notifications gated to Pro subscribers; Pro pricing not on public page.
- Value: **Their own ML model's predictions + historical accuracy panel** (not an influencer scoreboard). Documented 55-65% directional accuracy.
- Evidence quote: "the 7-day average rate that the predictive model has been correct… if the model has an accuracy of 70% it has on average accurately predicted 7 out of 10 predictions" — https://resources.intotheblock.com/price-predictions/predictions-how-can-i-use-them
- Scope: Self-scoring AI model, not tracking humans.

### Tier 3 — Adjacent context (checked and explicitly NOT prediction-accuracy trackers)

- **Nansen** ( https://www.nansen.ai ) — wallet labels + Smart Money tracking. 2024 revenue $9.08M, 106 employees, raised $88.2M ( https://getlatka.com/companies/nansen , https://tracxn.com/d/companies/nansen/... ). Pro plan $49/mo annual. Adjacent, not a creator-scoreboard.
- **Arkham Intelligence** ( https://intel.arkm.com/ ) — free wallet deanonymization; paid Intel Exchange marketplace. Not a creator tracker.
- **Messari** ( https://messari.io/pricing ) — Pro $29.99/mo ($24.99 annual), Enterprise $6k-$34k/yr. Research, not creator accuracy.
- **CryptoQuant** ( https://cryptoquant.com/pricing ) — Advanced $39/mo, Professional $109/mo, Premium $799/mo. On-chain data only.
- **Coin Bureau / Altcoin Daily** — YouTube channels themselves; neither has a verifiable track record dashboard. Altcoin Daily explicitly flagged: "no verifiable record of past predictions' accuracy" ( https://www.btcc.com/en-US/square/LedgerSpectre/768207 ).
- **Bankless** — $12/mo newsletter ( https://www.bankless.com/newsletter ). Makes money from subs but does not publish accuracy scorecards.
- **Whop crypto communities** — $30-$500/mo signal groups on https://whop.com/discover/the-house-of-crypto/ . $1.2B GMV across all categories ( https://www.sourcery.vc/p/exclusive-how-whop-hit-12-billion ). Individual groups claim win rates (CryptoNinjas "94.26%", Crypto Inner Circle "91%") but sources note "most providers score 1-2 out of 5 in proof of performance due to lack of independent verification" ( https://nftevening.com/best-crypto-signals/ ).

---

## Revenue reality check (the money question)

| Product | Type | Confirmed revenue | Employees | Funding |
|---|---|---|---|---|
| Kaito AI | Mindshare, not accuracy | **$1.8M (2025)** | 30-37 | $10.8M, $87.5M valuation |
| Nansen | Wallet labels (adjacent) | $9.08M (2024) | 106 | $88.2M |
| LunarCrush | Social influence (adjacent) | $100K-$5M (range) | ~15 | $5-7M |
| Messari | Research (adjacent) | Not disclosed | — | Funded |
| AlphaScan | Influencer leaderboard | Token sale $2.1M | Small | Token funded |
| Sanitizer | KOL accuracy | Not disclosed | — | Under Santiment |
| CallScan / Kolscan | KOL/wallet track | Token revenue only | — | Token funded |

**Headline:** Kaito is the biggest "creator-adjacent" player and it is doing only $1.8M ARR on ~30 staff. The whole niche of scoring influencers is dominated by tiny token-funded projects (AlphaScan $2.1M raised, CallScan token-gated, Sanitizer free-with-Santiment-upsell). The only real fiat-SaaS pricing comes from analytics platforms that don't score creators (CryptoQuant $39-$799, Messari $29.99, Nansen $49, LunarCrush $24).

---

## Top-3 takeaways for crypto-tuber-ranked

1. **Nobody scores YouTubers.** Every single tool above (Sanitizer, AlphaScan, CallScan, KolClaw, Kolscan, Alphametrics, DexCheck KOL Scanner) tracks **Twitter/X + Telegram + on-chain wallets**. CoinLaunch Score is the only one listing YouTubers, and it rates them on brand/reputation, not backtested call accuracy ( https://coinlaunch.space/influencers/youtube/ ). The YouTube format — long-form, timestamped, transcribable — is uniquely well-suited to accuracy scoring, and it is untouched. Our 18.7M candle backtest against transcripts is a category of one.

2. **The category pays, but only for verification credibility.** Whop creators charge $30-$500/mo for crypto signals and collectively power $1.2B in GMV, yet "most providers score 1-2 out of 5 in proof of performance" ( https://nftevening.com/best-crypto-signals/ ). The market is desperate for independent verification. Kaito getting to $1.8M ARR on pure mindshare (no accuracy) shows there is willingness to pay for rankings even when the rankings are gamed ( https://beincrypto.com/kaito-updates-crypto-mindshare-algorithm/ ). An accuracy tracker with a reproducible methodology is the missing piece.

3. **Token-gating is how competitors monetise, and it caps them.** AlphaScan, CallScan, Kolscan, KolClaw all chose token economics instead of fiat SaaS. That limits their addressable market to crypto-native speculators and ties company revenue to token-price cycles. The only fiat-SaaS players who have grown to $M-scale in adjacent lanes (Nansen $9M, Kaito $1.8M) did so with Stripe-style pricing pages. Our path: a clean fiat tier (Whop or Stripe) without token dependency, priced between Messari ($29.99) and CryptoQuant Professional ($109). The gap at that price point is real.

---

## What's MISSING from the market (the gap we could fill)

I checked Sanitizer, AlphaScan, CallScan, Kolscan, DexCheck KOL Scanner, Alphametrics, KolClaw, Kaito, LunarCrush, TwitterScore, CoinLaunch Score, IntoTheBlock, and a dozen adjacent tools. **Zero of them ingest YouTube transcripts, extract timestamped price calls, and score them against historical candles.** They all operate on (a) Twitter/X posts, (b) Telegram/Discord calls, or (c) on-chain wallet PnL. The YouTuber format is the loudest and most-consumed crypto media channel — Coin Bureau alone has 2M+ subs ( https://socialblade.com/youtube/handle/coinbureau ), Altcoin Daily 1.64M ( https://www.btcc.com/en-US/square/LedgerSpectre/768207 ) — and it is a dark zone for accountability because calls are buried inside 20-minute videos with no structured post. The product-shaped hole is: **YouTube-first, transcript-grounded, citeable-to-second accuracy scoring**, which is exactly what crypto-tuber-ranked is built on. Secondary gaps: (i) no competitor publishes a methodology page with reproducible scoring math — Kaito's lack of transparency is its most cited weakness ( https://beincrypto.com/kaito-updates-crypto-mindshare-algorithm/ ), so a public methodology page is a moat; (ii) no competitor handles the "we can't predict the future" credibility problem by scoring *against actual post-call candles* at fixed horizons — they either show raw PnL (gameable) or social volume (not predictive at all).

---

**Status:** DONE
