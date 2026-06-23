from __future__ import annotations

from agents.state import HuntState, CardBenefit, DealConfidence
from pathlib import Path
import json


def _load_card_benefits() -> list[dict]:
    benefits_path = Path(__file__).parent / "data" / "card_benefits.json"
    if benefits_path.exists():
        return json.loads(benefits_path.read_text())
    return []


async def card_matcher_node(state: HuntState) -> dict:
    """
    Match user cards against public card benefits database
    and user-entered card offers.
    """
    benefits = []
    card_benefits_db = _load_card_benefits()

    for user_card in state.user_cards:
        card_type = user_card.get("card_type", "")

        for db_benefit in card_benefits_db:
            if db_benefit.get("card_type") != card_type:
                continue

            if merchant_matches(db_benefit.get("merchant_category", ""), state.prices):
                benefits.append(CardBenefit(
                    card_type=card_type,
                    card_label=user_card.get("label", card_type),
                    benefit_type=db_benefit.get("benefit_type", "cashback"),
                    rate=db_benefit.get("rate"),
                    amount=db_benefit.get("amount"),
                    merchant=db_benefit.get("merchant_category", ""),
                    source_url=db_benefit.get("source_url"),
                    confidence=DealConfidence.INFERRED,
                ))

        for offer in user_card.get("manual_offers", []):
            benefits.append(CardBenefit(
                card_type=card_type,
                card_label=user_card.get("label", card_type),
                benefit_type="credit",
                amount=offer.get("amount"),
                merchant=offer.get("merchant", ""),
                confidence=DealConfidence.USER_ENTERED,
                expires_at=offer.get("expires_at"),
            ))

    return {"card_benefits": benefits}


def merchant_matches(merchant_category: str, prices: list) -> bool:
    # Simple matching - can be enhanced with merchant categorization
    if not prices or not merchant_category:
        return False
    return any(merchant_category.lower() in str(p.retailer).lower() for p in prices)
