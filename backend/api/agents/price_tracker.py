from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from agents.state import HuntState, PriceSnapshot, DealConfidence
from config import get_settings
from lib.bestbuy import BestBuyClient
from lib.walmart import WalmartClient

logger = logging.getLogger(__name__)


async def price_tracker_node(state: HuntState) -> dict:
    """
    Fetch current prices from multiple retailers for the given product.
    Priority order:
    1. BestBuy API
    2. Walmart API
    3. Keepa API (Amazon price history)
    4. SerpAPI (Google Shopping sweep)
    5. Mock fallback for demo
    """
    product = state.product_canonical or state.product_name
    snapshots = []
    settings = get_settings()

    try:
        # Run price fetches in parallel
        tasks = [
            fetch_bestbuy(product, settings.bestbuy_api_key),
            fetch_walmart(product, settings.walmart_api_key),
            fetch_keepa(product, settings.keepa_api_key),
            fetch_serp_shopping(product, settings.serpapi_key),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten results and add to snapshots
        for result in results:
            if result and not isinstance(result, Exception):
                if isinstance(result, list):
                    snapshots.extend(result)
                else:
                    snapshots.append(result)

    except Exception as e:
        logger.error(f"Price tracker parallel fetch error: {str(e)}")

    # Fallback to mock prices if no real data
    if not snapshots:
        logger.info("No real prices found, using mock data")
        snapshots = generate_mock_prices(product)

    return {"prices": snapshots}


async def fetch_bestbuy(product: str, api_key: str) -> list[PriceSnapshot]:
    """Fetch price from BestBuy API."""
    if not api_key:
        return []

    try:
        client = BestBuyClient(api_key)
        result = await client.search_product(product)
        await client.close()

        if result:
            return [PriceSnapshot(
                retailer="bestbuy",
                url=result.get("url", "https://bestbuy.com"),
                current_price=result.get("price", 0),
                price_30d_low=None,
                captured_at=datetime.utcnow().isoformat(),
                confidence=DealConfidence.VERIFIED,
            )]
    except Exception as e:
        logger.error(f"BestBuy fetch error: {str(e)}")

    return []


async def fetch_walmart(product: str, api_key: str) -> list[PriceSnapshot]:
    """Fetch price from Walmart API."""
    if not api_key:
        return []

    try:
        client = WalmartClient(api_key)
        result = await client.search_product(product)
        await client.close()

        if result:
            return [PriceSnapshot(
                retailer="walmart",
                url=result.get("url", "https://walmart.com"),
                current_price=result.get("price", 0),
                price_30d_low=None,
                captured_at=datetime.utcnow().isoformat(),
                confidence=DealConfidence.VERIFIED,
            )]
    except Exception as e:
        logger.error(f"Walmart fetch error: {str(e)}")

    return []


async def fetch_keepa(product: str, api_key: str) -> list[PriceSnapshot]:
    """Fetch Amazon price history from Keepa API."""
    if not api_key:
        return []

    # TODO: Implement Keepa API integration
    logger.debug("Keepa API not yet implemented")
    return []


async def fetch_serp_shopping(product: str, api_key: str) -> list[PriceSnapshot]:
    """Fetch cross-retailer prices from SerpAPI."""
    if not api_key:
        return []

    # TODO: Implement SerpAPI integration
    logger.debug("SerpAPI integration not yet implemented")
    return []


def generate_mock_prices(product: str) -> list[PriceSnapshot]:
    """Generate realistic mock prices for demo purposes."""
    retailers = [
        {"name": "amazon", "base": 89.99},
        {"name": "target", "base": 91.99},
    ]

    snapshots = []
    base_time = datetime.utcnow()

    for retailer in retailers:
        import random
        current = retailer["base"] + random.uniform(-5, 5)
        low_30 = current - random.uniform(2, 10)

        snapshots.append(PriceSnapshot(
            retailer=retailer["name"],
            url=f"https://{retailer['name']}.com/search?q={product.replace(' ', '+')}",
            current_price=round(current, 2),
            price_30d_low=round(low_30, 2),
            captured_at=base_time.isoformat(),
            confidence=DealConfidence.INFERRED,
        ))

    return snapshots
