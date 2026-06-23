from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class DealConfidence(str, Enum):
    VERIFIED = "verified"
    INFERRED = "inferred"
    USER_ENTERED = "user_entered"
    EXPIRED = "expired"


class PriceSnapshot(BaseModel):
    retailer: str
    url: str
    current_price: float
    currency: str = "USD"
    price_30d_low: Optional[float] = None
    price_90d_low: Optional[float] = None
    predicted_drop_date: Optional[str] = None
    drop_confidence: Optional[float] = None
    captured_at: str
    confidence: DealConfidence
    store_id: Optional[str] = None
    original_price: Optional[float] = None
    in_stock: Optional[bool] = None


class CardBenefit(BaseModel):
    card_type: str
    card_label: str
    benefit_type: str
    amount: Optional[float] = None
    rate: Optional[float] = None
    merchant: str
    source_url: Optional[str] = None
    confidence: DealConfidence
    expires_at: Optional[str] = None


class CouponResult(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    source: str
    verified: bool
    verified_at: Optional[str] = None
    stacks_with_portal: Optional[bool] = None


class PortalOffer(BaseModel):
    portal_name: str
    cashback_rate: float
    retailer: str
    retailer_url: str
    source_url: str
    scraped_at: str
    confidence: DealConfidence


class StackStep(BaseModel):
    order: int
    action: str
    type: str
    saves: float
    confidence: DealConfidence


class StackedDeal(BaseModel):
    steps: list[StackStep]
    original_price: float
    final_net_price: float
    total_savings: float
    savings_breakdown: list[StackStep]
    caveats: list[str]


class Product(BaseModel):
    id: Optional[str] = None
    name: str
    canonical_name: Optional[str] = None
    upc: Optional[str] = None
    asin: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class LocalInventory(BaseModel):
    retailer: str
    store_id: str
    store_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    distance_miles: Optional[float] = None
    in_stock: bool
    price: Optional[float] = None


class HuntState(BaseModel):
    hunt_id: str
    product_name: str
    product_canonical: Optional[str] = None
    product: Optional[Product] = None
    product_id: Optional[str] = None
    upc: Optional[str] = None
    asin: Optional[str] = None
    user_zip: Optional[str] = None
    user_cards: list[dict] = Field(default_factory=list)
    prices: list[PriceSnapshot] = Field(default_factory=list)
    local_inventory: list[LocalInventory] = Field(default_factory=list)
    card_benefits: list[CardBenefit] = Field(default_factory=list)
    coupons: list[CouponResult] = Field(default_factory=list)
    portal_offers: list[PortalOffer] = Field(default_factory=list)
    stacked_deal: Optional[StackedDeal] = None
    errors: list[str] = Field(default_factory=list)
    status: str = "running"
