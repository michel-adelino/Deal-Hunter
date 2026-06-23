# Backend API Implementation — DealHunter

**Stack:** Python 3.11 · FastAPI · Pydantic v2 · SQLAlchemy 2.0 · Celery · Redis · PostgreSQL

---

## Directory Structure

```
backend/api/
├── main.py                  # FastAPI app entry point
├── requirements.txt
├── .env.example
├── routers/
│   ├── hunt.py              # Hunt start + SSE stream
│   ├── cards.py             # Card portfolio CRUD
│   ├── alerts.py            # Alert management
│   ├── prices.py            # Price history
│   └── plaid.py             # Optional Plaid integration
├── agents/
│   ├── orchestrator.py      # LangGraph graph definition
│   ├── price_tracker.py
│   ├── card_matcher.py
│   ├── coupon_hunter.py
│   ├── portal_optimizer.py
│   ├── deal_stacker.py
│   ├── state.py             # HuntState Pydantic model
│   └── data/
│       └── card_benefits.json
├── tasks/
│   └── hunt_task.py         # Celery task that runs the agent graph
├── models/
│   └── db.py                # SQLAlchemy models
├── db/
│   ├── session.py           # DB session factory
│   └── migrations/          # Alembic migrations
└── lib/
    ├── redis.py              # Redis connection + stream helpers
    └── auth.py               # JWT helpers
```

---

## `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from routers import hunt, cards, alerts, prices

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="DealHunter API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hunt.router, prefix="/api/v1")
app.include_router(cards.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(prices.router, prefix="/api/v1")
```

---

## Hunt Router

`routers/hunt.py`

```python
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
import asyncio
import json

from lib.auth import get_current_user
from lib.redis import get_redis
from tasks.hunt_task import run_hunt
from models.db import Hunt, User
from db.session import get_db

router = APIRouter()

@router.post("/hunt")
async def start_hunt(
    body: HuntRequest,
    user: User = Depends(get_current_user),
    db = Depends(get_db),
):
    hunt = Hunt(user_id=user.id, status="running")
    db.add(hunt)
    db.commit()

    # Dispatch Celery task
    run_hunt.delay(
        hunt_id=str(hunt.id),
        products=body.products,
        user_cards=user.cards_json,
    )

    return {"hunt_id": str(hunt.id), "status": "running"}


@router.get("/hunt/{hunt_id}/stream")
async def stream_hunt(
    hunt_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """
    Server-Sent Events stream. Reads from Redis pub/sub channel
    for this hunt_id and forwards events to the client.
    """
    redis = await get_redis()

    async def event_generator():
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"hunt:{hunt_id}")
        try:
            async for message in pubsub.listen():
                if await request.is_disconnected():
                    break
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    event_type = data.pop("event_type")
                    yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
                    if event_type == "hunt_complete":
                        break
        finally:
            await pubsub.unsubscribe(f"hunt:{hunt_id}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
```

---

## Celery Task

`tasks/hunt_task.py`

```python
from celery import Celery
import asyncio
from agents.orchestrator import build_hunt_graph
from agents.state import HuntState
from lib.redis import publish_event

celery_app = Celery(
    "dealhunter",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

@celery_app.task
def run_hunt(hunt_id: str, products: list[str], user_cards: list[dict]):
    """
    Runs the agent graph for each product.
    Publishes SSE events to Redis as each agent completes.
    """
    asyncio.run(_run_hunt_async(hunt_id, products, user_cards))


async def _run_hunt_async(hunt_id: str, products: list[str], user_cards: list[dict]):
    graph = build_hunt_graph()

    for product in products:
        initial_state = HuntState(
            hunt_id=hunt_id,
            product_name=product,
            user_cards=user_cards,
        )

        # Graph runs agents in parallel; each agent calls publish_event
        # as it completes, so the frontend sees results stream in
        final_state = await graph.ainvoke(
            initial_state,
            config={"hunt_id": hunt_id},  # passed to agents for SSE publishing
        )

    await publish_event(hunt_id, "hunt_complete", {"hunt_id": hunt_id, "status": "complete"})
```

---

## Database Models

`models/db.py`

```python
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime)
    cards = relationship("UserCard", back_populates="user")
    hunts = relationship("Hunt", back_populates="user")

class UserCard(Base):
    __tablename__ = "user_cards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    card_type = Column(String, nullable=False)
    label = Column(String)
    manual_offers = Column(JSON, default=list)   # list of user-entered offers
    user = relationship("User", back_populates="cards")

class Hunt(Base):
    __tablename__ = "hunts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String, default="running")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    result_json = Column(JSON)
    user = relationship("User", back_populates="hunts")

class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    retailer = Column(String)
    price = Column(Float)
    currency = Column(String, default="USD")
    captured_at = Column(DateTime)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    product_name = Column(String)
    alert_type = Column(String)   # "price_drop" | "card_credit_expiry"
    threshold_price = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime, nullable=True)
```

---

## requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
sqlalchemy==2.0.25
alembic==1.13.1
celery==5.3.6
redis==5.0.1
langgraph==0.0.26
anthropic==0.17.0
httpx==0.26.0
slowapi==0.1.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
psycopg2-binary==2.9.9
```

---

## .env.example

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/dealhunter
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-to-a-long-random-string

# Anthropic (for agent reasoning + product disambiguation)
ANTHROPIC_API_KEY=sk-ant-...

# Price data
KEEPA_API_KEY=...
SERPAPI_KEY=...
BESTBUY_API_KEY=...

# Coupon data
COUPONFOLLOW_API_KEY=...

# Proxy rotation (optional but recommended for scraping)
SCRAPERAPI_KEY=...
PROXY_LIST=http://proxy1:port,http://proxy2:port

# Optional: Plaid for account-linked card offers
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
```

---

## Running in Development

```bash
# 1. Infrastructure
docker compose up -d postgres redis

# 2. Database migrations
alembic upgrade head

# 3. API server
uvicorn main:app --reload --port 8000

# 4. Celery worker (separate terminal)
celery -A tasks.hunt_task worker --loglevel=info

# 5. Celery beat scheduler (separate terminal, for weekly portal scrapes)
celery -A tasks.hunt_task beat --loglevel=info
```
