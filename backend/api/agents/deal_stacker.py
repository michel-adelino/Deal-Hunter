from __future__ import annotations

from agents.state import HuntState, StackedDeal, StackStep, DealConfidence


STACKING_CONFLICTS = {
    # (retailer, portal) pairs where using portal voids coupons
    ("glasses.com", "capital_one_shopping"): "coupon_voids_portal",
    ("amazon", "rakuten"): "portal_may_void_prime_discount",
}


def deal_stacker_node(state: HuntState) -> dict:
    """
    Combine all deal sources in optimal order while respecting stacking rules.
    """
    if not state.prices:
        return {
            "stacked_deal": StackedDeal(
                steps=[],
                original_price=0,
                final_net_price=0,
                total_savings=0,
                savings_breakdown=[],
                caveats=["No prices found"],
            )
        }

    best_price = min(state.prices, key=lambda p: p.current_price)
    working_price = best_price.current_price
    steps = []
    caveats = []

    best_portal = state.portal_offers[0] if state.portal_offers else None
    if best_portal:
        portal_savings = working_price * best_portal.cashback_rate
        steps.append(StackStep(
            order=1,
            action=f"Shop via {best_portal.portal_name}",
            type="portal_cashback",
            saves=portal_savings,
            confidence=best_portal.confidence,
        ))
        working_price -= portal_savings

    best_coupon = next((c for c in state.coupons if c.verified), None)
    if best_coupon:
        conflict_key = (best_price.retailer, best_portal.portal_name if best_portal else "")
        if conflict_key in STACKING_CONFLICTS:
            caveats.append(
                f"⚠️ Using coupon {best_coupon.code} at {best_price.retailer} "
                f"may void the {best_portal.portal_name} cashback. Verify before purchasing."
            )

        if best_coupon.discount_type == "percent":
            coupon_savings = working_price * (best_coupon.discount_value / 100)
        else:
            coupon_savings = best_coupon.discount_value

        steps.append(StackStep(
            order=len(steps) + 1,
            action=f"Apply code {best_coupon.code}",
            type="coupon",
            saves=coupon_savings,
            confidence=DealConfidence.VERIFIED if best_coupon.verified else DealConfidence.INFERRED,
        ))
        working_price -= coupon_savings

    for benefit in state.card_benefits:
        if benefit.confidence == DealConfidence.USER_ENTERED:
            caveats.append(
                f"⚠️ {benefit.card_label} {benefit.benefit_type} of "
                f"${benefit.amount} is based on what you told us — verify in your card app."
            )

        if benefit.amount:
            steps.append(StackStep(
                order=len(steps) + 1,
                action=f"{benefit.card_label}: {benefit.benefit_type}",
                type="card_benefit",
                saves=benefit.amount,
                confidence=benefit.confidence,
            ))
            working_price -= benefit.amount

    total_savings = best_price.current_price - working_price
    return {
        "stacked_deal": StackedDeal(
            steps=steps,
            original_price=best_price.current_price,
            final_net_price=max(0, working_price),
            total_savings=max(0, total_savings),
            savings_breakdown=steps,
            caveats=caveats,
        )
    }
