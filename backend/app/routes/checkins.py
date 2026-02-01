from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime, date, timedelta
from ..database import get_db
from ..models import DailyCheckIn, User
from ..auth import get_current_user

router = APIRouter()

@router.post("/checkins/today")
async def record_daily_checkin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a check-in for today (automatically called when user logs in)"""
    today = date.today()
    
    # Check if already checked in today
    existing = db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.id,
        DailyCheckIn.check_in_date == today
    ).first()
    
    if not existing:
        checkin = DailyCheckIn(
            user_id=current_user.id,
            check_in_date=today
        )
        db.add(checkin)
        db.commit()
        db.refresh(checkin)
    
    return {"message": "Check-in recorded", "date": today.isoformat()}

@router.get("/checkins/calendar/{year}/{month}")
async def get_monthly_checkins(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all check-ins for a specific month"""
    # Calculate start and end of month properly
    start_date = date(year, month, 1)
    
    # Calculate next month start date
    if month == 12:
        next_month_start = date(year + 1, 1, 1)
    else:
        next_month_start = date(year, month + 1, 1)
    
    # Get all check-ins for the specified month
    checkins = db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.id,
        DailyCheckIn.check_in_date >= start_date,
        DailyCheckIn.check_in_date < next_month_start
    ).all()
    
    # Convert to list of date strings
    checkin_dates = [checkin.check_in_date.isoformat() for checkin in checkins]
    
    return {
        "year": year,
        "month": month,
        "checkins": checkin_dates
    }

@router.get("/checkins/stats")
async def get_checkin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get check-in statistics"""
    # Get all check-ins for the user
    all_checkins = db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.id
    ).order_by(DailyCheckIn.check_in_date.asc()).all()
    
    if not all_checkins:
        return {
            "total_checkins": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "this_month_checkins": 0
        }
    
    total_checkins = len(all_checkins)
    
    # Calculate current streak (from today backwards)
    today = date.today()
    current_streak = 0
    check_date = today
    checkin_dates = {checkin.check_in_date for checkin in all_checkins}
    
    while check_date in checkin_dates:
        current_streak += 1
        check_date = check_date - timedelta(days=1)
    
    # Calculate longest streak
    longest_streak = 0
    temp_streak = 0
    prev_date = None
    
    for checkin in all_checkins:
        if prev_date is None:
            temp_streak = 1
        else:
            # Check if consecutive days
            diff = (checkin.check_in_date - prev_date).days
            if diff == 1:
                temp_streak += 1
            else:
                longest_streak = max(longest_streak, temp_streak)
                temp_streak = 1
        
        prev_date = checkin.check_in_date
    
    longest_streak = max(longest_streak, temp_streak)
    
    # This month check-ins
    this_month = today.replace(day=1)
    if this_month.month == 12:
        next_month = date(this_month.year + 1, 1, 1)
    else:
        next_month = date(this_month.year, this_month.month + 1, 1)
        
    this_month_checkins = db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.id,
        DailyCheckIn.check_in_date >= this_month,
        DailyCheckIn.check_in_date < next_month
    ).count()
    
    return {
        "total_checkins": total_checkins,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "this_month_checkins": this_month_checkins
    }