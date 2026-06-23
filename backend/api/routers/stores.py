from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from models.db import Store

router = APIRouter(prefix="/api/v1/stores", tags=["stores"])


@router.get("/nearby")
async def get_nearby_stores(
    zip_code: str,
    product_id: str | None = None,
    retailer: str | None = None,
    radius: int = 25,
    db: Session = Depends(get_db),
):
    """
    Get nearby stores for a product.

    Query params:
    - zip_code: Required. Zip code to search from
    - product_id: Optional. Product ID to check inventory
    - retailer: Optional. Filter by retailer (bestbuy, walmart, target)
    - radius: Optional. Search radius in miles (default 25)
    """
    try:
        query = db.query(Store).filter(Store.zip == zip_code)

        if retailer:
            query = query.filter(Store.retailer == retailer)

        stores = query.all()

        if not stores:
            return {
                "zip_code": zip_code,
                "stores": [],
                "message": "No stores found for this zip code",
            }

        return {
            "zip_code": zip_code,
            "count": len(stores),
            "stores": [
                {
                    "id": str(store.id),
                    "retailer": store.retailer,
                    "store_number": store.store_number,
                    "name": store.name,
                    "address": store.address,
                    "city": store.city,
                    "state": store.state,
                    "zip": store.zip,
                    "lat": store.lat,
                    "lon": store.lon,
                }
                for store in stores
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{store_id}")
async def get_store_details(store_id: str, db: Session = Depends(get_db)):
    """Get details for a specific store."""
    try:
        store = db.query(Store).filter(Store.id == store_id).first()

        if not store:
            raise HTTPException(status_code=404, detail="Store not found")

        return {
            "id": str(store.id),
            "retailer": store.retailer,
            "store_number": store.store_number,
            "name": store.name,
            "address": store.address,
            "city": store.city,
            "state": store.state,
            "zip": store.zip,
            "lat": store.lat,
            "lon": store.lon,
            "created_at": store.created_at.isoformat() if store.created_at else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
