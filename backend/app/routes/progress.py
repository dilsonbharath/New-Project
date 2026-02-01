from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import List
from .. import crud, schemas, models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=schemas.OverallProgress)
def get_overall_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall progress including daily, weekly, and monthly summaries"""
    today = date.today()
    
    # Get user's habits
    habits = crud.get_user_habits(db, user_id=current_user.id)
    active_habits = [h for h in habits if getattr(h, 'is_active', True)]
    total_habits = len(active_habits)
    
    # Daily progress
    daily_logs = db.query(models.HabitLog).join(models.Habit).filter(
        models.Habit.user_id == current_user.id,
        models.HabitLog.date == today,
        models.HabitLog.completed == True,
        models.Habit.is_active == True
    ).count()
    
    daily_progress = schemas.DailyProgress(
        date=today,
        total_habits=total_habits,
        completed_habits=daily_logs,
        completion_rate=round((daily_logs / total_habits * 100) if total_habits > 0 else 0, 1)
    )
    
    # Weekly progress
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    daily_breakdown = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_logs = db.query(models.HabitLog).join(models.Habit).filter(
            models.Habit.user_id == current_user.id,
            models.HabitLog.date == day,
            models.HabitLog.completed == True,
            models.Habit.is_active == True
        ).count()
        
        daily_breakdown.append(schemas.DailyProgress(
            date=day,
            total_habits=total_habits,
            completed_habits=day_logs,
            completion_rate=round((day_logs / total_habits * 100) if total_habits > 0 else 0, 1)
        ))
    
    weekly_completions = sum(d.completed_habits for d in daily_breakdown)
    weekly_possible = total_habits * 7
    
    weekly_progress = schemas.WeeklyProgress(
        week_start=week_start,
        week_end=week_end,
        total_habits=total_habits,
        total_possible_completions=weekly_possible,
        actual_completions=weekly_completions,
        completion_rate=round((weekly_completions / weekly_possible * 100) if weekly_possible > 0 else 0, 1),
        daily_breakdown=daily_breakdown
    )
    
    # Monthly progress
    month_start = today.replace(day=1)
    if today.month == 12:
        month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    weekly_breakdown = []
    current_week_start = month_start
    
    while current_week_start <= month_end:
        current_week_end = min(current_week_start + timedelta(days=6), month_end)
        
        week_daily_breakdown = []
        for i in range((current_week_end - current_week_start).days + 1):
            day = current_week_start + timedelta(days=i)
            day_logs = db.query(models.HabitLog).join(models.Habit).filter(
                models.Habit.user_id == current_user.id,
                models.HabitLog.date == day,
                models.HabitLog.completed == True,
                models.Habit.is_active == True
            ).count()
            
            week_daily_breakdown.append(schemas.DailyProgress(
                date=day,
                total_habits=total_habits,
                completed_habits=day_logs,
                completion_rate=round((day_logs / total_habits * 100) if total_habits > 0 else 0, 1)
            ))
        
        week_completions = sum(d.completed_habits for d in week_daily_breakdown)
        week_possible = total_habits * len(week_daily_breakdown)
        
        weekly_breakdown.append(schemas.WeeklyProgress(
            week_start=current_week_start,
            week_end=current_week_end,
            total_habits=total_habits,
            total_possible_completions=week_possible,
            actual_completions=week_completions,
            completion_rate=round((week_completions / week_possible * 100) if week_possible > 0 else 0, 1),
            daily_breakdown=week_daily_breakdown
        ))
        
        current_week_start = current_week_end + timedelta(days=1)
    
    monthly_completions = sum(w.actual_completions for w in weekly_breakdown)
    days_in_month = (month_end - month_start).days + 1
    monthly_possible = total_habits * days_in_month
    
    monthly_progress = schemas.MonthlyProgress(
        month=today.month,
        year=today.year,
        total_habits=total_habits,
        total_possible_completions=monthly_possible,
        actual_completions=monthly_completions,
        completion_rate=round((monthly_completions / monthly_possible * 100) if monthly_possible > 0 else 0, 1),
        weekly_breakdown=weekly_breakdown
    )
    
    return schemas.OverallProgress(
        daily=daily_progress,
        weekly=weekly_progress,
        monthly=monthly_progress
    )
