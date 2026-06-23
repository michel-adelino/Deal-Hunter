from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from math import radians, cos, sin, asin, sqrt

from agents.state import HuntState, LocalInventory, PriceSnapshot
from config import get_settings
from db.session import SessionLocal
from lib.bestbuy import BestBuyClient
from lib.walmart import WalmartClient
from models.db import Store

logger = logging.getLogger(__name__)


async def local_inventory_node(state: HuntState) -> dict:
    """
    Check in-store availability near user's zip code.

    Returns local_inventory with store locations, distance, and prices.
    """
    if not state.user_zip:
        logger.debug("No zip code provided, skipping local inventory check")
        return {"local_inventory": []}

    if not (state.upc or state.asin):
        logger.debug("No UPC or ASIN available, skipping local inventory check")
        return {"local_inventory": []}

    settings = get_settings()
    db = SessionLocal()
    local_results = []

    try:
        tasks = [
            fetch_bestbuy_stores(state.upc, state.user_zip, settings.bestbuy_api_key, db),
            fetch_walmart_stores(state.upc, state.user_zip, settings.walmart_api_key, db),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if result and not isinstance(result, Exception):
                local_results.extend(result)

        # Convert store records to LocalInventory objects
        local_inventory = [
            LocalInventory(
                retailer=r["retailer"],
                store_id=r["store_id"],
                store_name=r["store_name"],
                address=r.get("address"),
                city=r.get("city"),
                state=r.get("state"),
                zip=r.get("zip"),
                distance_miles=r.get("distance_miles"),
                in_stock=r.get("in_stock", False),
                price=r.get("price"),
            )
            for r in local_results
        ]

        # Also add as price snapshots (for store_id tracking)
        price_snapshots = [
            PriceSnapshot(
                retailer=inv.retailer,
                store_id=inv.store_id,
                url="",
                current_price=inv.price or 0,
                in_stock=inv.in_stock,
                captured_at=datetime.utcnow().isoformat(),
                confidence="verified",
            )
            for inv in local_inventory
            if inv.price
        ]

        return {
            "local_inventory": local_inventory,
            "prices": price_snapshots,
        }

    except Exception as e:
        logger.error(f"Local inventory error: {str(e)}")
        return {
            "local_inventory": [],
            "errors": [f"Local inventory check failed: {str(e)}"],
        }

    finally:
        db.close()


async def fetch_bestbuy_stores(
    upc: str | None,
    zip_code: str,
    api_key: str,
    db,
    radius: int = 25,
) -> list[dict]:
    """Fetch BestBuy store inventory."""
    if not api_key or not upc:
        return []

    try:
        client = BestBuyClient(api_key)
        stores = await client.get_store_inventory(upc, zip_code, radius)
        await client.close()

        results = []
        for store in stores:
            results.append({
                "retailer": "bestbuy",
                "store_id": store.get("store_id"),
                "store_name": store.get("store_name"),
                "address": store.get("address"),
                "city": store.get("city"),
                "state": store.get("state"),
                "zip": store.get("zip"),
                "distance_miles": store.get("distance_miles"),
                "in_stock": store.get("in_stock", False),
            })

        return results

    except Exception as e:
        logger.error(f"BestBuy store inventory error: {str(e)}")
        return []


async def fetch_walmart_stores(
    upc: str | None,
    zip_code: str,
    api_key: str,
    db,
    radius: int = 25,
) -> list[dict]:
    """
    Fetch Walmart store inventory.
    Note: Requires Walmart API or Rust scraper implementation.
    For now, returns empty list as placeholder.
    """
    if not api_key or not upc:
        return []

    # TODO: Implement Walmart store locator via API or scraper
    # This requires Walmart's store inventory endpoint which may not be publicly available
    logger.debug("Walmart store inventory lookup - requires scraper implementation")
    return []


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two coordinates in miles.
    """
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    miles = 3956 * c
    return miles
