from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.HabitResponse])
def get_habits(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all habits for the current user"""
    habits = crud.get_user_habits(db, user_id=current_user.id, skip=skip, limit=limit)
    
    # Enrich habits with statistics
    enriched_habits = []
    for habit in habits:
        current_streak, longest_streak = crud.calculate_streak(db, habit.id)
        completion_rate = crud.calculate_completion_rate(db, habit.id, days=30)
        total_completions = crud.get_total_completions(db, habit.id)
        
        habit_dict = {
            "id": habit.id,
            "user_id": habit.user_id,
            "name": habit.name,
            "description": habit.description,
            "color": habit.color,
            "icon": habit.icon,
            "target_days": habit.target_days,
            "is_active": habit.is_active,
            "created_at": habit.created_at,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "completion_rate": completion_rate,
            "total_completions": total_completions
        }
        enriched_habits.append(schemas.HabitResponse(**habit_dict))
    
    return enriched_habits


@router.get("/{habit_id}", response_model=schemas.HabitResponse)
def get_habit(
    habit_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific habit by ID"""
    habit = crud.get_habit(db, habit_id=habit_id, user_id=current_user.id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    current_streak, longest_streak = crud.calculate_streak(db, habit.id)
    completion_rate = crud.calculate_completion_rate(db, habit.id, days=30)
    total_completions = crud.get_total_completions(db, habit.id)
    
    habit_dict = {
        "id": habit.id,
        "user_id": habit.user_id,
        "name": habit.name,
        "description": habit.description,
        "color": habit.color,
        "icon": habit.icon,
        "target_days": habit.target_days,
        "is_active": habit.is_active,
        "created_at": habit.created_at,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "completion_rate": completion_rate,
        "total_completions": total_completions
    }
    
    return schemas.HabitResponse(**habit_dict)


@router.post("/", response_model=schemas.HabitResponse, status_code=status.HTTP_201_CREATED)
def create_habit(
    habit: schemas.HabitCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new habit"""
    db_habit = crud.create_habit(db=db, habit=habit, user_id=current_user.id)
    
    habit_dict = {
        "id": db_habit.id,
        "user_id": db_habit.user_id,
        "name": db_habit.name,
        "description": db_habit.description,
        "color": db_habit.color,
        "icon": db_habit.icon,
        "target_days": db_habit.target_days,
        "is_active": db_habit.is_active,
        "created_at": db_habit.created_at,
        "current_streak": 0,
        "longest_streak": 0,
        "completion_rate": 0.0,
        "total_completions": 0
    }
    
    return schemas.HabitResponse(**habit_dict)


@router.put("/{habit_id}", response_model=schemas.HabitResponse)
def update_habit(
    habit_id: int,
    habit_update: schemas.HabitUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a habit"""
    db_habit = crud.update_habit(db, habit_id=habit_id, user_id=current_user.id, habit_update=habit_update)
    if not db_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    current_streak, longest_streak = crud.calculate_streak(db, db_habit.id)
    completion_rate = crud.calculate_completion_rate(db, db_habit.id, days=30)
    total_completions = crud.get_total_completions(db, db_habit.id)
    
    habit_dict = {
        "id": db_habit.id,
        "user_id": db_habit.user_id,
        "name": db_habit.name,
        "description": db_habit.description,
        "color": db_habit.color,
        "icon": db_habit.icon,
        "target_days": db_habit.target_days,
        "is_active": db_habit.is_active,
        "created_at": db_habit.created_at,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "completion_rate": completion_rate,
        "total_completions": total_completions
    }
    
    return schemas.HabitResponse(**habit_dict)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(
    habit_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a habit"""
    success = crud.delete_habit(db, habit_id=habit_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Habit not found")
    return None
