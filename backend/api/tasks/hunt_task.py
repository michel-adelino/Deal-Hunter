from celery import Celery
import asyncio
import json
import time
from agents.orchestrator import disambiguate_product
from agents.state import HuntState
from agents.product_resolver import product_resolver_node
from agents.price_tracker import price_tracker_node
from agents.local_inventory import local_inventory_node
from agents.card_matcher import card_matcher_node
from agents.coupon_hunter import coupon_hunter_node
from agents.portal_optimizer import portal_optimizer_node
from agents.deal_stacker import deal_stacker_node
from lib.redis import publish_event, get_redis
from config import get_settings

settings = get_settings()
celery_app = Celery(
    "dealhunter",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


@celery_app.task(bind=True)
def run_hunt(self, hunt_id: str, products: list[str], user_cards: list[dict]) -> dict:
    """
    Execute the agent pipeline for each product in the hunt.
    """
    asyncio.run(_run_hunt_async(hunt_id, products, user_cards))
    return {"hunt_id": hunt_id, "status": "complete"}


async def _run_hunt_async(hunt_id: str, products: list[str], user_cards: list[dict], user_zip: str | None = None) -> None:
    print(f"🚀 Starting hunt {hunt_id} with products: {products}")

    # Give frontend time to connect to SSE stream
    await asyncio.sleep(0.5)

    for product in products:
        try:
            print(f"📝 Processing product: {product}")

            state = HuntState(
                hunt_id=hunt_id,
                product_name=product,
                product_canonical=product,
                user_cards=user_cards,
                user_zip=user_zip,
            )

            print(f"📢 Publishing hunt_started event...")
            await publish_event(hunt_id, "hunt_started", {
                "product": product,
                "canonical_name": product,
            })
            print(f"✅ hunt_started published")

            print("📍 Running product resolver...")
            state_update = await product_resolver_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Product resolved: UPC={state.upc}, ASIN={state.asin}")

            print("📍 Running price tracker...")
            state_update = await price_tracker_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Found {len(state.prices)} prices")
            await publish_event(hunt_id, "prices_complete", {
                "count": len(state.prices),
                "prices": [json.loads(p.model_dump_json()) for p in state.prices],
            })

            print("📍 Running local inventory check...")
            state_update = await local_inventory_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Found {len(state.local_inventory)} local stores")
            if state.local_inventory:
                await publish_event(hunt_id, "local_inventory_complete", {
                    "count": len(state.local_inventory),
                    "inventory": [json.loads(inv.model_dump_json()) for inv in state.local_inventory],
                })

            print("📍 Running card matcher...")
            state_update = await card_matcher_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Found {len(state.card_benefits)} card benefits")
            await publish_event(hunt_id, "cards_complete", {
                "count": len(state.card_benefits),
                "benefits": [json.loads(b.model_dump_json()) for b in state.card_benefits],
            })

            print("📍 Running coupon hunter...")
            state_update = await coupon_hunter_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Found {len(state.coupons)} coupons")
            await publish_event(hunt_id, "coupons_complete", {
                "count": len(state.coupons),
                "coupons": [json.loads(c.model_dump_json()) for c in state.coupons],
            })

            print("📍 Running portal optimizer...")
            state_update = await portal_optimizer_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Found {len(state.portal_offers)} portal offers")
            await publish_event(hunt_id, "portals_complete", {
                "count": len(state.portal_offers),
                "offers": [json.loads(o.model_dump_json()) for o in state.portal_offers],
            })

            print("📍 Running deal stacker...")
            state_update = deal_stacker_node(state)
            state = state.model_copy(update=state_update)
            print(f"✅ Deal stacked")

            if state.stacked_deal:
                await publish_event(hunt_id, "stacked_deal",
                    json.loads(state.stacked_deal.model_dump_json()))

            await publish_event(hunt_id, "product_complete", {
                "product": product,
                "status": "complete",
            })

        except Exception as e:
            import traceback
            print(f"❌ Error processing {product}: {e}")
            traceback.print_exc()
            await publish_event(hunt_id, "error", {
                "product": product,
                "message": str(e),
            })

    print("🎉 Hunt complete, publishing final event...")
    await publish_event(hunt_id, "hunt_complete", {"hunt_id": hunt_id, "status": "complete"})
