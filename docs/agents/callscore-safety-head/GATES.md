# callscore-safety-head Gates

- PUBLIC_POST_GATE / READY_PUBLIC_OWNED as applicable
- SEND_GATE for email, DM, outreach, newsletter, named-person contact
- SPEND_GATE for paid spend, boosts, paid SaaS/API/LLM use
- PRODUCTION_GATE for DB writes, deploys, infra, provider/account mutation
- SECRET_GATE always applies
- FINANCIAL_GATE for Whop pricing/product/payment/customer/payout/revenue share changes

## News/media exclusion

News/media channels are context sources, not creator reliability subjects. Markov/trajectory or leaderboard-affecting modelling must exclude them unless a reviewed taxonomy says otherwise.

## Lean P0 creator eligibility

Use `/opt/crypto-tuber-ranked/src/lib/creator-eligibility/creator-eligibility.ts` to exclude news/media and unreviewed hybrid channels from creator reliability and transition modelling.

## Creator transition safety rule

Do not call transition states predictive. Use language such as creator trajectory, state movement, movement drivers, and trend confidence.
