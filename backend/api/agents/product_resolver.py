from __future__ import annotations

import logging
from datetime import datetime

from agents.state import HuntState, Product
from config import get_settings
from db.session import SessionLocal
from lib.bestbuy import BestBuyClient
from models.db import Product as ProductModel

logger = logging.getLogger(__name__)


async def product_resolver_node(state: HuntState) -> dict:
    """
    Resolve a product name to a canonical product with UPC/ASIN.

    Steps:
    1. LLM disambiguation (existing disambiguate_product)
    2. Search BestBuy API for UPC
    3. Check/create Product record in DB
    4. Return product info for downstream agents
    """
    product_name = state.product_canonical or state.product_name
    settings = get_settings()
    db = SessionLocal()

    try:
        # Step 1: Try to find/create product from BestBuy search
        if settings.bestbuy_api_key:
            product_data = await _search_bestbuy_for_product(product_name, settings.bestbuy_api_key)
        else:
            product_data = None

        if not product_data:
            # Fallback: create minimal product record
            product_data = {
                "name": product_name,
                "upc": None,
                "asin": None,
                "image_url": None,
                "category": None,
            }

        # Step 2: Check if product exists in DB by UPC or name
        upc = product_data.get("upc")
        existing_product = None

        if upc:
            existing_product = db.query(ProductModel).filter(ProductModel.upc == upc).first()

        if not existing_product:
            # Create new product record
            existing_product = ProductModel(
                name=product_name,
                canonical_name=product_data.get("name"),
                upc=upc,
                asin=product_data.get("asin"),
                brand=product_data.get("brand"),
                category=product_data.get("category"),
                image_url=product_data.get("image_url"),
            )
            db.add(existing_product)
            db.commit()
            db.refresh(existing_product)
            logger.info(f"Created product: {existing_product.id} - {product_name}")

        # Step 3: Return product info
        product_obj = Product(
            id=str(existing_product.id),
            name=existing_product.name,
            canonical_name=existing_product.canonical_name,
            upc=existing_product.upc,
            asin=existing_product.asin,
            brand=existing_product.brand,
            category=existing_product.category,
            image_url=existing_product.image_url,
        )

        return {
            "product": product_obj,
            "product_id": str(existing_product.id),
            "upc": existing_product.upc,
            "asin": existing_product.asin,
        }

    except Exception as e:
        logger.error(f"Product resolver error: {str(e)}")
        return {
            "product": None,
            "product_id": None,
            "upc": None,
            "asin": None,
            "errors": [f"Product resolution failed: {str(e)}"]
        }

    finally:
        db.close()


async def _search_bestbuy_for_product(query: str, api_key: str) -> dict | None:
    """
    Search BestBuy for a product and extract UPC and other metadata.
    """
    try:
        client = BestBuyClient(api_key)
        result = await client.search_product(query)
        await client.close()

        if result:
            return {
                "name": result.get("name"),
                "upc": result.get("upc"),
                "category": result.get("category"),
                "image_url": result.get("image_url"),
                "brand": extract_brand(result.get("name", "")),
            }
    except Exception as e:
        logger.error(f"BestBuy product search error: {str(e)}")

    return None


def extract_brand(product_name: str) -> str | None:
    """
    Extract likely brand from product name.
    E.g., "Apple AirPods Pro" → "Apple"
    """
    if not product_name:
        return None

    words = product_name.split()
    if words:
        # First word is often the brand for tech products
        return words[0]

    return None
