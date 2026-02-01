from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import date, datetime, timedelta
from typing import List, Optional
from . import models, schemas
from .auth import get_password_hash, verify_password


# User CRUD operations
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# Habit CRUD operations
def get_user_habits(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Habit]:
    return db.query(models.Habit).filter(models.Habit.user_id == user_id).offset(skip).limit(limit).all()


def get_habit(db: Session, habit_id: int, user_id: int) -> Optional[models.Habit]:
    return db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        models.Habit.user_id == user_id
    ).first()


def create_habit(db: Session, habit: schemas.HabitCreate, user_id: int) -> models.Habit:
    db_habit = models.Habit(**habit.model_dump(), user_id=user_id)
    db.add(db_habit)
    db.commit()
    db.refresh(db_habit)
    return db_habit


def update_habit(db: Session, habit_id: int, user_id: int, habit_update: schemas.HabitUpdate) -> Optional[models.Habit]:
    db_habit = get_habit(db, habit_id, user_id)
    if not db_habit:
        return None
    
    update_data = habit_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_habit, field, value)
    
    db.commit()
    db.refresh(db_habit)
    return db_habit


def delete_habit(db: Session, habit_id: int, user_id: int) -> bool:
    db_habit = get_habit(db, habit_id, user_id)
    if not db_habit:
        return False
    
    db.delete(db_habit)
    db.commit()
    return True


# Habit Log CRUD operations
def get_habit_logs(db: Session, habit_id: int, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[models.HabitLog]:
    habit = get_habit(db, habit_id, user_id)
    if not habit:
        return []
    
    query = db.query(models.HabitLog).filter(models.HabitLog.habit_id == habit_id)
    
    if start_date:
        query = query.filter(models.HabitLog.date >= start_date)
    if end_date:
        query = query.filter(models.HabitLog.date <= end_date)
    
    return query.order_by(models.HabitLog.date.desc()).all()


def get_habit_log_by_date(db: Session, habit_id: int, log_date: date) -> Optional[models.HabitLog]:
    return db.query(models.HabitLog).filter(
        models.HabitLog.habit_id == habit_id,
        models.HabitLog.date == log_date
    ).first()


def toggle_habit_log(db: Session, habit_id: int, user_id: int, log_date: date, notes: Optional[str] = None) -> Optional[models.HabitLog]:
    habit = get_habit(db, habit_id, user_id)
    if not habit:
        return None
    
    existing_log = get_habit_log_by_date(db, habit_id, log_date)
    
    if existing_log:
        # Toggle completed status
        setattr(existing_log, 'completed', not existing_log.completed)
        if notes is not None:
            setattr(existing_log, 'notes', notes)
        db.commit()
        db.refresh(existing_log)
        return existing_log
    else:
        new_log = models.HabitLog(
            habit_id=habit_id,
            date=log_date,
            completed=True,
            notes=notes
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log


def delete_habit_log(db: Session, log_id: int, user_id: int) -> bool:
    log = db.query(models.HabitLog).join(models.Habit).filter(
        models.HabitLog.id == log_id,
        models.Habit.user_id == user_id
    ).first()
    
    if not log:
        return False
    
    db.delete(log)
    db.commit()
    return True


# Progress calculation functions
def calculate_streak(db: Session, habit_id: int) -> tuple[int, int]:
    """Calculate current streak and longest streak for a habit"""
    logs = db.query(models.HabitLog).filter(
        models.HabitLog.habit_id == habit_id,
        models.HabitLog.completed == True
    ).order_by(models.HabitLog.date.desc()).all()
    
    if not logs:
        return 0, 0
    
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    today = date.today()
    expected_date = today
    
    for log in logs:
        log_date = log.date if isinstance(log.date, date) else log.date
        if log_date == expected_date:
            current_streak += 1
            temp_streak += 1
            expected_date -= timedelta(days=1)
        elif log_date < expected_date:
            if current_streak > 0:
                break
            temp_streak = 1
            expected_date = log_date - timedelta(days=1)
        
        longest_streak = max(longest_streak, temp_streak)
    
    first_log_date = logs[0].date if isinstance(logs[0].date, date) else logs[0].date
    if first_log_date < today - timedelta(days=1):
        current_streak = 0
    
    return current_streak, longest_streak


def calculate_completion_rate(db: Session, habit_id: int, days: int = 30) -> float:
    """Calculate completion rate for the last N days"""
    start_date = date.today() - timedelta(days=days)
    
    completed_logs = db.query(func.count(models.HabitLog.id)).filter(
        models.HabitLog.habit_id == habit_id,
        models.HabitLog.date >= start_date,
        models.HabitLog.completed == True
    ).scalar()
    
    if days == 0:
        return 0.0
    
    return round((completed_logs / days) * 100, 1)


def get_total_completions(db: Session, habit_id: int) -> int:
    """Get total number of completions for a habit"""
    return db.query(func.count(models.HabitLog.id)).filter(
        models.HabitLog.habit_id == habit_id,
        models.HabitLog.completed == True
    ).scalar() or 0


# Expense CRUD operations
def get_monthly_budget(db: Session, user_id: int, month: int, year: int) -> Optional[models.MonthlyBudget]:
    return db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.user_id == user_id,
        models.MonthlyBudget.month == month,
        models.MonthlyBudget.year == year
    ).first()


def upsert_monthly_budget(db: Session, user_id: int, month: int, year: int, amount: float) -> models.MonthlyBudget:
    budget = get_monthly_budget(db, user_id, month, year)
    if budget:
        budget.amount = amount
    else:
        budget = models.MonthlyBudget(user_id=user_id, month=month, year=year, amount=amount)
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def get_expenses_for_month(db: Session, user_id: int, month: int, year: int) -> List[models.Expense]:
    start_date = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    return db.query(models.Expense).filter(
        models.Expense.user_id == user_id,
        models.Expense.date >= start_date,
        models.Expense.date < next_month
    ).order_by(models.Expense.date.desc()).all()


def get_expense_by_date(db: Session, user_id: int, expense_date: date) -> Optional[models.Expense]:
    return db.query(models.Expense).filter(
        models.Expense.user_id == user_id,
        models.Expense.date == expense_date
    ).first()


def upsert_expense_for_date(db: Session, user_id: int, expense_date: date, amount: float, note: Optional[str] = None) -> models.Expense:
    expense = get_expense_by_date(db, user_id, expense_date)
    if expense:
        expense.amount = amount
        expense.note = note
    else:
        expense = models.Expense(
            user_id=user_id,
            date=expense_date,
            amount=amount,
            note=note
        )
        db.add(expense)

    db.commit()
    db.refresh(expense)
    return expense
