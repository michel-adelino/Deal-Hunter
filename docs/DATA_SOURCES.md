# Data Sources & Anti-Hallucination Policy

This document is the source of truth for where every piece of data in DealHunter comes from.
Every data point shown to the user maps to exactly one row in this table.
If a data source is removed or changes its API, the affected fields go to `null` rather than showing stale or inferred values.

---

## The Core Problem: Why Card Offers Are Hard

Credit card benefits fall into two categories with very different reliability:

### Category A — Public, stable, scrapeable
These are documented on card issuer websites and change infrequently:
- Base cashback rates (e.g. "Apple Card gives 3% at Apple stores")
- Category multipliers (e.g. "Chase Freedom Flex gives 5× on rotating categories")
- Shopping portal rates (e.g. "Capital One Shopping shows 5% at Target")
- Signup bonuses (publicly advertised)

DealHunter can fetch and cache these with high confidence.

### Category B — Account-specific, not accessible via API
These vary per user and are not exposed by any issuer API without full account access:
- Statement credits tied to specific merchants (e.g. "Your Amex Platinum has a $40 glasses.com offer")
- Targeted cashback offers (these differ per account)
- Limited-time personalized promotions

**DealHunter never fetches or displays Category B data without explicit user input.**
When a user tells us about an offer, we label it `user_entered` and show a disclaimer.

---

## Data Source Registry

### Price Data

| Source | What it provides | API / Method | Refresh rate | Confidence |
|---|---|---|---|---|
| **Keepa API** | Amazon price history (90-day), current price, deal alerts | REST API, paid ($19/mo for 200 tokens/day) | Real-time | `verified` |
| **CamelCamelCamel** | Amazon price history (public, no API key needed) | HTML scrape | 6 hours | `verified` |
| **SerpAPI — Google Shopping** | Cross-retailer current prices | REST API, free tier 100/mo | On demand | `verified` |
| **BestBuy API** | Current price + availability | Official Product API (free, key required) | Real-time | `verified` |
| **Walmart Open API** | Price + availability | Official API | Real-time | `verified` |
| **Target (scrape)** | Price only | HTML scrape via Rust worker | 6 hours | `inferred` |
| **glasses.com (scrape)** | Price only | HTML scrape | On demand | `inferred` |

### Coupon Data

| Source | What it provides | Method | Verified how |
|---|---|---|---|
| **CouponFollow API** | Coupon codes + reported success rates | REST API (free) | Community-verified; DealHunter re-confirms with a test cart call where ToS allows |
| **RetailMeNot** | Coupon codes | HTML scrape | Same |
| **Dealspotr** | Community deal posts | RSS + scrape | Unverified until tested |
| **Honey (GoCart)** | No public API; not used | — | — |

**Coupon validation:** For supported retailers, the Rust coupon worker makes a real add-to-cart + promo-code application request (no purchase, cart is abandoned). A coupon is marked `verified` only if this test succeeds. Retailers that block headless requests get `unverified`.

### Card Cashback & Portal Rates

| Source | What it provides | Method | Notes |
|---|---|---|---|
| **Capital One Shopping portal** | Per-retailer cashback % | HTML scrape of portal page (public, no login) | Changes weekly; scraped Sunday 2am |
| **Rakuten portal** | Per-retailer cashback % | HTML scrape | Same |
| **Chase Travel Portal** | Bonus multipliers for Chase cards | Public marketing pages | Scraped monthly |
| **Amex Offers** | Generic offer page | Public offer page (not account-specific offers) | Category-level only |
| **Card issuer benefit pages** | Base cashback rates, category multipliers | Scraped from card landing pages | Stored in static JSON, updated manually each quarter |
| **NerdWallet / WalletHub** | Card benefit summaries | Not used as primary source; used for validation only | — |

**Static card benefit JSON** lives at `/agents/data/card_benefits.json`. It maps `{ card_type, merchant_category, cashback_rate, source_url, last_verified }`. This file is maintained by contributors and reviewed quarterly. Pull requests to update it require a link to the issuer's official page.

### Insurance / Reimbursement

| Source | What it provides | Method |
|---|---|---|
| **IRS FSA eligible items list** | Static list of FSA/HSA eligible product categories | Public IRS publication, stored locally |
| **User's insurance info** | Coverage amounts, vision/dental benefit limits | Always user-entered; we flag eligible items, user confirms coverage |

We never claim a specific reimbursement amount. We only flag "this product category is typically FSA-eligible" or "this retailer is an approved vision care provider."

---

## Confidence Badge Rules

The frontend renders a confidence badge on every deal row. This is enforced at the API level — the backend sets `confidence` and the frontend cannot override it.

```python
class DealConfidence(str, Enum):
    VERIFIED = "verified"       # confirmed by live request < 24h ago
    INFERRED = "inferred"       # from public rate tables, not live-tested
    USER_ENTERED = "user_entered"  # user told us; we cannot confirm
    EXPIRED = "expired"         # was verified but not re-confirmed in 48h
```

Rules:
- A deal starts as `inferred` when first found from a rate table
- It becomes `verified` only after the Rust worker confirms it with a live request
- It becomes `expired` if 48h pass without re-verification
- User-entered deals are always `user_entered`, forever, unless the user connects Plaid

---

## What We Will Never Do

- **Never invent a specific dollar amount** for a card benefit that wasn't fetched from a live source or entered by the user
- **Never say a coupon code is valid** without either a live test or a community-verified source with a success rate > 70%
- **Never show a "verified" badge** on a deal older than 24 hours without re-verification
- **Never claim insurance coverage** — we only flag eligibility categories
- **Never access card account data** without explicit Plaid OAuth consent

---

## Plaid Integration (Optional)

If a user opts in to Plaid, we gain read-only access to:
- Transaction history (to detect past cashback credits received)
- Account-linked offers (where issuer exposes them via Plaid Enrich)

This is gated behind a clear consent screen, uses Plaid Link (no credentials ever touch our server), and can be revoked at any time. Data from Plaid is tagged `verified` and attributed to `source: plaid`.

Plaid integration is in `/backend/api/routers/plaid.py` and is fully optional — the app works without it.

---

## Contribution Policy for Data

If you are contributing to `card_benefits.json` or adding a new scrape target:
1. Every entry must include `source_url` pointing to the official issuer or retailer page
2. Every entry must include `last_verified` (ISO date)
3. PRs that add benefits without a source URL will be rejected
4. Benefits that cannot be independently verified by a reviewer will be rejected

This is how we keep the data honest at the community level.
