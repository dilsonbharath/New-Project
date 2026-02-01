from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import crud, schemas, models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter()


@router.get("/{habit_id}/logs", response_model=List[schemas.HabitLogResponse])
def get_habit_logs(
    habit_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all logs for a specific habit"""
    logs = crud.get_habit_logs(db, habit_id=habit_id, user_id=current_user.id, start_date=start_date, end_date=end_date)
    return logs


@router.post("/{habit_id}/logs", response_model=schemas.HabitLogResponse, status_code=status.HTTP_201_CREATED)
def toggle_habit_log(
    habit_id: int,
    log: schemas.HabitLogCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle habit completion for a specific date"""
    db_log = crud.toggle_habit_log(db, habit_id=habit_id, user_id=current_user.id, log_date=log.date, notes=log.notes)
    if not db_log:
        raise HTTPException(status_code=404, detail="Habit not found")
    return db_log


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit_log(
    log_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a habit log"""
    success = crud.delete_habit_log(db, log_id=log_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Log not found")
    return None
