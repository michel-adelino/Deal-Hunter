# Agent Definitions — DealHunter

DealHunter uses six specialized agents built with LangGraph. Each agent is a node in a state graph. The orchestrator runs them in parallel and merges results.

LLM calls are used **sparingly** — only for tasks that genuinely require language understanding (product disambiguation, conflict resolution). All data fetching, price comparison, and math is deterministic Python/Rust.

---

## Agent Graph

```
                    ┌──────────────────┐
                    │   Orchestrator   │
                    │  (LangGraph hub) │
                    └──┬───┬───┬───┬──┘
                       │   │   │   │
            ┌──────────┘   │   │   └──────────┐
            ▼              ▼   ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
      │  Price   │  │  Card    │  │  Coupon  │  │  Portal  │
      │ Tracker  │  │ Matcher  │  │  Hunter  │  │Optimizer │
      └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
           └─────────────┴─────────────┴──────────────┘
                                    │
                            ┌───────▼───────┐
                            │ Deal Stacker  │
                            └───────┬───────┘
                                    │
                            ┌───────▼───────┐
                            │    Output     │
                            │ (streamed SSE)│
                            └───────────────┘
```

---

## Shared State Schema

All agents read from and write to a shared LangGraph state object:

```python
from pydantic import BaseModel
from typing import Optional
from enum import Enum

class DealConfidence(str, Enum):
    VERIFIED = "verified"
    INFERRED = "inferred"
    USER_ENTERED = "user_entered"
    EXPIRED = "expired"

class PriceSnapshot(BaseModel):
    retailer: str
    url: str
    current_price: float
    currency: str = "USD"
    price_30d_low: Optional[float]
    price_90d_low: Optional[float]
    predicted_drop_date: Optional[str]
    drop_confidence: Optional[float]    # 0.0–1.0
    captured_at: str                    # ISO datetime
    confidence: DealConfidence

class CardBenefit(BaseModel):
    card_type: str                      # e.g. "amex_platinum"
    card_label: str                     # user's label, e.g. "My Amex"
    benefit_type: str                   # "cashback" | "portal" | "credit" | "multiplier"
    amount: Optional[float]             # dollar amount or None for % benefits
    rate: Optional[float]               # cashback rate 0.0–1.0
    merchant: str
    source_url: Optional[str]
    confidence: DealConfidence
    expires_at: Optional[str]

class CouponResult(BaseModel):
    code: str
    discount_type: str                  # "fixed" | "percent"
    discount_value: float
    source: str
    verified: bool
    verified_at: Optional[str]
    stacks_with_portal: Optional[bool]  # None = unknown

class PortalOffer(BaseModel):
    portal_name: str
    cashback_rate: float
    retailer: str
    retailer_url: str
    source_url: str
    scraped_at: str
    confidence: DealConfidence

class StackedDeal(BaseModel):
    steps: list[dict]                   # ordered list of actions
    original_price: float
    final_net_price: float
    total_savings: float
    savings_breakdown: list[dict]
    caveats: list[str]                  # stacking conflicts, user_entered warnings

class HuntState(BaseModel):
    hunt_id: str
    product_name: str
    product_canonical: Optional[str]    # resolved product name after disambiguation
    user_cards: list[dict]
    prices: list[PriceSnapshot] = []
    card_benefits: list[CardBenefit] = []
    coupons: list[CouponResult] = []
    portal_offers: list[PortalOffer] = []
    stacked_deal: Optional[StackedDeal] = None
    errors: list[str] = []
    status: str = "running"
```

---

## Agent 1: Orchestrator

**File:** `agents/orchestrator.py`

```python
from langgraph.graph import StateGraph, END
from agents.state import HuntState
from agents.price_tracker import price_tracker_node
from agents.card_matcher import card_matcher_node
from agents.coupon_hunter import coupon_hunter_node
from agents.portal_optimizer import portal_optimizer_node
from agents.deal_stacker import deal_stacker_node

def build_hunt_graph() -> StateGraph:
    graph = StateGraph(HuntState)

    # Parallel data-gathering nodes
    graph.add_node("price_tracker", price_tracker_node)
    graph.add_node("card_matcher", card_matcher_node)
    graph.add_node("coupon_hunter", coupon_hunter_node)
    graph.add_node("portal_optimizer", portal_optimizer_node)
    graph.add_node("deal_stacker", deal_stacker_node)

    # Orchestrator fans out to all four data agents simultaneously
    graph.set_entry_point("price_tracker")  # LangGraph runs parallel nodes concurrently

    # Fan-in: all data agents feed deal_stacker
    for node in ["price_tracker", "card_matcher", "coupon_hunter", "portal_optimizer"]:
        graph.add_edge(node, "deal_stacker")

    graph.add_edge("deal_stacker", END)
    return graph.compile()
```

LLM is called once at the start for **product disambiguation** only:

