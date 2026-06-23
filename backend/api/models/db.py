from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Boolean, func, Index
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    cards = relationship("UserCard", back_populates="user", cascade="all, delete-orphan")
    hunts = relationship("Hunt", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class UserCard(Base):
    __tablename__ = "user_cards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    card_type = Column(String, nullable=False)
    label = Column(String)
    manual_offers = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="cards")


class Hunt(Base):
    __tablename__ = "hunts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="running", index=True)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    result_json = Column(JSON, nullable=True)
    user = relationship("User", back_populates="hunts")


class Product(Base):
    __tablename__ = "products"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    canonical_name = Column(String, nullable=True)
    canonical_url = Column(String, nullable=True)
    upc = Column(String, unique=True, nullable=True, index=True)
    asin = Column(String, nullable=True, index=True)
    brand = Column(String, nullable=True)
    category = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    retailer = Column(String, nullable=False)
    store_id = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    in_stock = Column(Boolean, nullable=True)
    url = Column(String, nullable=True)
    currency = Column(String, default="USD")
    captured_at = Column(DateTime, server_default=func.now(), index=True)
    __table_args__ = (Index('idx_price_snapshots_retailer_captured', 'retailer', 'captured_at'),)


class Store(Base):
    __tablename__ = "stores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    retailer = Column(String, nullable=False, index=True)
    store_number = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True, index=True)
    state = Column(String, nullable=True, index=True)
    zip = Column(String, nullable=True, index=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    retailer = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    discount_type = Column(String, nullable=False)
    discount_value = Column(Float, nullable=False)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class PortalRate(Base):
    __tablename__ = "portal_rates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portal_name = Column(String, nullable=False, index=True)
    retailer = Column(String, nullable=False, index=True)
    cashback_rate = Column(Float, nullable=False)
    scraped_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())


class Deal(Base):
    __tablename__ = "deals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    hunt_id = Column(UUID(as_uuid=True), ForeignKey("hunts.id"), nullable=False, index=True)
    deal_type = Column(String)
    amount = Column(Float)
    source = Column(String)
    source_url = Column(String, nullable=True)
    confidence = Column(String)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True, index=True)
    product_name = Column(String, nullable=True, index=True)
    alert_type = Column(String)
    threshold_price = Column(Float, nullable=True)
    notify_email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    last_checked_at = Column(DateTime, nullable=True)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="alerts")
