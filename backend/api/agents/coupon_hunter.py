from __future__ import annotations

from agents.state import HuntState, CouponResult


async def coupon_hunter_node(state: HuntState) -> dict:
    """
    Find and verify coupon codes for the product from multiple sources.
    """
    coupons = []
    retailers = set(p.retailer for p in state.prices)

    for retailer in retailers:
        try:
            cf_codes = await fetch_couponfollow(retailer)
            rmn_codes = await fetch_retailmenot(retailer)
            all_codes = dedupe_codes(cf_codes + rmn_codes)

            for code in all_codes[:10]:
                verified = await verify_coupon_code(retailer, code)
                coupons.append(CouponResult(
                    code=code.get("code", ""),
                    discount_type=code.get("discount_type", "fixed"),
                    discount_value=code.get("discount_value", 0),
                    source=code.get("source", "unknown"),
                    verified=verified,
                    verified_at=None,  # Would be set if verified
                ))
        except Exception as e:
            state.errors.append(f"Coupon error for {retailer}: {str(e)}")

    coupons.sort(key=lambda c: (not c.verified, -c.discount_value))
    return {"coupons": coupons}


async def fetch_couponfollow(retailer: str) -> list[dict]:
    # Placeholder - implement with CouponFollow API
    return []


async def fetch_retailmenot(retailer: str) -> list[dict]:
    # Placeholder - implement with RetailMeNot scraping
    return []


async def verify_coupon_code(retailer: str, code: dict) -> bool:
    # Placeholder - would verify via Rust worker or test cart
    return False


def dedupe_codes(codes: list[dict]) -> list[dict]:
    seen = set()
    deduped = []
    for code in codes:
        code_str = code.get("code", "").upper()
        if code_str and code_str not in seen:
            seen.add(code_str)
            deduped.append(code)
    return deduped
