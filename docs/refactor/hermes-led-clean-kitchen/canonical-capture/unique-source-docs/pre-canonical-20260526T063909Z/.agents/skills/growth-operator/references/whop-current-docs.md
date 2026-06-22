# Whop Current Docs Ratification

Sources pulled from official Whop documentation on 2026-04-30. Re-check the linked docs before changing live Whop code, creating ads, or modifying payments/auth.

## Source Map

- Docs index: https://docs.whop.com/llms.txt
- OAuth guide: https://docs.whop.com/developer/guides/oauth
- Webhooks guide: https://docs.whop.com/developer/guides/webhooks
- Memberships list: https://docs.whop.com/api-reference/memberships/list-memberships
- Checkout configurations: https://docs.whop.com/api-reference/checkout-configurations/list-checkout-configurations
- Ad campaigns: https://docs.whop.com/api-reference/ad-campaigns/create-ad-campaign
- Conversions: https://docs.whop.com/api-reference/conversions/create-conversion
- Affiliates: https://docs.whop.com/api-reference/affiliates/create-affiliate

## Ratified Facts

- OAuth uses OAuth 2.1 + PKCE with OIDC. Endpoints live under `https://api.whop.com/oauth/`.
- Authorization URL is `https://api.whop.com/oauth/authorize`.
- Token exchange URL is `https://api.whop.com/oauth/token`; authorization-code exchange requires `client_id`, `redirect_uri`, and `code_verifier`.
- User profile lookup uses `https://api.whop.com/oauth/userinfo`; returned fields depend on scopes. `openid` is required, `profile` and `email` add profile/email fields.
- Logout should revoke refresh tokens via `https://api.whop.com/oauth/revoke`; access tokens expire and are not server-revoked.
- Webhooks must be verified. Whop follows the Standard Webhooks spec and the SDK `webhooks.unwrap` path is the preferred implementation.
- Webhooks can be company-scoped or app-scoped. App webhooks require relevant `webhook_receive:*` permissions.
- Membership listing is available through `/memberships` and requires `member:basic:read`; email data requires `member:email:read`.
- Checkout configurations can be listed through `/checkout_configurations` and require `checkout_configuration:basic:read`.
- Whop ad campaign creation uses `POST /ad_campaigns`, supports `meta` and `tiktok`, and requires `ad_campaign:create`, `access_pass:basic:read`, and `company:balance:read`.
- Whop conversion tracking uses `POST /conversions` and requires `event:create`.
- Affiliate creation uses `POST /affiliates` and requires `affiliate:create`.

## Repo Implications

- Treat any Whop OAuth code using `https://whop.com/oauth` or `/api/v5/oauth/token` as stale until reconciled with the current OAuth guide.
- Treat any Whop webhook verifier that hand-rolls HMAC headers as suspect unless it explicitly matches Standard Webhooks. Prefer `@whop/sdk` unwrap verification when adding webhook handling.
- Do not create Whop ad campaigns, conversion events, affiliate records, products, or checkout configurations without `SPEND_GATE` or `PRODUCTION_GATE` approval.
- For this app, checkout-link redirects are an acceptable first-launch path if OAuth entitlement checks are not yet ratified.
