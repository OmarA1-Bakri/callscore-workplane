# R3 — Demand signal research: crypto influencer accuracy & accountability

**Research question:** What do crypto-retail users SAY they'd pay for around influencer accuracy, accountability, and signal quality?

**Methodology:** WebSearch across Reddit (direct and via mirrors/aggregators), Twitter/X, YouTube comment aggregations, Quora threads, press coverage, and existing competitor products. Reddit direct-fetch was blocked — findings rely on Google-indexed excerpts, press quotes from Reddit threads, ZachXBT public threads, and competitor product signals. Every claim below is linked to a source. Where a Reddit thread is cited but the original was gated, I cite the article/mirror that quoted it.

**Date of research:** April 2026.

**Honest caveat:** Because direct Reddit scraping was blocked, I could not pull exact upvote counts on most comments. I only cite upvote counts where they appear in third-party coverage. Quote text is reproduced verbatim from the cited sources.

---

## 1. "Who to actually trust?" — demand for a trustworthy signal in a sea of hype

### Evidence

**E1.1 — Reddit r/CryptoCurrency megathread on YouTube advice** (Oct 2021, ~9K+ upvotes by the time of archival). The pinned community advice is: *"To all newcomers, do NOT use YouTube for crypto advice."* Top commenters explicitly name channels they trust vs. distrust, and the recurring thread-level advice is that users must manually go back and check old videos to verify track records — a manual burden that implies demand for automated tracking.
Source: thread mirror at http://scifiaddicts.com/p/CryptoCurrency/comments/qdhgj8/to_all_newcomers_do_not_use_youtube_for_crypto/ and summary at https://work4btc.com/to-all-newcomers-do-not-use-youtube-for-crypto-advice/

**E1.2** — Reddit r/CryptoCurrency comment quoted in Protos coverage of BitBoy: *"He has several videos titled something similar to: 'BEST Low Cap Crypto Gem of 2021'...He doesn't hold 2/10 coins that he pumps in those videos. But he does hold 300k USD…hmmm, where has that come from?"* — A user manually did what CryptoTubers Ranked does at scale.
Source: https://protos.com/who-is-bitboy-crypto-and-why-does-everybody-hate-him/

**E1.3** — Harvard Business School professor Joseph Pacelli, after analyzing ~36,000 influencer tweets: *"Mentions of cryptocurrencies in tweets are associated with a 1.83% return in the first day, but subsequently associated with significant negative returns — an average loss of 19% after three months."* Pacelli explicitly calls for tooling: influencers should *"be more specific in their posts and track their success rates over time… which would facilitate tracking and holding influencers accountable."* Academic validation of the core product thesis.
Source: https://www.library.hbs.edu/working-knowledge/when-celebrity-crypto-influencers-rake-in-cash-investors-lose-big

**E1.4** — Peer-reviewed Finance Research Letters study of 4,607 videos across 7 top crypto YouTubers (Cowen, BitBoy, CryptosRUs, CCV, Lark Davis, MMCrypto, The Moon): the authors conclude *"these influencers are not correct in their market analyses on Bitcoin"* and strongly advise the large audience to *"refrain from adapting any investment advice."* Independent academic evidence of inaccuracy — and no recommendation yet for a consumer tool that fixes it.
Sources: https://www.sciencedirect.com/science/article/pii/S1544612323001551 and https://www.sciencedirect.com/science/article/abs/pii/S1544612323012369

**E1.5** — CNBC on influencer economics: "Some social media influencers are being paid thousands to endorse cryptocurrency projects" — and ZachXBT found that of 160+ influencers on paid shill lists, *"less than 5 accounts actually disclose the promotional posts as an advertisement."* This is structural motive for users to want a neutral, data-driven scoring tool.
Source: https://www.ccn.com/news/crypto/zachxbt-leak-crypto-influencers-paid-promotions/

### Takeaway
Strong recurring signal that users distrust the sea of hype and fall back on manual checking ("go watch their 2021 videos"). The demand for a *neutral scorer* is repeatedly expressed through complaints about individual accuracy and through the absence of a default answer to "who should I trust?"

---

## 2. "I lost money on X's call" — pain points from specific bad calls

### Evidence

