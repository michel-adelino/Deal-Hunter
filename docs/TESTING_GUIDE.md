# DealHunter Testing Guide

## Complete Build Status

✅ **Milestone 1** — Real Prices (BestBuy, Walmart APIs)  
✅ **Milestone 2** — Product Resolution (UPC lookup via BestBuy)  
✅ **Milestone 3** — Local Inventory (Store availability by zip)  
✅ **Keepa Integration** — Amazon price history with 30/90-day lows  

**Ready to test end-to-end!**

---

## Setup Before Testing

### 1. Get API Keys

**BestBuy Developer API:**
- Go to: https://developer.bestbuy.com/
- Sign up for an account
- Create an app to get your API key
- Add to `.env`: `BESTBUY_API_KEY=your_key_here`

**Walmart API (optional for now):**
- Go to: https://developer.walmart.com/
- Sign up and get API credentials
- Add to `.env`: `WALMART_API_KEY=your_key_here`

**Keepa API (Amazon price history):**
- Go to: https://keepa.com/#!api
- Free tier: 100 requests/day
- Get your API key
- Add to `.env`: `KEEPA_API_KEY=your_key_here`

**SendGrid (for alerts milestone):**
- Go to: https://sendgrid.com/
- Free tier: 100 emails/day
- Add to `.env`: `SENDGRID_API_KEY=your_key_here`

### 2. Run Database Migrations

```bash
cd backend/api
source .venv/bin/activate
alembic upgrade head
```

This creates:
- `products` table enhancements (UPC, brand, image_url)
- `price_snapshots` enhancements (store_id, original_price, in_stock, url)
- `stores` table (for local inventory)
- `coupons` table (for coupon cache)
- `portal_rates` table (for cashback cache)
- `alerts` table enhancements (product_id FK, email)

### 3. Start Services

**Terminal 1 — Backend:**
```bash
cd backend/api
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Celery Worker:**
```bash
cd backend/api
source .venv/bin/activate
celery -A tasks.hunt_task worker --loglevel=info
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm run dev
```

Open: http://localhost:5173

---

## Test Scenarios

### Test 1: Basic Product Search (All Milestones)

**What to test:**
1. Go to Hunt page
2. Search for a product: `"Apple AirPods Pro"` or `"Sony WH-1000XM5"`
3. Click "Add"
4. Click "🚀 Find Best Deal"

**Expected results:**
- ✅ Sonar animation plays (agent pipeline running)
- ✅ **Product Resolver:** Canonical product name appears (exact model)
- ✅ **Real Prices:** Shows actual prices from BestBuy, Walmart, Amazon (Keepa)
- ✅ **Price History:** 30-day low and 90-day low prices displayed
- ✅ **Images:** Product image loads from Unsplash
- ✅ **Confidence:** "Verified" badges on prices

**What's happening behind the scenes:**
```
Hunt starts
  ↓
Product Resolver Agent
  - Searches BestBuy API for product
  - Extracts UPC and metadata
  - Saves canonical product to DB
  ↓
Price Tracker Agent
  - Fetches BestBuy price
  - Fetches Walmart price
  - Fetches Keepa (Amazon) with history
  - Returns 3 retailers
  ↓
Card Matcher + Coupon Hunter + Portal Optimizer
  - (Will be mocked until Milestone 5)
  ↓
Deal Stacker
  - Combines all sources
  - Shows best deal
```

**Database check:**
```bash
# Check product was saved with UPC
psql dealhunter -c "SELECT id, name, upc, brand FROM products ORDER BY created_at DESC LIMIT 1;"

# Check prices were saved
psql dealhunter -c "SELECT retailer, current_price, price_30d_low, captured_at FROM price_snapshots ORDER BY captured_at DESC LIMIT 5;"
```

---

### Test 2: Local Inventory Search (Milestone 3)

**What to test:**
1. Go to Hunt page
2. Search for product (e.g., "MacBook Pro")
3. Add your zip code: `94102` (San Francisco) or your own
4. Click "Find Best Deal"

**Expected results:**
- ✅ Product prices shown
- ✅ **Nearby Stores** section appears (if stores found near your zip)
- ✅ Shows: Store name, address, distance, in-stock status
- ✅ Local prices may differ from online

**What's happening:**
```
Local Inventory Agent
  - Takes product UPC + your zip code
  - Queries BestBuy store inventory API
  - Fetches nearby Walmart locations (placeholder)
  - Returns list of stores within 25 miles
  ↓
Frontend displays:
  - "In Stock" status per store
  - Distance from your location
  - Store address
