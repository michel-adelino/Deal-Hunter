# DealHunter — Implementation Roadmap

This document tracks the phased implementation of DealHunter from a mock MVP into a production-ready deal-stacking product.

**Last Updated:** 2026-06-22  
**Current Phase:** Milestone 1 — Real Prices  
**Target Completion:** Week 1

---

## Overview

DealHunter is being redesigned to compete with BrickSeek by:
1. Fetching **real-time prices** from Amazon, Walmart, Target, Best Buy
2. Tracking **local store inventory** with location-based pricing
3. Setting **price drop alerts** with email notifications
4. Stacking **credit card cashback + coupons + portal rates** for maximum savings

---

## Architecture Layers

### Layer 1: Data Sources & Ingestion
**Priority 1 — Official APIs (implement first)**
- Best Buy Developer API (free) — Price, inventory by store
- Walmart Open API (free) — Price, inventory by store
- Keepa API (100 req/day free) — Amazon price history
- Target API (public endpoints) — Price, store inventory
- SerpAPI (100/month free) — Cross-retailer price sweep

**Priority 2 — HTML Scraping (Rust workers)**
- Walmart fallback scraper
- Target store pages scraper
- BestBuy completeness scraper
- Newegg, B&H scrapers

**Key Design: UPC as the Spine**
Every product resolves to a UPC first:
```
User query ("airtags")
  ↓ LLM disambiguation (Claude)
  ↓ UPC lookup (BestBuy search API)
  ↓ Save to DB with UPC as unique key
  ↓ All price/inventory lookups use UPC
```

### Layer 2: Database Schema
**Existing tables** (used more fully):
- `users` — dev stub for now
- `user_cards` — manual card benefits
- `hunts` — hunt history
- `products` — enhanced with UPC

**New tables**:
- `stores` — Retailer locations (Walmart, Best Buy stores, etc.)
- `coupons` — Cache of verified coupon codes
- `portal_rates` — Cached cashback rates from Rakuten, Capital One, etc.

### Layer 3: Agent Pipeline
Sequential execution:
1. **Product Resolver** (NEW) — Disambiguate query, lookup UPC, save to DB
2. **Price Tracker** — Fetch real prices from BestBuy, Walmart, Keepa, SerpAPI
3. **Card Matcher** — Expand card_benefits.json, match user cards
4. **Coupon Hunter** — Fetch verified coupons
5. **Portal Optimizer** — Lookup cached portal rates
6. **Deal Stacker** — Combine all sources, optimize stacking order

### Layer 4: Alert System
- Celery Beat checks prices every 15 minutes
- Triggers email via SendGrid when threshold crossed
- Routes: `POST /api/v1/alerts`, `GET /api/v1/alerts`, etc.

### Layer 5: Rust Scrapers
- Price worker (30-min schedule, Redis queue)
- Coupon worker (daily, RetailMeNot/Coupons.com)
- Portal worker (weekly, Rakuten/Capital One rates)

### Layer 6: Frontend
**Hunt Page** — Add zip code input, online/in-store tabs  
**Product Page** (NEW) — Deep deal view, price history, set alert  
**Alerts Page** — List active alerts, email opt-in  
**Store Locator** (NEW) — Nearby inventory widget

---

## Implementation Milestones

### ✅ Milestone 0 — Architecture & Setup (Complete)
- [x] Full architecture designed
- [x] Database schema finalized
- [x] Agent pipeline sequenced
- [x] Plan written to docs

### 🔄 Milestone 1 — Real Prices (IN PROGRESS)
**Duration:** Week 1  
**Goal:** Fetch and display actual prices from BestBuy & Walmart APIs

**Tasks:**
- [ ] Set up API keys in `.env` for BestBuy and Walmart
- [ ] Create `backend/api/lib/bestbuy.py` — BestBuy API client
- [ ] Create `backend/api/lib/walmart.py` — Walmart API client
- [ ] Update `backend/api/agents/price_tracker.py` to use real APIs
- [ ] Update `backend/api/models/db.py` — ensure `price_snapshots` table has correct schema
- [ ] Create Alembic migration for price_snapshots enhancements
- [ ] Test: Search for product, verify real prices saved to DB
- [ ] Frontend: Update `PriceChart.tsx` to use DB data instead of synthetic
- [ ] Commit: "feat: Real prices from BestBuy and Walmart APIs"

**Verification:**
```bash
# 1. Start backend
uvicorn main:app --reload --port 8000

# 2. Start Celery worker
celery -A tasks.hunt_task worker --loglevel=info

# 3. Search for "Apple AirPods Pro"
# Expected: Real prices from BestBuy, Walmart shown
# DB check: price_snapshots table populated with captured_at times
# Frontend: Chart shows real price points, not synthetic
```