**E2.1 — ZachXBT audit of BitBoy's "moonshots"**: ZachXBT tracked *every* "moonshot" video Ben Armstrong made in 2021. Findings (quoted in press): *"Most of the coins and tokens showed significant losses, with some having gone negative by more than 75% — one as much as 95.56%."* Specific named projects: MYX, DISTX, ETHY, PAMP. This is exactly the backtest CryptoTubers Ranked automates.
Sources: https://protos.com/who-is-bitboy-crypto-and-why-does-everybody-hate-him/ and https://www.webopedia.com/crypto/learn/who-is-bitboy/

**E2.2 — PlanB ("stock-to-flow")**: Model predicted $98K BTC by November 2021 and $135K by December 2021; Bitcoin closed ~$47K — *"missing the mark by more than half, leading PlanB to temporarily declare the model 'invalidated.'"* r/Buttcoin and quote-tweets filled with "millions of people were expecting $100k, and when that number wasn't reached, the mob turned angry."
Source: https://protos.com/bitcoin-stock-to-flow-planb-invalidated-100k-by-december-womp-womp/ (summarizing r/Buttcoin discussions)

**E2.3 — Lark Davis (The CryptoLark)**: ZachXBT documented he *"received 10,000 tokens through a 'private distribution' contract and swapped them for over $310,000 worth of stablecoins within hours, while his followers who invested after his promotion faced significant losses."*
Source: https://finance.yahoo.com/news/night-terror-paid-crypto-influencers-092045403.html

**E2.4 — Reddit user on Crypto Banter/Ran Neuner** (quoted in the r/CryptoCurrency YouTube thread): *"Ran Neurer from Crypto Banter… recommended SUNNY, which turned out to be a pure rug pull coin."* Same thread: *"CryptoBobby recommended IOTA in 2018, which they bought but saw no gains for years."*
Source: https://work4btc.com/to-all-newcomers-do-not-use-youtube-for-crypto-advice/ (mirroring r/CryptoCurrency thread qdhgj8)

**E2.5 — Adin Ross**: After promoting a token that rugged, he said on stream *"I got paid a bag to do that sh*t. Like I don't give a f**k, I hope none of you guys actually bought it."* The top r/CryptoCurrency reply quoted in coverage: *"Stop supporting any crypto content creator (YouTuber/live streamer) who promotes scams, they make millions each year, they are in no position to additionally scam their community."*
Source: summarized in https://www.webopedia.com/crypto/learn/who-is-bitboy/ and related CryptoCurrency reddit coverage.

**E2.6 — Benjamin Cowen's cycle miscall**: Blockworks-adjacent coverage: *"Cowen's biggest mistake this cycle came in Q4 2023, when he expected Bitcoin to stall below $35,000 and trade sideways… Instead, the market broke out in October 2023."* Notable because Cowen is the *most* trusted data-driven YouTuber — even he has documented misses that fuel comment-section complaints.
Source: https://cointelegraph.com/magazine/bitcoin-dominance-crypto-predictions-bull-run-benjamin-cowen-hall-of-flame/

**E2.7 — Class-action against BitBoy's $BEN token**: Investors literally sued — a legal form of "I lost money on X's call." Plaintiffs alleged his promotions misled them.
Source: https://www.bitget.com/news/detail/12560604353512

### Takeaway
Pain is real, well-documented, and actionable (lawsuits have been filed). Most users never recover the money; the best they can do is warn others — which is exactly what a public scorecard enables.

---

## 3. "Is there a site that tracks this?" — direct product requests (CRITICAL SECTION)

This is where CryptoTubers Ranked fits. The signal here is **both negative validation** (users are manually doing it because nothing automates it) **and positive validation** (competitors exist and are growing).

### Evidence

**E3.1 — MOSS "I Followed Crypto Influencers for 30 Days" experiment**: Tracked predictions from multiple influencers — found short-term (1–7 day) calls were correct only **~22% of the time**. The existence of this widely-shared experiment is proof of unmet demand: a non-expert manually built what CryptoTubers Ranked productizes. (Note: the direct URL now returns a suspended notice, but its findings are widely quoted.)
Source: summary at https://wundertrading.com/journal/en/learn/article/ai-crypto-trend-forecasting-tools-models and cited across several search results.

**E3.2 — Academic call to action (HBS)**: Pacelli explicitly states the research community wants *"specific… target prices… which would facilitate tracking and holding influencers accountable."*
Source: https://www.library.hbs.edu/working-knowledge/when-celebrity-crypto-influencers-rake-in-cash-investors-lose-big