```

**Database check:**
```bash
# Check stores were populated
psql dealhunter -c "SELECT retailer, name, city, zip, distance_miles FROM stores LIMIT 5;"
```

---

### Test 3: Product with Cards (Bonus)

**What to test:**
1. Go to Cards page
2. Add a credit card (e.g., "Amex Platinum" or "Chase Sapphire Preferred")
3. Optionally add a manual offer (e.g., "5% cash back on electronics")
4. Go back to Hunt page
5. Search for that category product again

**Expected results:**
- ✅ Card shows in portfolio with beautiful gradient
- ✅ Manual offers count displayed on card
- ✅ Hunt results include card benefits in stacking breakdown
- ✅ Shows `$X savings from card cashback`

---

### Test 4: Price Tracking (Amazon - Keepa)

**What to test:**
1. Search for an Amazon-specific product: `"Kindle Paperwhite"`
2. Run hunt

**Expected results:**
- ✅ **Amazon price** appears with real Keepa data
- ✅ **30-day low** and **90-day low** prices shown
- ✅ Price history is REAL data from Keepa, not synthetic

**What Keepa provides:**
- Current Amazon price
- 30-day minimum price
- 90-day minimum price
- Full price history (if enough data available)

**Note:** Keepa free tier: 100 requests/day. Be mindful during testing.

---

### Test 5: Frontend Card Portfolio

**What to test:**
1. Go to Cards page
2. Add cards: Amex Platinum, Chase Sapphire, Apple Card, etc.
3. Verify card previews show correct:
   - Brand logo (💳 emoji)
   - Card gradient background
   - Card type label
   - Offer count

**Expected results:**
- ✅ Beautiful card designs with brand-specific gradients
- ✅ Glossy overlay effect
- ✅ Hover animation (scale + shadow)
- ✅ Delete button on hover
- ✅ "Active Offers" counter

---

## Debugging Checklist

If something doesn't work:

### Backend not responding
```bash
# Check backend running
curl http://localhost:8000/health
# Should return: {"status":"ok"}

# Check logs in Terminal 1
# Look for any 500 errors or import errors
```

### Celery not processing
```bash
# Check worker running (Terminal 2)
# Should show: "celery@... ready to accept tasks"

# If frozen, restart:
pkill -f celery
# Then restart Terminal 2
```

### Database migration failed
```bash
# Check migration status
alembic current

# If stuck, downgrade and retry
alembic downgrade -1
alembic upgrade head
```

### API keys not working
```bash
# Verify .env file exists with all keys
cat backend/api/.env

# Test BestBuy API manually
curl "https://api.bestbuy.com/v1/products?search=apple&format=json&apiKey=YOUR_KEY&pageSize=1"
```

### Prices not showing
```bash
# Check worker logs for fetch errors
# Look for "BestBuy fetch error" or "Keepa fetch error"

# Test API key separately:
python3
>>> from lib.bestbuy import BestBuyClient
>>> import asyncio
>>> client = BestBuyClient("YOUR_KEY")
>>> result = asyncio.run(client.search_product("Apple AirPods"))
>>> print(result)
```

### Local inventory empty
```bash
# Check if stores were synced to DB
psql dealhunter -c "SELECT COUNT(*) FROM stores;"

# If zero, need to populate stores table (future enhancement)
# For now, BestBuy API fetches live
```

---

## Test Coverage Map

| Feature | Status | Test Command |
|---------|--------|--------------|
| Product Search | ✅ Ready | Hunt page → Add product → Search |
| Real Prices (BestBuy) | ✅ Ready | Hunt with product name |
| Real Prices (Amazon/Keepa) | ✅ Ready | Hunt with Amazon product |
| Local Inventory | ✅ Ready | Hunt with zip code |
| Price History (30/90 days) | ✅ Ready | See Keepa prices on results |
| Card Portfolio UI | ✅ Ready | Cards page → Add card |
| Product Resolution | ✅ Ready | Check DB: `products` table UPC |
| Database Persistence | ✅ Ready | Check DB: `price_snapshots` table |
| Store Inventory API | ✅ Ready | GET `/api/v1/stores/nearby?zip=94102` |
| Deal Stacking (Cards) | ⏳ M5 | Requires real coupons/portals |
| Coupons | ⏳ M5 | Requires Rust scraper |
| Portal Rates | ⏳ M5 | Requires Rakuten scraper |
| Alerts | ⏳ M4 | Setup email alerts |

---

## Expected Success Criteria

✅ **Milestone 1+2+3 Success:**
1. Search for "Apple AirPods Pro" → See canonical name, real prices from 3+ retailers
2. Search with zip code → See local stores if available
3. Cards page → Add card → Portfolio shows beautiful card designs
4. Database has real data in `products`, `price_snapshots`, `stores` tables
5. Frontend shows real images, real prices, real history

✅ **Keepa Integration Success:**
1. Search for Amazon product → Amazon price appears
2. Price history shows 30-day and 90-day lows
3. Prices are NOT synthetic/random

---

## Next Steps (Milestones 4 & 5)

After testing is verified:
- **Milestone 4:** Alerts with email notifications
- **Milestone 5:** Real coupons and portal rates

---

## Support

If tests fail:
1. Check `.env` has all API keys
2. Check terminal logs for specific errors
3. Verify database migrations ran: `alembic current`
4. Restart all services (clean exit, then restart)

**Happy testing! 🚀**
