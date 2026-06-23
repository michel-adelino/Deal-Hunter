from __future__ import annotations
from agents.state import HuntState, PortalOffer, DealConfidence
from datetime import datetime


PORTALS = [
    {"name": "capital_one_shopping", "cache_key": "portal:capital_one_shopping"},
    {"name": "rakuten", "cache_key": "portal:rakuten"},
    {"name": "chase_shopping", "cache_key": "portal:chase_shopping"},
    {"name": "amex_offers", "cache_key": "portal:amex_offers"},
]


async def portal_optimizer_node(state: HuntState) -> dict:
    """
    Find and rank shopping portal cashback rates for each retailer.
    """
    offers = []

    for price in state.prices:
        for portal in PORTALS:
            try:
                rate_data = await get_portal_rate(portal["name"], price.retailer)
                if rate_data:
                    offers.append(PortalOffer(
                        portal_name=portal["name"],
                        cashback_rate=rate_data["rate"],
                        retailer=price.retailer,
                        retailer_url=price.url,
                        source_url=rate_data.get("source_url", ""),
                        scraped_at=rate_data.get("scraped_at", datetime.utcnow().isoformat()),
                        confidence=DealConfidence.INFERRED,
                    ))
            except Exception as e:
                state.errors.append(f"Portal error for {portal['name']}: {str(e)}")

    offers.sort(key=lambda o: -o.cashback_rate)
    return {"portal_offers": offers}


async def get_portal_rate(portal_name: str, retailer: str) -> dict | None:
    # Placeholder - would fetch from cache or scrape
    return None
