# Architecture — DealHunter

## Overview

DealHunter is built as a pipeline of specialized agents, each owning one domain of deal-finding, coordinated by an orchestration layer and surfaced through a React dashboard.

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│         (Vite + TypeScript + TanStack Query + Zustand)      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                  FastAPI Gateway (Python)                    │
│         Auth · Rate limiting · Job dispatch · SSE           │
└──────┬─────────────┬──────────────┬──────────────┬──────────┘
       │             │              │              │
  ┌────▼────┐  ┌─────▼────┐  ┌────▼────┐  ┌─────▼────┐
  │  Agent  │  │  Agent   │  │  Agent  │  │  Agent   │
  │Orchestr.│  │  Price   │  │  Card   │  │  Coupon  │
  │(LangGr.)│  │ Tracker  │  │ Matcher │  │  Hunter  │
  └────┬────┘  └─────┬────┘  └────┬────┘  └─────┬────┘
       │             │              │              │
       └─────────────▼──────────────▼──────────────┘
                     │ Redis task queue (Celery)
       ┌─────────────▼──────────────────────────────┐
       │          Rust Scraper Workers               │
       │   (tokio async · reqwest · scraper crate)   │
       └─────────────┬──────────────────────────────┘
                     │
       ┌─────────────▼──────────────────────────────┐
       │           External Data Sources             │
       │  Keepa · SerpAPI · CouponFollow · Retailer  │
       │  sites · Capital One Shopping portal        │
       └────────────────────────────────────────────┘
                     │
       ┌─────────────▼──────────────────────────────┐
       │         PostgreSQL + Redis                  │
       │   Products · Deals · PriceHistory · Users   │
       └────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. React Frontend (`/frontend`)

**Stack:** React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS

Responsibilities:
- Product search and wishlist management
- Real-time deal stream display (via Server-Sent Events)
- Card portfolio input and management
- Deal stack visualization (which discount layers in which order)
- Alert management

Key pages:
- `/hunt` — Main deal hunt dashboard
- `/cards` — Card portfolio editor
- `/alerts` — Price drop and expiry alerts
- `/product/:id` — Deep deal breakdown for one product

State management:
- **Zustand**: User profile, card portfolio, product wishlist (persisted to localStorage)
- **TanStack Query**: All server data — products, deals, alerts (server-authoritative, stale-while-revalidate)

---

### 2. FastAPI Gateway (`/backend/api`)

**Stack:** Python 3.11, FastAPI, Pydantic v2, Celery, SQLAlchemy 2.0

Responsibilities:
- REST API for frontend
- WebSocket + SSE for streaming deal results as they arrive
- Job dispatch to Celery task queue
- User auth (JWT, no OAuth needed for MVP — users are local)
- Rate limiting (slowapi)

Key routers:
```
POST /api/v1/hunt         → start a deal hunt job, returns job_id
GET  /api/v1/hunt/{id}    → SSE stream of deal results as they land
GET  /api/v1/deals/{id}   → full deal object for one product
GET  /api/v1/prices/{id}  → price history for a product
POST /api/v1/cards        → save user card portfolio
GET  /api/v1/alerts       → list active alerts
POST /api/v1/alerts       → create price alert
```

---

### 3. Agent Layer (`/agents`)

**Stack:** Python, LangGraph (for agent state machines), Anthropic SDK

Six agents, each a LangGraph node:

#### Agent 1: Hunt Orchestrator
- Receives: product name + user card portfolio
- Dispatches: all sub-agents in parallel
- Merges: results, resolves conflicts, computes `final_net_price`
- Uses LLM reasoning only for: product name disambiguation, conflict resolution in stacking rules

#### Agent 2: Price Tracker
- Sources: Keepa API (Amazon), SerpAPI (Google Shopping), direct retail scraper
- Output: `{ retailer, current_price, price_30d_ago, price_90d_ago, predicted_drop_date, drop_confidence }`
- Price drop prediction: simple rule-based (post-holiday = high confidence), not LLM

#### Agent 3: Card Credit Matcher
- Input: user's card list + merchant URL
- Data: static JSON file of **publicly documented** card cashback rates (see DATA_SOURCES.md)
- User-entered offers: tagged as `user_entered`, shown with disclaimer
- Output: list of `{ card, benefit_type, amount, confidence, source_url }`

