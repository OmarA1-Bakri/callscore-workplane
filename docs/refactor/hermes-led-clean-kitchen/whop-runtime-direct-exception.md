# Whop Runtime Direct Exception

Whop runtime auth, webhook, and entitlement verification may remain direct in product code when required by the live product.

This exception does not authorize provider dashboard/configuration automation, pricing mutation, payment mutation, plan mutation, or commercial changes.

Whop provider automation should route through Composio unless explicitly approved. Pricing/payment/plan mutation requires WHOP_PAYMENT_GATE approval.
