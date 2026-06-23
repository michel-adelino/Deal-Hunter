# Contributing to DealHunter

Thanks for your interest in contributing! This guide covers the most common contribution paths.

---

## Most Needed Contributions

### 1. Card Benefits JSON (`agents/data/card_benefits.json`)

This is the most impactful contribution. Every time a card issuer updates their benefits, this file needs updating.

**Rules for contributions to this file:**
- Every entry must have a `source_url` pointing to the official card issuer page
- Every entry must have a `last_verified` date (ISO format: `YYYY-MM-DD`)
- Do not add benefit amounts you haven't personally confirmed on the issuer's site
- PRs without a source URL will be closed without review

**Template:**
```json
{
  "card_type": "your_card_type",
  "merchant_category": "the_merchant_or_category",
  "benefit_type": "cashback|credit|multiplier",
  "rate": 0.03,
  "amount": null,
  "source_url": "https://www.cardissuer.com/official-benefits-page",
  "last_verified": "2025-01-20",
  "notes": "Brief description of the benefit"
}
```

### 2. Retailer Price Extractors (`backend/scrapers/src/extractors/`)

Each retailer needs a custom HTML extractor. If you shop at a retailer we don't support yet, add an extractor for it.

See `src/extractors/glasses_com.rs` as a reference implementation.

Requirements:
- Must extract: price (f64), currency, product title for validation
- Must handle "out of stock" gracefully (return `None`, not an error)
- Must not break when the retailer adds new page elements (use specific selectors, not positional)
- Include a test with a saved HTML fixture (no live network calls in tests)

### 3. Coupon Source Adapters (`agents/coupon_hunter.py`)

New coupon sources can be added as async functions that return `list[CouponResult]`.
See `fetch_couponfollow()` as a reference. Rules:
- Respect robots.txt
- Don't add sources that prohibit scraping in their ToS
- Return codes with a `source` field and a `success_rate` if available

---

## Development Setup

```bash
git clone https://github.com/yourusername/dealhunter
cd dealhunter

# Quick setup (uses Docker for infrastructure)
docker compose up -d postgres redis

# Backend
cd backend/api && pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Rust (only needed if changing scrapers)
cd backend/scrapers && cargo build
```

---

## Pull Request Guidelines

1. **One thing per PR.** Don't mix a new retailer extractor with a card benefits update.
2. **Tests required for:**
   - New price extractors (HTML fixture + unit test)
   - New agent logic (mock the external calls)
   - New API endpoints (FastAPI TestClient)
3. **No hardcoded deal amounts.** If you're adding a deal to a test fixture, use a value clearly marked as synthetic (`FAKE_TEST_PRICE = 99.99`).
4. **Update `last_verified` dates** when you confirm a card benefit still matches the issuer's current page.

---

## Issue Labels

- `data: card-benefits` — updates to card_benefits.json
- `data: retailer` — new retailer support
- `agent` — changes to agent logic
- `frontend` — React component work
- `scraper` — Rust worker changes
- `data-integrity` — anything affecting confidence levels or source attribution

---

## Data Integrity Is Non-Negotiable

The whole value of DealHunter is that it doesn't lie to users. If you're unsure whether a data source is reliable enough to be tagged `inferred` rather than `user_entered`, err on the side of caution. It's always better to show a lower-confidence deal honestly than to show a confident deal that turns out to be wrong.

If you find a case where DealHunter is displaying a `verified` or `inferred` deal that is actually inaccurate, please open an issue immediately with the label `data-integrity`.