**Files to Modify:**
- `backend/api/lib/bestbuy.py` (NEW)
- `backend/api/lib/walmart.py` (NEW)
- `backend/api/agents/price_tracker.py`
- `backend/api/models/db.py`
- `backend/api/config.py` (add BESTBUY_API_KEY, WALMART_API_KEY)
- `backend/api/alembic/versions/` (NEW migration)
- `frontend/src/components/PriceChart.tsx`
- `.env.example` (document new keys)

---

### 📋 Milestone 2 — Product Resolution
**Duration:** Week 1 (parallel with M1 end)  
**Goal:** Resolve ambiguous product names to UPC/ASIN

**Tasks:**
- [ ] Create `backend/api/agents/product_resolver.py`
- [ ] Integrate BestBuy search API for UPC lookup
- [ ] Update `agents/state.py` — add `upc`, `product_id`, `asin` fields
- [ ] Wire product resolver into hunt pipeline
- [ ] Ensure product record saved to DB
- [ ] Update frontend to show canonical product info

**Verification:**
- Search "ray ban sunglasses" → resolves to specific Ray-Ban model with UPC
- Check `products` table for the entry

---

### 📋 Milestone 3 — Local Inventory
**Duration:** Week 2  
**Goal:** Check in-store availability by zip code

**Tasks:**
- [ ] Create `backend/api/agents/local_inventory.py`
- [ ] Integrate BestBuy store inventory API
- [ ] Integrate Walmart store locator API
- [ ] Create `stores` table migration
- [ ] Create `backend/api/routers/stores.py` — `/api/v1/stores/nearby` endpoint
- [ ] Frontend: Add zip input to Hunt page
- [ ] Frontend: Create `StoreInventory.tsx` component
- [ ] Frontend: Add "Online" vs "In-store" tabs in results

**Verification:**
- Hunt with zip code "94102" → shows nearby Best Buy/Walmart locations with price/stock

---

### 📋 Milestone 4 — Alerts
**Duration:** Week 2  
**Goal:** Price drop notifications via email

**Tasks:**
- [ ] Create `backend/api/tasks/alert_task.py` — Celery Beat task
- [ ] Add SendGrid integration to `backend/api/lib/email.py`
- [ ] Fix alerts schema — use `product_id` FK instead of product name string
- [ ] Create Alembic migration
- [ ] Build out `AlertsPage.tsx` with threshold setting UI
- [ ] Test: Set alert for "$50 or less", trigger email when threshold crossed

**Verification:**
- Create alert for "$50 AirPods", price triggers email notification

---

### 📋 Milestone 5 — Coupons & Portals
**Duration:** Week 3  
**Goal:** Real coupon codes and portal cashback rates

**Tasks:**
- [ ] Update `backend/api/agents/coupon_hunter.py` with real sources
- [ ] Create `coupons` table migration
- [ ] Create `portal_rates` table migration
- [ ] Update `backend/api/agents/portal_optimizer.py` to use DB cache
- [ ] Rust coupon worker (RetailMeNot scraper)
- [ ] Rust portal worker (Rakuten scraper)
- [ ] Test: Verify real coupons appear in deal stack

**Verification:**
- Hunt result shows real coupon codes (e.g., "SAVE10" for 10% off)
- Portal rates show real Rakuten cashback multipliers

---

### 📋 Milestone 6 — Rust Price Scrapers
**Duration:** Week 3–4  
**Goal:** HTML fallback scrapers for price/inventory

**Tasks:**
- [ ] Implement `backend/scrapers/src/workers/price_worker.rs`
- [ ] Implement `backend/scrapers/src/extractors/walmart.rs`
- [ ] Implement `backend/scrapers/src/extractors/target.rs`
- [ ] Redis stream integration with Python agents
- [ ] Test: Verify scrapers handle JavaScript-heavy pages

**Verification:**
- Products with no API coverage still get prices via scraper

---

## Database Schema Changes

### Products Table (Enhanced)
```sql
ALTER TABLE products ADD COLUMN upc TEXT UNIQUE;
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN image_url TEXT;
```

### Price Snapshots (Enhanced)
```sql
ALTER TABLE price_snapshots ADD COLUMN store_id TEXT;
ALTER TABLE price_snapshots ADD COLUMN original_price FLOAT;
ALTER TABLE price_snapshots ADD COLUMN in_stock BOOLEAN;
ALTER TABLE price_snapshots ADD COLUMN url TEXT;
CREATE INDEX idx_price_snapshots_captured ON price_snapshots(captured_at);
```

### New Tables
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  retailer TEXT,
  store_number TEXT,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat FLOAT,
  lon FLOAT
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  retailer TEXT,
  code TEXT,
  discount_type TEXT,
  discount_value FLOAT,
  verified BOOLEAN,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  source TEXT
);

