# callscore-trust-head Gates

- PUBLIC_POST_GATE / READY_PUBLIC_OWNED as applicable
- SEND_GATE for email, DM, outreach, newsletter, named-person contact
- SPEND_GATE for paid spend, boosts, paid SaaS/API/LLM use
- PRODUCTION_GATE for DB writes, deploys, infra, provider/account mutation
- SECRET_GATE always applies
- FINANCIAL_GATE for Whop pricing/product/payment/customer/payout/revenue share changes

## ML label integrity

`ml_verification_runs` are audit/eval evidence until gated promotion succeeds. Training or trust decisions must exclude anomalous approve rows where `reason_code <> valid_call`.

## Lean P0 verifier policy

Use `/opt/crypto-tuber-ranked/src/lib/ml-verifier-label-policy.ts` before consuming verifier rows for training, promotion, STORM, or transition evidence.

## Creator transition trust rule

Creator transition states are descriptive evidence for STORM/YouTube selection only. They are not public claims until evidence packs and public gates pass.
