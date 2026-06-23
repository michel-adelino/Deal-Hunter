# 🛍️ DealHunter — Open Source Holiday Shopping Agent

DealHunter is a multi-agent framework that finds the best price for any product by stacking credit card cashback, shopping portal rates, coupon codes, and price-drop timing — in the correct order to maximize savings without disqualifying any individual deal.

> **Honest by design:** DealHunter only uses verifiable, public data sources. It never halluccinates card benefits. Account-specific offers (like Amex statement credits) are user-entered and clearly labelled as unverified until confirmed.

---

## ✨ Features

- 🔍 **Multi-source price tracking** — Amazon (Keepa/CamelCamelCamel), BestBuy, Target, Walmart, B&H, Newegg
- 💳 **Card stack optimizer** — Matches your card portfolio against public cashback rates and portal multipliers
- 🎟️ **Coupon hunter** — Scrapes CouponFollow, RetailMeNot, and Honey-compatible code databases
- 🛒 **Shopping portal ranker** — Compares Capital One Shopping, Chase Travel, Amex Offers portal, Rakuten
- 📉 **Price history & drop prediction** — Keepa API for Amazon, custom scraping for others
- 🧮 **Deal stacker** — Calculates optimal application order to avoid stacking conflicts
- 🔔 **Alert system** — Notifies when price crosses your target or a card credit is about to expire
- 🏥 **Insurance eligibility checker** — Flags FSA/HSA eligible items and vision/dental reimbursable products

---

## 🏗️ Architecture

```
dealhunter/
├── frontend/          # React + TypeScript + Vite
├── backend/
│   ├── api/           # Python FastAPI — orchestration layer
│   └── scrapers/      # Rust — high-performance scraping workers
├── agents/            # Python agent definitions (LangGraph)
├── shared/            # Shared types (JSON Schema / Pydantic / serde)
├── infra/             # Docker Compose, deployment configs
└── docs/              # Full documentation suite
    ├── ARCHITECTURE.md
    ├── DATA_SOURCES.md
    ├── AGENTS.md
    ├── API_REFERENCE.md
    ├── FRONTEND.md
    └── CONTRIBUTING.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **Python 3.9+**
- **PostgreSQL 15+** (or use Docker)
- **Redis 7+** (or use Docker)
- **Rust 1.75+** (optional, for scraper workers)

### Setup in 5 Minutes

**1. Start PostgreSQL & Redis**
```bash
# Using Docker (easiest)
docker compose up -d postgres redis

# Or manually install locally:
# - PostgreSQL: brew install postgresql@15
# - Redis: brew install redis
createdb dealhunter
redis-server
```

**2. Backend Setup** (Terminal 1)
```bash
cd backend/api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn main:app --reload --port 8000
```

**3. Celery Worker** (Terminal 2)
```bash
cd backend/api
source .venv/bin/activate
celery -A tasks.hunt_task worker --loglevel=info
```

**4. Frontend** (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```

**5. Open in browser**
```
http://localhost:5173
```

### You're done! 🎉
- No login required
- Start by adding credit cards
- Search for any product
- See prices and deals in real-time

---

## ✨ What's Working (Demo)

✅ **Product Search** — Search for any product with beautiful images  
✅ **Price Comparison** — Compare prices from multiple retailers  
✅ **Credit Cards** — Add/manage your portfolio with brand logos  
✅ **Deal Stacking** — Combines cards, coupons, portals into best deal  
✅ **Real-time Streaming** — Watch results load in real-time via SSE  
✅ **Dashboard** — Home page with stats, recent hunts, quick start  
✅ **Search History** — Saved locally in your browser  

🚧 **Coming Soon**  
- Real price data from Keepa/SerpAPI
- Coupon scraping & verification
- Price history charts
- Email alerts
- Wishlist/saved deals

---

## 🔑 Optional API Keys

Add these to `.env` to enable real data fetching (currently uses mock data in demo mode):

| Service | Purpose | Free Tier | Link |
|---|---|---|---|
| **Anthropic** | Product name disambiguation | Pay per use | anthropic.com |
| Keepa | Amazon price history | 100 req/day | keepa.com/api |
| SerpAPI | Google Shopping results | 100/month | serpapi.com |
| ScraperAPI | Proxy rotation for retail sites | 1000/month | scraperapi.com |
| Plaid | User card offer sync | Sandbox free | plaid.com |

**Note:** The app works without these keys and uses mock data for demo. Add them as you integrate real data sources.

---

## ⚠️ Data Integrity Policy

See [DATA_SOURCES.md](docs/DATA_SOURCES.md) for the full policy. In short:

- Every displayed saving has a `source` field, a `verified_at` timestamp, and a `confidence` level (`verified` | `inferred` | `user_entered`)
- No deal is shown as `verified` unless it was confirmed by a live HTTP request within the last 24 hours
- Card-specific statement credits are always `user_entered` and shown with a disclaimer

---

## 📄 License

MIT — see [LICENSE](LICENSE)
