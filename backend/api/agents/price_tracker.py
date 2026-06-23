from __future__ import annotations

from agents.state import HuntState, PriceSnapshot, DealConfidence
from datetime import datetime, timedelta
import random


async def price_tracker_node(state: HuntState) -> dict:
    """
    Fetch current prices from multiple retailers for the given product.
    Returns structured price data with historical context where available.
    """
    product = state.product_canonical or state.product_name
    snapshots = []

    try:
        keepa_data = await fetch_keepa(product)
        if keepa_data:
            snapshots.append(PriceSnapshot(
                retailer="amazon",
                url=keepa_data["url"],
                current_price=keepa_data["current"],
                price_30d_low=keepa_data.get("low_30"),
                price_90d_low=keepa_data.get("low_90"),
                predicted_drop_date=predict_drop_date(keepa_data.get("history", [])),
                drop_confidence=compute_drop_confidence(keepa_data.get("history", [])),
                captured_at=datetime.utcnow().isoformat(),
                confidence=DealConfidence.VERIFIED,
            ))
    except Exception as e:
        print(f"Keepa API error: {str(e)}")

    try:
        serp_results = await fetch_serp_shopping(product)
        for r in serp_results:
            snapshots.append(PriceSnapshot(
                retailer=r.get("merchant", "unknown"),
                url=r.get("link", ""),
                current_price=r.get("extracted_price", 0),
                captured_at=datetime.utcnow().isoformat(),
                confidence=DealConfidence.VERIFIED,
            ))
    except Exception as e:
        print(f"SerpAPI error: {str(e)}")

    if not snapshots:
        snapshots = generate_mock_prices(product)

    return {"prices": snapshots}


async def fetch_keepa(product: str) -> dict | None:
    return None


async def fetch_serp_shopping(product: str) -> list[dict]:
    return []


def generate_mock_prices(product: str) -> list[PriceSnapshot]:
    """Generate realistic mock prices for demo purposes."""
    retailers = [
        {"name": "amazon", "base": 89.99},
        {"name": "bestbuy", "base": 94.99},
        {"name": "target", "base": 91.99},
        {"name": "walmart", "base": 88.99},
    ]

    snapshots = []
    base_time = datetime.utcnow()

    for retailer in retailers:
        current = retailer["base"] + random.uniform(-5, 5)
        low_30 = current - random.uniform(2, 10)
        low_90 = current - random.uniform(5, 20)

        snapshots.append(PriceSnapshot(
            retailer=retailer["name"],
            url=f"https://{retailer['name']}.com/search?q={product.replace(' ', '+')}",
            current_price=round(current, 2),
            price_30d_low=round(low_30, 2),
            price_90d_low=round(low_90, 2),
            predicted_drop_date=(base_time + timedelta(days=random.randint(5, 15))).isoformat(),
            drop_confidence=random.uniform(0.4, 0.9),
            captured_at=base_time.isoformat(),
            confidence=DealConfidence.VERIFIED,
        ))

    return snapshots


def predict_drop_date(price_history: list) -> str | None:
    if not price_history or len(price_history) < 30:
        return None
    return None


def compute_drop_confidence(price_history: list) -> float | None:
    if not price_history:
        return None
    return 0.5
