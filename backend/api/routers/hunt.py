from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json
from datetime import datetime
from sqlalchemy.orm import Session
from db.session import get_db
from lib.auth import get_current_user
from lib.redis import get_redis
from models.db import User, Hunt
from tasks.hunt_task import run_hunt

router = APIRouter(prefix="/api/v1", tags=["hunt"])


class HuntRequest(BaseModel):
    products: list[str]


class HuntResponse(BaseModel):
    hunt_id: str
    status: str


@router.post("/hunt", response_model=HuntResponse)
async def start_hunt(
    body: HuntRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.products:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No products provided")

    hunt = Hunt(user_id=user.id, status="running", started_at=datetime.utcnow())
    db.add(hunt)
    db.commit()
    db.refresh(hunt)

    user_cards_data = [
        {
            "id": str(card.id),
            "card_type": card.card_type,
            "label": card.label,
            "manual_offers": card.manual_offers or [],
        }
        for card in user.cards
    ]

    run_hunt.delay(
        hunt_id=str(hunt.id),
        products=body.products,
        user_cards=user_cards_data,
    )

    return {"hunt_id": str(hunt.id), "status": "running"}


@router.get("/hunt/{hunt_id}/stream")
async def stream_hunt(
    hunt_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hunt = db.query(Hunt).filter(Hunt.id == hunt_id, Hunt.user_id == user.id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")

    redis = await get_redis()

    async def event_generator():
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"hunt:{hunt_id}")
        print(f"✅ Client subscribed to hunt:{hunt_id}")
        try:
            async for message in pubsub.listen():
                if await request.is_disconnected():
                    print(f"Client disconnected from hunt:{hunt_id}")
                    break

                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        event_type = data.pop("event_type")
                        print(f"📤 Sending event: {event_type}")
                        yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
                        if event_type == "hunt_complete":
                            print(f"Hunt complete, closing stream")
                            break
                    except Exception as e:
                        print(f"Error processing message: {e}")
                        continue

        except Exception as e:
            print(f"Error in event generator: {e}")
        finally:
            await pubsub.unsubscribe(f"hunt:{hunt_id}")
            print(f"Unsubscribed from hunt:{hunt_id}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/hunt/{hunt_id}")
async def get_hunt(
    hunt_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hunt = db.query(Hunt).filter(Hunt.id == hunt_id, Hunt.user_id == user.id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")

    return {
        "hunt_id": str(hunt.id),
        "status": hunt.status,
        "started_at": hunt.started_at.isoformat(),
        "completed_at": hunt.completed_at.isoformat() if hunt.completed_at else None,
        "result": hunt.result_json,
    }
