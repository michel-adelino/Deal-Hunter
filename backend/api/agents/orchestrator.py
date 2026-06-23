from agents.state import HuntState
from agents.price_tracker import price_tracker_node
from agents.card_matcher import card_matcher_node
from agents.coupon_hunter import coupon_hunter_node
from agents.portal_optimizer import portal_optimizer_node
from agents.deal_stacker import deal_stacker_node
from anthropic import Anthropic
from config import get_settings


async def build_hunt_graph():
    """
    Execute the hunt pipeline sequentially.
    Returns the final state with all deal information.
    """
    return None  # Placeholder - will be called directly


async def disambiguate_product(product_name: str) -> str:
    """
    Use LLM to resolve ambiguous product names to canonical forms.
    e.g. "ray ban glasses gen 2" → "Ray-Ban Meta Smart Glasses (Gen 2)"
    """
    settings = get_settings()
    client = Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=100,
        messages=[
            {
                "role": "user",
                "content": (
                    f'The user is looking for: "{product_name}"\n'
                    f"Return the canonical product name that would appear on retailer sites.\n"
                    f"Return ONLY the canonical name, nothing else.\n"
                    f"If the product is ambiguous, return the most likely interpretation."
                ),
            }
        ],
    )

    return message.content[0].text.strip()
