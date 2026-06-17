# Migration Policy

This repo may receive copied source/control artifacts from the existing CallScore system as long as copying does not mutate or break active systems.

## Allowed by default

- Copy source files into this isolated repo.
- Copy docs, schemas, tests, contracts, and workflow definitions.
- Copy Whop/plugin source after excluding runtime/build folders and generated artifacts.
- Copy agent workflow definitions after excluding runtime/session material.

## Still requires exact approval

- Mutating `/opt/crypto-tuber-ranked`.
- Production DB writes or migrations.
- Provider writes, Whop pricing/product/customer/payment/entitlement changes.
- Service/container/tunnel restarts or config changes.
- Deploys, public publishes, sends, or spend.