CREATE TABLE portal_rates (
  id UUID PRIMARY KEY,
  portal_name TEXT,
  retailer TEXT,
  cashback_rate FLOAT,
  scraped_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### Alerts Table (Modified)
```sql
ALTER TABLE alerts ADD COLUMN product_id UUID REFERENCES products(id);
ALTER TABLE alerts ADD COLUMN notify_email TEXT;
ALTER TABLE alerts ADD COLUMN last_checked_at TIMESTAMP;
-- Keep product_name for backward compat
```

---

## API Endpoints (Roadmap)

### Hunt (Existing, enhanced)
```
POST   /api/v1/hunt              # Start hunt (add zip parameter)
GET    /api/v1/hunt/{id}         # Get results
GET    /api/v1/hunt/{id}/stream  # SSE stream
```

### Products (New)
```
GET    /api/v1/products/{id}                    # Get canonical product
GET    /api/v1/products/{id}/prices/history    # 90-day price chart
GET    /api/v1/products/search?q=airtags       # Search by name
```

### Stores (New)
```
GET    /api/v1/stores/nearby?zip=94102&product_id=xxx  # Nearby inventory
GET    /api/v1/stores/{store_id}                        # Store details
```

### Alerts (Existing, enhanced)
```
GET    /api/v1/alerts                          # List alerts
POST   /api/v1/alerts                          # Create alert
PUT    /api/v1/alerts/{id}                     # Update alert
DELETE /api/v1/alerts/{id}                     # Delete alert
POST   /api/v1/alerts/{id}/toggle              # Toggle active
```

---

## Environment Variables

Add to `.env`:
```
# BestBuy API
BESTBUY_API_KEY=your_key_here

# Walmart API
WALMART_API_KEY=your_key_here

# Keepa API (Amazon price history)
KEEPA_API_KEY=your_key_here

# SerpAPI (Google Shopping)
SERPAPI_KEY=your_key_here

# SendGrid (Email alerts)
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=noreply@dealhunter.local

# Scraper API (Proxy rotation)
SCRAPERAPI_KEY=your_key_here
```

---

## Testing Checklist

### Milestone 1 Verification
- [ ] BestBuy API returns real prices
- [ ] Walmart API returns real prices
- [ ] Price snapshots saved to DB with `captured_at`
- [ ] Price history chart shows real data (not synthetic)
- [ ] No errors in Celery worker logs

### Milestone 2 Verification
- [ ] Product query resolves to specific UPC
- [ ] `products` table has UPC entry
- [ ] Canonical product image displays

### Milestone 3 Verification
- [ ] Nearby stores endpoint returns locations
- [ ] In-store prices shown in results
- [ ] Distance calculated correctly

### Milestone 4 Verification
- [ ] Alert created successfully
- [ ] Email sends when threshold triggered
- [ ] Alert marked as `triggered_at`

### Milestone 5 Verification
- [ ] Real coupon codes appear
- [ ] Portal cashback rates displayed
- [ ] Stacking order optimized correctly

### Milestone 6 Verification
- [ ] Rust scrapers compile without errors
- [ ] HTML extractors return prices
- [ ] Redis stream integration works

---

## Known Constraints & Decisions

1. **UPC as the spine** — All cross-retailer matching uses UPC, not product name
2. **Synchronous agent pipeline** — Sequential execution, no parallel branches (simpler for MVP)
3. **Local timezone** — Store prices shown in user's timezone
4. **Cache TTL** — Prices cached for 1 hour, portal rates for 24 hours
5. **Dev auth** — No login required for MVP (fixed dev user)
6. **Single-server** — All components on one machine, no horizontal scaling yet

---

## Rollback Plan

If a milestone fails:
1. **Database**: Alembic downgrade to previous migration
2. **Backend**: Revert agent to previous version
3. **Frontend**: Use feature flags (React conditional rendering)
4. **Commit**: Create detailed GitHub issue with failure logs

---

## Success Criteria

**Milestone 1 Success:**
- Real prices displayed on Hunt page
- `price_snapshots` table has >10 rows with real data
- Price history chart renders without synthetic data
- Zero console errors in browser/backend

**Overall MVP Success:**
- Search for any product → get real prices + local inventory + best deal
- Set alert → email notification when threshold crossed
- Stacking works → show card cashback + coupon + portal in correct order
- No auth friction → just click and use

---

## Next Steps

1. ✅ Write this roadmap
2. 🔄 Start Milestone 1: Real Prices (TODAY)
3. Get API keys for BestBuy, Walmart, Keepa
4. Implement API client libraries
5. Update price_tracker agent
6. Test end-to-end
7. Commit to main

---

*Document maintained by: Claude Code*  
*GitHub: https://github.com/AKhileshPothuri/Deal-Hunter*