```python
async def disambiguate_product(product_name: str) -> str:
    """
    Resolves ambiguous product names to canonical forms.
    e.g. "ray ban glasses gen 2" → "Ray-Ban Meta Smart Glasses (Gen 2)"
    This is the only LLM call in the pipeline.
    """
    prompt = f"""
    The user is looking for: "{product_name}"
    Return the canonical product name that would appear on retailer sites.
    Return ONLY the canonical name, nothing else.
    If the product is ambiguous, return the most likely interpretation.
    """
    # ... Anthropic SDK call
```

---

## Agent 2: Price Tracker

**File:** `agents/price_tracker.py`

```python
import httpx
from agents.state import HuntState, PriceSnapshot, DealConfidence

KEEPA_API_BASE = "https://api.keepa.com"

async def price_tracker_node(state: HuntState) -> HuntState:
    product = state.product_canonical or state.product_name
    snapshots = []

    # 1. Keepa (Amazon) — most reliable
    keepa_data = await fetch_keepa(product)
    if keepa_data:
        snapshots.append(PriceSnapshot(
            retailer="amazon",
            url=keepa_data["url"],
            current_price=keepa_data["current"],
            price_30d_low=keepa_data["low_30"],
            price_90d_low=keepa_data["low_90"],
            predicted_drop_date=predict_drop_date(keepa_data["history"]),
            drop_confidence=compute_drop_confidence(keepa_data["history"]),
            captured_at=now_iso(),
            confidence=DealConfidence.VERIFIED,
        ))

    # 2. SerpAPI Google Shopping — cross-retailer
    serp_results = await fetch_serp_shopping(product)
    for r in serp_results:
        snapshots.append(PriceSnapshot(
            retailer=r["merchant"],
            url=r["link"],
            current_price=r["extracted_price"],
            confidence=DealConfidence.VERIFIED,
            captured_at=now_iso(),
        ))

    # 3. BestBuy official API
    bb_result = await fetch_bestbuy(product)
    if bb_result:
        snapshots.append(bb_result)

    return state.model_copy(update={"prices": snapshots})


def predict_drop_date(price_history: list) -> str | None:
    """
    Rule-based prediction only (no LLM).
    If price historically drops >10% in the first 2 weeks of January → predict Jan.
    """
    # ... statistical analysis of price_history array
```

---

## Agent 3: Card Matcher

**File:** `agents/card_matcher.py`

```python
import json
from pathlib import Path
from agents.state import HuntState, CardBenefit, DealConfidence

# Static JSON of public card benefit rates — maintained by contributors
CARD_BENEFITS_DB = json.loads(
    Path("agents/data/card_benefits.json").read_text()
)

async def card_matcher_node(state: HuntState) -> HuntState:
    benefits = []

    for user_card in state.user_cards:
        card_type = user_card["card_type"]

        # 1. Match from static public benefits DB
        public_benefits = [
            b for b in CARD_BENEFITS_DB
            if b["card_type"] == card_type
            and merchant_matches(b["merchant_category"], state.prices)
        ]
        for b in public_benefits:
            benefits.append(CardBenefit(
                card_type=card_type,
                card_label=user_card.get("label", card_type),
                benefit_type=b["benefit_type"],
                rate=b.get("rate"),
                merchant=b["merchant_category"],
                source_url=b["source_url"],
                confidence=DealConfidence.INFERRED,  # public rate, not live-tested
            ))

        # 2. User-entered offers — always user_entered confidence
        for offer in user_card.get("manual_offers", []):
            benefits.append(CardBenefit(
                card_type=card_type,
                card_label=user_card.get("label", card_type),
                benefit_type="credit",
                amount=offer["amount"],
                merchant=offer["merchant"],
                confidence=DealConfidence.USER_ENTERED,
                expires_at=offer.get("expires_at"),
            ))

    return state.model_copy(update={"card_benefits": benefits})
```

**`card_benefits.json` format:**
```json
[
  {
    "card_type": "amex_platinum",
    "merchant_category": "streaming",
    "benefit_type": "credit",
    "amount": 20,
    "period": "monthly",
    "source_url": "https://www.americanexpress.com/us/credit-cards/card/platinum/",
    "last_verified": "2025-01-15",
    "notes": "Up to $20/month on eligible streaming services"
  },
  {
    "card_type": "apple_card",
    "merchant_category": "apple_store",
    "benefit_type": "cashback",
    "rate": 0.03,
    "source_url": "https://www.apple.com/apple-card/",
    "last_verified": "2025-01-15",
    "notes": "3% Daily Cash on Apple purchases"
  }
]
```

---

## Agent 4: Coupon Hunter

**File:** `agents/coupon_hunter.py`

