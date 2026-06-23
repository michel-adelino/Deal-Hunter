from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.session import get_db
from lib.auth import get_current_user
from models.db import User, UserCard

router = APIRouter(prefix="/api/v1", tags=["cards"])


class ManualOffer(BaseModel):
    merchant: str
    amount: float
    description: Optional[str] = None
    expires_at: Optional[str] = None


class CardCreate(BaseModel):
    card_type: str
    label: Optional[str] = None


class CardUpdate(BaseModel):
    label: Optional[str] = None


class CardResponse(BaseModel):
    id: str
    card_type: str
    label: Optional[str]
    manual_offers: list[dict]

    class Config:
        from_attributes = True


@router.get("/cards", response_model=list[CardResponse])
async def list_cards(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cards = db.query(UserCard).filter(UserCard.user_id == user.id).all()
    return [
        CardResponse(
            id=str(card.id),
            card_type=card.card_type,
            label=card.label,
            manual_offers=card.manual_offers or [],
        )
        for card in cards
    ]


@router.post("/cards", response_model=CardResponse)
async def create_card(
    card: CardCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_card = UserCard(
        user_id=user.id,
        card_type=card.card_type,
        label=card.label,
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)

    return CardResponse(
        id=str(new_card.id),
        card_type=new_card.card_type,
        label=new_card.label,
        manual_offers=new_card.manual_offers or [],
    )


@router.put("/cards/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: str,
    update: CardUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(UserCard).filter(
        UserCard.id == card_id,
        UserCard.user_id == user.id,
    ).first()

    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    if update.label is not None:
        card.label = update.label

    db.commit()
    db.refresh(card)

    return CardResponse(
        id=str(card.id),
        card_type=card.card_type,
        label=card.label,
        manual_offers=card.manual_offers or [],
    )


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(UserCard).filter(
        UserCard.id == card_id,
        UserCard.user_id == user.id,
    ).first()

    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    db.delete(card)
    db.commit()
    return {"status": "deleted"}


@router.post("/cards/{card_id}/offers")
async def add_card_offer(
    card_id: str,
    offer: ManualOffer,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(UserCard).filter(
        UserCard.id == card_id,
        UserCard.user_id == user.id,
    ).first()

    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    if not card.manual_offers:
        card.manual_offers = []

    card.manual_offers.append(offer.model_dump())
    db.commit()
    db.refresh(card)

    return CardResponse(
        id=str(card.id),
        card_type=card.card_type,
        label=card.label,
        manual_offers=card.manual_offers or [],
    )