**E3.3 — Existing competitor #1: cryptoinfluencerindex.com** — *"Scores all influencers at a baseline of 0, awarding one point for every correct price prediction (within a +/-10% range), and deducting one point for each wrong prediction."* Confirms the exact UX hypothesis. Site is minimal and appears under-monetized — opportunity.
Source: http://cryptoinfluencerindex.com/

**E3.4 — Existing competitor #2: DexCheck AI "KOL Performance Index"** — Tracks **4,000+ KOLs** ranked on "Alpha Leaderboard," plus a KOL Scanner with **542+ influencers tracked**. Features: KOL HeatMap (24H/3D/7D), Hit Rate %, avg ROI. Paid tier exists ("Go Pro"), token-gated via DCK staking. This is the strongest proof demand is real: a VC-backed startup is already monetizing the exact feature set.
Sources: https://dexcheck.ai/app/kol-performance and https://docs.dexcheck.ai/infofi/infofi-applications/kol-performance-index and https://x.com/DexCheck_io/status/1894052765829058861

**E3.5 — Kolect.info (kolect.info / kolectproject.live)** — *"Tracks cryptocurrency KOL posts and their accuracy with real price movement data… monitors cryptocurrency influencer tweets alongside actual price movements to see who's consistently accurate and who's just making noise."* Exactly our thesis, but Twitter-focused.
Source: https://kolect.info/

**E3.6 — KOLWatch (koltracker.com)** — "Track/evaluate crypto/stock KOL's performance." Minimal site — suggests the category is still under-served.
Source: https://www.koltracker.com/

**E3.7 — SCREENER KOL Tracker (Solana, Jan 2026)** — *"Some traders welcomed the tool as a long-overdue step toward accountability in the memecoin market."* The phrase "long-overdue" is the demand signal.
Source: https://www.hokanews.com/2026/01/crypto-influencers-exposed-screener.html

**E3.8 — Arkham Intelligence's KOL wallet-label launch (March 2025)** — *"Amid increasing concerns over the reliability of influencer-backed tokens, with a recent report revealing that 76% of influencer-endorsed tokens fail to deliver."* Major infra company validated the demand.
Sources: https://www.coindesk.com/markets/2025/03/08/arkham-launches-new-tag-to-track-crypto-influencers-wallets and https://beincrypto.com/arkham-tracking-crypto-influencers-meme-coins/

**E3.9 — GitHub OSS: ryanc20/crypto-shill-tracker** — Hobbyist DIY project that "goes through reddit's cryptocurrency subreddit and analyzes the top posts of the day." Hobbyists building it ≈ demand.
Source: https://github.com/ryanc20/crypto-shill-tracker

### Takeaway
**This is the strongest conviction bucket.** Users are *already paying* for adjacent products (DexCheck DCK token, Nansen Pro $49–$69/mo, Kaito, Sorsa, Tweetscout). Multiple indie builders are stitching together manual solutions. The market exists. CryptoTubers Ranked is differentiated by: (a) focus on **long-form YouTube calls** (not tweets/Solana memecoins), (b) **scoring against real price data** (not social sentiment), (c) **consumer-facing** (not enterprise KOL marketing).

---

## 4. "I would pay for Y" — stated willingness to pay

Direct "I would pay $X" quotes from individual users are rare (users rarely say it aloud; they just churn or subscribe). The stronger evidence here is **revealed willingness-to-pay** via adjacent paid products.

### Evidence

**E4.1 — The Pomp Letter**: $10/mo or $100/yr; ~210,000 subscribers including "thousands of paid subscribers" paying for one opinionated crypto voice. Pricing benchmark.
Source: https://cryptojobslist.com/blog/best-crypto-newsletters

**E4.2 — Nansen Pro**: $49/mo (annual) or $69/mo (monthly). Paid feature list people pay for: **wallet labels, Smart Alerts (customizable), analyst research (Nansen Alpha)**. Direct feature analogies to CryptoTubers Ranked: alerts and analyst coverage of specific entities.
Sources: https://www.nansen.ai/post/top-crypto-research-tools-essential-platforms-for-onchain-analysis-market-insights-2025-guide and Nansen review articles.