```python
async def coupon_hunter_node(state: HuntState) -> HuntState:
    coupons = []
    retailers = [p.retailer for p in state.prices]

    for retailer in retailers:
        # 1. CouponFollow API
        cf_codes = await fetch_couponfollow(retailer)

        # 2. RetailMeNot scrape (via Rust worker)
        rmn_codes = await fetch_retailmenot(retailer)

        all_codes = dedupe_codes(cf_codes + rmn_codes)

        # 3. Verify codes via Rust coupon worker (where ToS allows)
        for code in all_codes[:10]:  # limit to top 10 by reported success rate
            verified = await verify_coupon_via_rust_worker(retailer, code)
            coupons.append(CouponResult(
                code=code["code"],
                discount_type=code["discount_type"],
                discount_value=code["discount_value"],
                source=code["source"],
                verified=verified,
                verified_at=now_iso() if verified else None,
            ))

    # Sort by: verified first, then by discount value
    coupons.sort(key=lambda c: (not c.verified, -c.discount_value))
    return state.model_copy(update={"coupons": coupons})
```

---

## Agent 5: Portal Optimizer

**File:** `agents/portal_optimizer.py`

```python
PORTALS = [
    {"name": "capital_one_shopping", "scrape_url": "https://capitaloneshopping.com/r/{merchant}"},
    {"name": "rakuten", "scrape_url": "https://www.rakuten.com/r/{merchant}"},
    {"name": "chase_shopping", "scrape_url": "https://www.chase.com/personal/credit-cards/shopping"},
]

async def portal_optimizer_node(state: HuntState) -> HuntState:
    offers = []

    for price in state.prices:
        for portal in PORTALS:
            # Weekly-cached portal rates from Rust scraper
            rate = await get_cached_portal_rate(portal["name"], price.retailer)
            if rate:
                offers.append(PortalOffer(
                    portal_name=portal["name"],
                    cashback_rate=rate["rate"],
                    retailer=price.retailer,
                    retailer_url=price.url,
                    source_url=rate["source_url"],
                    scraped_at=rate["scraped_at"],
                    confidence=DealConfidence.INFERRED,
                ))

    # Sort by cashback rate descending
    offers.sort(key=lambda o: -o.cashback_rate)
    return state.model_copy(update={"portal_offers": offers})
```

---

## Agent 6: Deal Stacker

**File:** `agents/deal_stacker.py`

This is the most critical agent. It applies **hard-coded stacking rules** (not LLM) to determine the optimal order and which deals actually combine.

```python
STACKING_CONFLICTS = {
    # (retailer, portal) pairs where using a portal voids coupon codes
    ("glasses.com", "capital_one_shopping"): "coupon_voids_portal",
    ("amazon", "rakuten"): "portal_may_void_prime_discount",
}

def deal_stacker_node(state: HuntState) -> HuntState:
    best_price = min(state.prices, key=lambda p: p.current_price)
    working_price = best_price.current_price
    steps = []
    caveats = []

    # Step 1: Best portal cashback (usually applied first — it's a rebate)
    best_portal = state.portal_offers[0] if state.portal_offers else None
    if best_portal:
        portal_savings = working_price * best_portal.cashback_rate
        steps.append({
            "order": 1,
            "action": f"Shop via {best_portal.portal_name}",
            "type": "portal_cashback",
            "saves": portal_savings,
            "confidence": best_portal.confidence,
        })

    # Step 2: Best verified coupon (check stacking conflict first)
    best_coupon = next((c for c in state.coupons if c.verified), None)
    if best_coupon:
        conflict = STACKING_CONFLICTS.get((best_price.retailer, best_portal.portal_name if best_portal else ""))
        if conflict == "coupon_voids_portal":
            caveats.append(
                f"⚠️ Using coupon {best_coupon.code} at {best_price.retailer} "
                f"may void the {best_portal.portal_name} cashback. Verify before purchasing."
            )
        savings = (working_price * best_coupon.discount_value / 100
                   if best_coupon.discount_type == "percent"
                   else best_coupon.discount_value)
        steps.append({
            "order": 2,
            "action": f"Apply code {best_coupon.code}",
            "type": "coupon",
            "saves": savings,
            "confidence": "verified" if best_coupon.verified else "unverified",
        })
        working_price -= savings

    # Step 3: Card credits & cashback (applied to final charge)
    for benefit in state.card_benefits:
        if benefit.confidence == DealConfidence.USER_ENTERED:
            caveats.append(
                f"⚠️ {benefit.card_label} {benefit.benefit_type} of "
                f"${benefit.amount} is based on what you told us — verify in your card app."
            )
        # ... add to steps

    total_savings = best_price.current_price - working_price
    return state.model_copy(update={
        "stacked_deal": StackedDeal(
            steps=steps,
            original_price=best_price.current_price,
            final_net_price=working_price,
            total_savings=total_savings,
            savings_breakdown=steps,
            caveats=caveats,
        )
    })
```
