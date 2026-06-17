# Asset Pack 001 — Controlled Marketing Dispatch Approval Packet

Status: ready for Omar approval; no live publishing, sending, spend, Whop mutation, payment mutation, or DB mutation authorized by this file.
Prepared: 2026-06-05T07:09:40Z
Conversion path: https://call-score.com

## Asset readiness ranking

### Ready
- X launch thread — ready after compliance tightening; requires exact PUBLISH_GATE approval before posting.
- Whop marketplace listing copy — ready after compliance tightening; requires explicit Whop marketplace/listing mutation approval before dashboard/API update.
- Whop app icon — ready as a static upload asset; visual upload still requires operator action/approval.
- Whop app store image 1 — ready as a static upload asset; visual upload still requires operator action/approval.
- Whop app store image 2 — ready as a static upload asset; visual upload still requires operator action/approval.

### Needs edits / manual verification before use
- Whop web build bridge metadata — usable only after operator verifies the old build artifact and Whop dashboard permissions; not part of first controlled marketing copy dispatch.
- Existing social candidate 002 — safe but not launch-ready; lacks conversion path and exact launch framing.

### Unsafe
- Existing social candidate 003 — remains blocked by risk policy and must not be used.

## Dispatch asset 1

Channel: X/Twitter
Asset: X launch thread
Intended audience: crypto researchers, trader-education readers, creator-accountability observers, and Whop marketplace visitors.
Gate required: PUBLISH_GATE with exact payload-hash approval.
Payload hash: sha256:9b7b700111dbacd3a426edfa9a21f8707f5aef23def127620c1dccdbeabbda25
Risk notes: Public social post; reputational and compliance risk if changed after approval. Copy avoids investment advice, profit guarantees, unverifiable claims, defamatory creator language, predictive-edge framing, and includes education/research caveats.

Exact asset text:

Tweet 1:
1/ CallScore is live for research: a historical leaderboard for public crypto-creator market calls. It matches eligible calls to price outcomes and shows methodology/caveats. Not financial advice.

https://call-score.com

Tweet 2:
2/ Why it exists: crypto commentary is noisy. CallScore organizes public calls into evidence-backed records so users can inspect what was said, when it was said, and how the sampled outcome resolved.

Tweet 3:
3/ What you can check: creator leaderboards, call-level pages, evaluation windows, sample-size limits, and the scoring methodology. The data is retrospective; it does not predict future performance.

Tweet 4:
4/ How to use it: compare creators, inspect individual calls, and treat scores as research context — not buy/sell instructions.

Tweet 5:
5/ What it will not do: guarantee returns, judge creators as people, or imply past outcomes predict future results. Methodology and correction policy stay visible.

Tweet 6:
6/ Start here: https://call-score.com

Education/research only. No investment advice. No profit guarantees.

## Dispatch asset 2

Channel: Whop marketplace listing
Asset: CallScore Whop app store listing copy
Intended audience: Whop marketplace visitors evaluating crypto research and creator-accountability tools.
Gate required: WHOP_MARKETPLACE_GATE / exact operator approval before any Whop dashboard/API update. FINANCIAL_GATE is not covered; no payment, plan, price, payout, or checkout settings may be changed.
Risk notes: Marketplace-visible product copy; risk is low to moderate if unchanged. Copy avoids investment advice, profit guarantees, unverifiable claims, defamatory creator language, and predictive-edge framing. Education/research caveat and canonical conversion path are included.

Exact asset text:

```markdown
# CallScore Whop App Store Listing

## App Name

CallScore

## Short Description

Research crypto creators through historical, evidence-backed call outcomes.

## App Store Description

CallScore turns public crypto-creator market calls into a historical research leaderboard.

The app tracks eligible public calls, matches them against market price data, and displays outcomes with transparent methodology notes. Instead of relying on hype, reputation, or cherry-picked examples, CallScore helps users review how sampled calls resolved within defined evaluation windows.

Use CallScore to:

- Compare crypto creators by CallScore, win rate, call volume, and recent historical performance.
- Inspect ranked creator tables across 12-month, 90-day, and 30-day windows.
- Separate scored calls from low-confidence or unresolved calls.
- Review the scoring methodology and caveats behind published scores.
- Use historical creator-call data as research context before forming your own view.

CallScore is built for traders, researchers, communities, and crypto operators who want a cleaner way to evaluate public market commentary. It is an education and research tool only. It does not provide investment advice, trade recommendations, future-return predictions, or guaranteed outcomes. It does not judge creators as people; it evaluates sampled public calls against documented data and methodology limits.

Start here:
https://call-score.com

## Upload Assets

### Icon

Use:
`C:\Users\albak\xdev\Claude_Code_Automations\whop-app-store-assets\callscore-app-icon-1024.png`

### App Store Image 1

Use:
`C:\Users\albak\xdev\Claude_Code_Automations\whop-app-store-assets\callscore-store-image-1-homepage.png`

Caption:

Leaderboard and score summary for historical crypto creator market calls.

### App Store Image 2

Use:
`C:\Users\albak\xdev\Claude_Code_Automations\whop-app-store-assets\callscore-store-image-2-methodology.png`

Caption:

Transparent scoring methodology with documented call evaluation.

## API Notes

Whop documents `description`, `app_store_description`, `icon`, `base_url`, and `status` on the Update App endpoint.

The public docs do not clearly expose an app-store-gallery-image field in the same endpoint. If the Whop dashboard requires gallery images manually, use the two screenshots above.

Recommended status change after assets are accepted:

`live`

## App Build

Whop's App Builds API expects a platform build artifact. For `platform: web`, the documented artifact is a JavaScript file.

Use this generated web build bridge:

`C:\Users\albak\xdev\Claude_Code_Automations\whop-app-store-assets\callscore-whop-web-build-2204f061116f8fa05fd920ffbd0a47a38561f315.js`

Hermes copy:

`/srv/whop-auto/build-artifacts/callscore-whop-web-build-2204f061116f8fa05fd920ffbd0a47a38561f315.js`

Checksum:

`24e884693b39bf65d5aefc29e1c11d8dd6fd5e7f0bd22d73cd3823f272b9b6e2`

Platform:

`web`

Supported app view type:

`hub`

Source deployment:

`https://call-score.com/`

Source commit:

`2204f061116f8fa05fd920ffbd0a47a38561f315`

Uploaded Whop file:

`file_LYaH8FsDQt4wB`

Created Whop app build:

`apbu_oPVrzqik9vOEW`

Build status returned at creation:

`draft`

Promotion note:

Whop accepted the build creation through the SDK, but the same app key returned `403` on retrieve/list/promote with `Required permission: developer:manage_builds`. If the dashboard shows `apbu_oPVrzqik9vOEW`, promote it there only after explicit operator approval. Otherwise this is a Whop API permission inconsistency to raise with Whop support.
```

## Exact approval wording Omar must give

I approve Asset Pack 001 controlled marketing dispatch for the exact X launch thread payload hash sha256:9b7b700111dbacd3a426edfa9a21f8707f5aef23def127620c1dccdbeabbda25 and the exact Whop marketplace listing in this PR, using https://call-score.com as the conversion path. This approval covers only manual/controlled X posting and Whop listing copy update after channel gates pass. It does not approve spend, outreach, DB writes, production deploys, Whop/payment financial configuration changes, plan/price/checkout changes, or any asset not shown in this packet.

## Non-authorization statement

This packet does not publish, send, spend, deploy, mutate Whop/payment configuration, alter DB data, or approve any live action by itself.