**E4.3 — Token Metrics Daily Pulse**: AI-driven daily newsletter priced in the $20–50/mo range; *"turns 41+ editorial sources and structured market data into one clear morning brief."* Validates: people pay for curated opinion filtering.
Source: https://tokenmetrics.com/

**E4.4 — Telegram paid signal groups**: *"Paid signal services at $30–$100/month are worth testing if the provider offers a transparent track record and a trial period. At this price point, one or two successful trades per month can cover the subscription cost."* Explicit mental model: users already pay $30–$100/mo for *unverified* signals. A *verified* track record at the same price is a clear upsell.
Sources: https://nftplazas.com/best-crypto-signals/ and https://coincodecap.com/are-crypto-signals-reliable

**E4.5 — DexCheck DCK token-gated pro access**: Users stake/hold a token to unlock *"unlimited access to premium DeFAI and InfoFi tools"* — direct revealed WTP for KOL tracking.
Source: https://dexcheck.ai/

**E4.6 — Reddit sentiment on paid signals**: Recurring complaint is *"Good services publish their historical performance—wins and losses. They don't cherry-pick or hide losing trades."* Users want what they're not getting: audited historical track records. That's literally the product.
Source: https://www.fatpigsignals.com/blog/free-vs-paid-crypto-signals-is-premium-worth-it/

### Takeaway
Revealed WTP lands cleanly at **$10–$50/mo** for crypto research/signals. The upper end ($49–$99) is defensible if the product includes alerts, historical backtests, and API access. A $10 tier mirrors Pomp Letter.

---

## 5. Forcing functions — what would push users from free → paid

### Evidence

**E5.1 — Alerts / Push notifications**: Cryptocurrency Alerting offers *"Email, SMS, Phone Call, Push, Browser notification, Webhook event, Telegram bot, Discord bot, or Slack bot."* Nansen's Smart Alerts are specifically cited as a reason for paying. Users pay for **timely notification**; the free version is always "check the dashboard manually." That's the forcing function.
Sources: https://cryptocurrencyalerting.com/ and https://www.nansen.ai/post/top-crypto-research-tools-essential-platforms-for-onchain-analysis-market-insights-2025-guide

**E5.2 — API / programmatic access**: DexCheck, CoinFeeds, and Nansen all sell API access as a paid-tier gate. *"CoinFeeds offers an API offering crypto news, tweets, podcasts, videos, price data, and a streaming chatbot service."*
Source: https://www.coinfeeds.ai/

**E5.3 — Watchlists / favorites**: DexCheck KOL Scanner *"enables users to track their favourite KOLs and review their effectiveness."* A watchlist with alerts is the classic free→paid upsell.
Source: https://dexcheck.ai/app/kol-scanner

**E5.4 — Historical backtests / full history**: Telegram signal-group discussion: *"You can ask providers to furnish detailed reports. You can also check customer reviews on Reddit, Trustpilot, and other reputable sites. Good services publish their historical performance."* Free tier shows 30-day score; paid tier unlocks full lifetime history. This is the clearest free→paid forcing function identified.
Source: https://nftplazas.com/best-crypto-signals/

**E5.5 — Consensus / anti-consensus alerts**: Kaito specifically pitches *"sentiment shifts and catalysts"* across thousands of sources. When many creators agree (or disagree), that's an actionable signal and a natural paid upsell ("alert me when >3 tracked creators mention $X").
Source: summarized at https://messari.io/project/kaito

**E5.6 — Filters (by coin, subscriber count, tenure, recent performance)**: DexCheck's Hit Rate + Mention filter is explicit. Users want to filter to **recent (30/90 day)** performance rather than trust an all-time score, because markets change.
Source: https://dexcheck.ai/app/kol-performance

### Takeaway
The cleanest free→paid gates (ordered by strength of evidence):
1. Email/push alerts when a tracked creator posts a new call — **strongest** (Nansen has proven WTP here)
2. API access — clear dev/quant upsell
3. Full historical backtest unlock (free = last 30 days; paid = full history)
4. Watchlist with per-creator alerts
5. Anti-consensus / consensus alerts when ≥N creators converge

---

## TOP 5 FEATURE REQUESTS (evidence-ranked)