#### Agent 4: Coupon Hunter
- Sources: CouponFollow API, RetailMeNot scrape, Dealspotr, manual code testing
- Coupon validation: Rust worker actually POSTs a test cart to retailer (where permitted by ToS)
- Output: `{ code, discount, verified, verified_at, stacks_with_portal }`

#### Agent 5: Portal Optimizer
- Compares: Capital One Shopping, Chase Travel Portal, Amex Offers, Rakuten
- Data: weekly-scraped portal rate tables (public, no auth needed)
- Output: `{ portal, cashback_rate, notes }` ranked by payout

#### Agent 6: Deal Stacker
- Input: outputs of all above agents
- Logic: applies stacking rules (no pure rule engine — hand-coded priority logic)
- Key rules:
  - Portal cashback and credit card cashback usually stack
  - Coupon codes may void portal cashback at some retailers (flagged)
  - Statement credits apply after purchase regardless of purchase path
- Output: ordered sequence of actions + `net_price` after all layers

---

### 4. Rust Scraper Workers (`/backend/scrapers`)

**Stack:** Rust, tokio, reqwest, scraper (HTML parsing), serde_json

Why Rust:
- High concurrency (thousands of price checks without thread overhead)
- Proxy rotation with low latency
- Memory safety for long-running workers

Workers:
- `price_worker` — polls retail product pages, extracts structured price data
- `coupon_worker` — fetches and dedupes coupon code lists
- `portal_worker` — scrapes shopping portal cashback rate tables weekly

Workers publish results to Redis streams; Python agents consume them.

---

### 5. Data Layer

**PostgreSQL tables:**

```sql
users (id, email, created_at)
user_cards (id, user_id, card_type, card_network, user_label, notes)
user_card_offers (id, user_card_id, merchant, benefit_description, amount, expires_at, confidence)
products (id, name, canonical_url, category, asin, created_at)
price_snapshots (id, product_id, retailer, price, currency, captured_at)
deals (id, product_id, hunt_id, deal_type, amount, source, source_url, confidence, verified_at)
hunts (id, user_id, status, started_at, completed_at)
alerts (id, user_id, product_id, alert_type, threshold, triggered_at, is_active)
```

**Redis usage:**
- Celery task queue
- SSE message pub/sub (hunt results streamed to frontend)
- Price cache (TTL 1 hour)
- Rate limit counters

---

## Data Flow: A Full Hunt

```
User adds "Ray-Ban Meta Gen 2" → clicks "Run hunt"
         │
         ▼
POST /api/v1/hunt { product: "Ray-Ban Meta Gen 2", cards: [...] }
         │
         ▼
FastAPI creates Hunt record, dispatches Celery task → returns { hunt_id }
         │
         ▼
Frontend opens SSE stream: GET /api/v1/hunt/{hunt_id}
         │
         ▼
Orchestrator agent runs (parallel):
  ├── Price Tracker → finds $327 on glasses.com, $319 on Amazon
  ├── Card Matcher  → Capital One: $150 cashback (portal, public rate)
  │                   Amex: user says $40 credit (user_entered)
  ├── Coupon Hunter → finds "SAVE15" (verified), "GLASSES10" (unverified)
  └── Portal Optimizer → CapOne Shopping 46% portal > Rakuten 10%
         │
         ▼ (each result streams via SSE as it lands)
Deal Stacker combines:
  Step 1: Buy via Capital One Shopping portal → $150 cashback (verified)
  Step 2: Apply "SAVE15" coupon → -$15 (verified)
  Step 3: Apply Amex $40 credit (user_entered — check your app)
  Net estimate: $327 - $150 - $15 - $40 = $122
         │
         ▼
Frontend renders stacked deal card, confidence badges per layer
```

---

## Confidence Levels

Every deal or saving displayed has a `confidence` field:

| Level | Meaning | UI Treatment |
|---|---|---|
| `verified` | Confirmed by live HTTP request in past 24h | Green badge |
| `inferred` | Based on public rate tables (may vary) | Blue badge |
| `user_entered` | User told us about this — we can't confirm | Amber badge + disclaimer |
| `expired` | Was verified but not re-confirmed in 48h | Gray strikethrough |

This is the core anti-hallucination contract of the system.

---

## Security Considerations

- No card numbers, CVVs, or account credentials ever stored or transmitted
- Plaid integration (optional) uses tokenized read-only access; tokens stored encrypted
- All scraping respects `robots.txt`; retailers whose ToS prohibit scraping are skipped
- Rate limiting on all API endpoints
- User data is local-first by default; no telemetry without opt-in
