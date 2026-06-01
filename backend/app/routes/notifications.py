from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas import schemas
from app.models import models

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_user_notifications(db, user_id=current_user.id, limit=limit)

@router.put("/{notif_id}/read", response_model=schemas.NotificationResponse)
def read_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this notification")
        
    return crud.mark_notification_as_read(db, notif_id=notif_id)