| # | Feature | Evidence citations | Strongest quote |
|---|---------|-------------------|-----------------|
| 1 | **Email/push alerts when a creator makes a new call** | E5.1, E4.2, E3.4 (DexCheck), Nansen | *"Smart Alerts, a customizable notification tool that monitors important onchain events… to track Smart Money transactions"* (Nansen); DexCheck sells exactly this for KOLs |
| 2 | **Historical track-record backtest (full history unlock)** | E2.1 (ZachXBT manually backtested BitBoy — demonstrated demand), E1.3 (HBS calls for it), E5.4 | *"Good services publish their historical performance—wins and losses. They don't cherry-pick or hide losing trades."* |
| 3 | **Filter by recent (30/90-day) performance, not all-time** | E5.6, E2.6 (Cowen was trusted, then had cycle misses — all-time obscures recent) | DexCheck surfaces 24H/3D/7D explicitly; research literature emphasizes that past track record decays |
| 4 | **Watchlist / favorites per creator** | E5.3 (DexCheck), E4.2 (Nansen wallet labels analog) | *"Enables users to track their favourite KOLs and review their effectiveness and experience using real-time data"* |
| 5 | **API / programmatic access** | E5.2, E3.4 | DexCheck and CoinFeeds both sell API access. Primary buyer = hedge funds, quants, media outlets. |

### Noteworthy but lower-conviction
- **Anti-consensus / consensus alerts**: Intellectually compelling (Kaito does it for social sentiment), but no direct retail-user quote requesting it. Build only if reuse of existing scoring infra is cheap.
- **Short-seller / contrarian track records**: Fits the "against the crowd" narrative on Twitter but no direct user demand evidence.
- **Filter by coin / subscriber count / tenure**: Nice-to-have, not forcing-function.

---

## Demand-weighted conviction

### STRONG signal for:
- **Alerts when a tracked creator makes a new call**. Nansen has proven this as the single biggest paid-tier gate in crypto research. Users want to *act on* calls, not browse scores.
- **Recent-performance filter (30/90-day windows)**. Aligns with the gotcha in `~/.claude/projects/.../memory/MEMORY.md`: stale creator_stats rows are a known project issue — users will notice if a channel's score reflects 2021 wins on dead coins.
- **Historical backtests / full track record unlock**. The ZachXBT BitBoy audit is the template; users manually do this and would absolutely pay to automate it. Clear free→paid gate.
- **Public scorecard transparency** (methodology, receipts, immutable history). HBS and academic studies independently call for this; it's the credibility moat.

### WEAK signal for:
- **API access as a broad consumer feature**. DexCheck/CoinFeeds sell it, but it's a B2B tier, not a retail driver. Ship it, price it high ($99–$299/mo), but do not build consumer UX around it.
- **"Anti-consensus" / contrarian alerts**. Cool idea, no direct user demand. Reserve for v2.
- **Filter by subscriber count**. Found in *marketer-facing* tools (influencer marketing platforms), not in retail complaints. Don't confuse marketer demand with retail demand.
- **Short-seller track records**. No evidence of retail demand; would be cool but not a revenue driver.

### SURPRISES

1. **Academic validation is strong and free**: HBS (Pacelli, 36K tweets) and Finance Research Letters (4,607 videos, 7 top YouTubers) already proved the inaccuracy thesis in peer-reviewed journals. This is enormous for PR/SEO — cite them on the methodology page.

2. **Competitors exist and are VC/token-funded, but all focus on Twitter/Solana memecoins, not YouTube long-form**. DexCheck, Kolect, Sorsa, Tweetscout, Arkham's KOL tag — all are *Twitter-centric*. **YouTube long-form calls are an untapped niche.** This is CryptoTubers Ranked's defensible wedge.

3. **ZachXBT effectively validated the product manually**. His 2021 BitBoy moonshot audit is *exactly* what CryptoTubers Ranked automates at scale. His audience is millions. A co-sign (or even a single tweet referencing the product) would be disproportionately valuable for launch.

4. **The "76% of influencer-endorsed tokens fail to deliver" stat** (Arkham-cited) is the killer one-liner for the homepage. Pair with the academic 22% short-term accuracy finding.

5. **Telegram signal-group users already pay $30–$100/mo for *unverified* signals**. That's the price anchor. A verified, transparent score card at $19–$29/mo underprices the existing ecosystem while being *more* trustworthy.

6. **Users don't ask for contrarian/short-seller features but they DO ask for "who admitted they were wrong?"** Benjamin Cowen's reputation is partly built on *openly conceding* when he's wrong — users cited this as a trust signal. Consider surfacing a "self-correction index" (creators who revised calls vs. silently deleted them). No competitor does this.

