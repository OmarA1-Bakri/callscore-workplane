# callscore-data-pipeline-sentinel Gates

- PUBLIC_POST_GATE / READY_PUBLIC_OWNED as applicable
- SEND_GATE for email, DM, outreach, newsletter, named-person contact
- SPEND_GATE for paid spend, boosts, paid SaaS/API/LLM use
- PRODUCTION_GATE for DB writes, deploys, infra, provider/account mutation
- SECRET_GATE always applies
- FINANCIAL_GATE for Whop pricing/product/payment/customer/payout/revenue share changes

## Transition/intelligence guard

Markov, STORM, or creator-trajectory work must not proceed from `creator_stats.30d`, unpromoted ML verifier labels, or news/media channels unless the pipeline guard output is explicitly acknowledged in the receipt.
