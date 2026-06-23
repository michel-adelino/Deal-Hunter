from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.session import get_db
from lib.auth import get_current_user
from models.db import User, Alert
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["alerts"])


class AlertCreate(BaseModel):
    product_name: str
    alert_type: str
    threshold_price: Optional[float] = None


class AlertResponse(BaseModel):
    id: str
    product_name: str
    alert_type: str
    threshold_price: Optional[float]
    is_active: bool
    triggered_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alerts = db.query(Alert).filter(Alert.user_id == user.id).all()
    return [
        AlertResponse(
            id=str(alert.id),
            product_name=alert.product_name,
            alert_type=alert.alert_type,
            threshold_price=alert.threshold_price,
            is_active=alert.is_active,
            triggered_at=alert.triggered_at.isoformat() if alert.triggered_at else None,
            created_at=alert.created_at.isoformat(),
        )
        for alert in alerts
    ]


@router.post("/alerts", response_model=AlertResponse)
async def create_alert(
    alert: AlertCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_alert = Alert(
        user_id=user.id,
        product_name=alert.product_name,
        alert_type=alert.alert_type,
        threshold_price=alert.threshold_price,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return AlertResponse(
        id=str(new_alert.id),
        product_name=new_alert.product_name,
        alert_type=new_alert.alert_type,
        threshold_price=new_alert.threshold_price,
        is_active=new_alert.is_active,
        triggered_at=None,
        created_at=new_alert.created_at.isoformat(),
    )


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == user.id,
    ).first()

    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    db.delete(alert)
    db.commit()
    return {"status": "deleted"}


@router.post("/alerts/{alert_id}/toggle")
async def toggle_alert(
    alert_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == user.id,
    ).first()

    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.is_active = not alert.is_active
    db.commit()
    db.refresh(alert)

    return AlertResponse(
        id=str(alert.id),
        product_name=alert.product_name,
        alert_type=alert.alert_type,
        threshold_price=alert.threshold_price,
        is_active=alert.is_active,
        triggered_at=alert.triggered_at.isoformat() if alert.triggered_at else None,
        created_at=alert.created_at.isoformat(),
    )