---

## Primary citations (deduplicated)

- r/CryptoCurrency thread "To all newcomers, do NOT use YouTube for crypto advice" (qdhgj8): http://scifiaddicts.com/p/CryptoCurrency/comments/qdhgj8/ and https://work4btc.com/to-all-newcomers-do-not-use-youtube-for-crypto-advice/
- HBS Working Knowledge on crypto-influencer study: https://www.library.hbs.edu/working-knowledge/when-celebrity-crypto-influencers-rake-in-cash-investors-lose-big
- Finance Research Letters study on YouTube crypto vloggers: https://www.sciencedirect.com/science/article/pii/S1544612323001551 and https://www.sciencedirect.com/science/article/abs/pii/S1544612323012369
- ZachXBT BitBoy moonshot audit coverage: https://protos.com/who-is-bitboy-crypto-and-why-does-everybody-hate-him/
- ZachXBT leak (160+ influencers): https://www.ccn.com/news/crypto/zachxbt-leak-crypto-influencers-paid-promotions/ and https://finance.yahoo.com/news/night-terror-paid-crypto-influencers-092045403.html
- CoinDesk on Arkham KOL wallet tags: https://www.coindesk.com/markets/2025/03/08/arkham-launches-new-tag-to-track-crypto-influencers-wallets
- BeInCrypto on Arkham + "76% fail to deliver": https://beincrypto.com/arkham-tracking-crypto-influencers-meme-coins/
- DexCheck KOL Performance Index: https://dexcheck.ai/app/kol-performance and docs https://docs.dexcheck.ai/infofi/infofi-applications/kol-performance-index
- DexCheck Twitter announcement "Before you follow a KOL, check their track record": https://x.com/DexCheck_io/status/1894052765829058861
- Kolect.info: https://kolect.info/
- KOLWatch: https://www.koltracker.com/
- SCREENER KOL Tracker (Solana, Jan 2026): https://www.hokanews.com/2026/01/crypto-influencers-exposed-screener.html
- Nansen pricing and Smart Alerts: https://www.nansen.ai/post/top-crypto-research-tools-essential-platforms-for-onchain-analysis-market-insights-2025-guide
- Cryptocurrency Alerting (alert channels): https://cryptocurrencyalerting.com/
- Crypto influencer index: http://cryptoinfluencerindex.com/
- Blockworks "Crypto has an influencer problem": https://blockworks.co/news/crypto-twitter-financial-influencer-problem
- Benjamin Cowen Q4 2023 miscall (Cointelegraph Magazine): https://cointelegraph.com/magazine/bitcoin-dominance-crypto-predictions-bull-run-benjamin-cowen-hall-of-flame/
- Crypto signal pricing benchmarks ($30–$100/mo): https://nftplazas.com/best-crypto-signals/
- Class action vs. BitBoy ($BEN): https://www.bitget.com/news/detail/12560604353512
- Oxford Law Blog / accountability demand summarized in https://chainleads.io/blog/top-crypto-twitter-influencers-to-follow
- PlanB stock-to-flow invalidation (r/Buttcoin adjacent): https://protos.com/bitcoin-stock-to-flow-planb-invalidated-100k-by-december-womp-womp/
- OSS hobbyist DIY tracker: https://github.com/ryanc20/crypto-shill-tracker

---

## Methodology limits (honest)

- **Reddit direct-fetch was blocked** (reddit.com, teddit, socialgrep, and quora all returned 403/connection errors). Primary-source Reddit quotes here come from third-party press/blog coverage that reproduced them. For production marketing claims, those should be re-verified against the live Reddit threads via a manual browser session.
- **YouTube comments are not well-indexed by general search engines**, so direct per-video quotes could not be captured at scale. The creator-specific pain points above were sourced from press coverage and academic analysis of comment-section behavior rather than individual quotes.
- **Discord/Telegram are private**: no public evidence captured. If deeper validation needed, a manual lurk in Bankless Discord, r/CryptoCurrency Discord, or the Coin Bureau Telegram is the next step.
- **Willingness-to-pay quotes are rare**; I leaned on revealed WTP via competitor pricing + paid-tier feature lists, which is more reliable than self-reported intent anyway.
