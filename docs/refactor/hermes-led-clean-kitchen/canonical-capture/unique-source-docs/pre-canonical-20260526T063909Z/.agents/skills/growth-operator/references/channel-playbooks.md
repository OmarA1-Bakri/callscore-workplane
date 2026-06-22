# Channel Playbooks

## Whop Marketplace

- Verify app name, tagline, pricing, refund policy, support contact, app URL, OAuth/callbacks, webhook URL, screenshots, and category fit.
- Re-check `whop-current-docs.md` before implementing OAuth, checkout, webhooks, memberships, ads, conversions, or affiliates.
- Keep claims factual. For crypto products, use "research", "tracking", "alerts", and "historical data"; avoid "signals that guarantee profit" or similar promises.
- Primary CTA should resolve to Whop checkout or app entry with no dead path.

## SEO

- Identify landing pages that map to high-intent searches.
- Produce page titles, descriptions, H1s, schema suggestions, internal links, and 3-5 article briefs.
- Do not create doorway pages or spun content.

## X/Twitter

- Use short proof-led posts, founder notes, methodology snippets, leaderboard changes, and charts.
- Include one clear CTA and one source link.
- Avoid engagement bait and unsupported market calls.

## Reddit, Discord, Telegram, Communities

- Read and follow each community's rules before drafting.
- Prefer useful research posts and transparent affiliation.
- Do not mass-post the same message or evade moderation.

## Paid Search

- Use exact/high-intent keyword groups, negative keywords, landing-page match, and small test budgets.
- Draft ad variants with factual claims, no investment promises, and clear pricing/refund language.
- Track each ad with UTM parameters.

## Paid Social

- Build variants around audience pain, proof, and product screenshot.
- Use conservative targeting assumptions until analytics prove otherwise.
- Require `SPEND_GATE` before campaign creation or budget changes.
- For Whop-native ads, verify product IDs, target countries, campaign platform (`meta` or `tiktok`), required permissions, and minimum daily budget before drafting the spend gate.

## Outreach

- Segment targets by relevance: creators, newsletter operators, trading community owners, analysts, tool directories, affiliates, and early users.
- Personalize the first sentence using public, non-sensitive context.
- Include sender identity, reason for contact, opt-out path, and no deceptive urgency.
- Require `SEND_GATE` before sending.

## Partnerships and Affiliates

- Prioritize people who already reach the target ICP.
- Offer a concrete collaboration: data snippet, co-branded leaderboard, revenue share, free tier trial, or guest post.
- Record terms and approval before promising compensation.
- For Whop affiliates, verify the company/user identifiers and `affiliate:create` permission before creating records.
