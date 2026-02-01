from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Habit schemas
class HabitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = "#6366f1"
    icon: str = "⭐"
    target_days: int = Field(default=7, ge=1)


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    target_days: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class HabitResponse(HabitBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    current_streak: int = 0
    longest_streak: int = 0
    completion_rate: float = 0.0
    total_completions: int = 0
    
    class Config:
        from_attributes = True


# Habit Log schemas
class HabitLogBase(BaseModel):
    date: date
    completed: bool = True
    notes: Optional[str] = None


class HabitLogCreate(HabitLogBase):
    pass


class HabitLogResponse(HabitLogBase):
    id: int
    habit_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Progress schemas
class DailyProgress(BaseModel):
    date: date
    total_habits: int
    completed_habits: int
    completion_rate: float


class WeeklyProgress(BaseModel):
    week_start: date
    week_end: date
    total_habits: int
    total_possible_completions: int
    actual_completions: int
    completion_rate: float
    daily_breakdown: List[DailyProgress]


class MonthlyProgress(BaseModel):
    month: int
    year: int
    total_habits: int
    total_possible_completions: int
    actual_completions: int
    completion_rate: float
    weekly_breakdown: List[WeeklyProgress]


class OverallProgress(BaseModel):
    daily: DailyProgress
    weekly: WeeklyProgress
    monthly: MonthlyProgress


# Journal schemas
class JournalEntryBase(BaseModel):
    entry_type: str = Field(..., pattern="^(daily|weekly|monthly)$")
    date: date
    content: Optional[str] = None
    goal_text: Optional[str] = None  # Single goal for monthly (new skill to learn)
    daily_progress: Optional[str] = None  # JSON string of daily checkboxes for monthly
    rating: Optional[int] = Field(None, ge=1, le=5)  # 1-5 rating (last day of month)
    feedback: Optional[str] = None  # Feedback (last day of month)


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryUpdate(BaseModel):
    content: Optional[str] = None
    goal_text: Optional[str] = None
    daily_progress: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None


class JournalEntryResponse(JournalEntryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Expense schemas
class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0)
    note: Optional[str] = None
    date: date


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BudgetUpdate(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    amount: float = Field(..., ge=0)


class BudgetResponse(BudgetUpdate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseSummary(BaseModel):
    month: int
    year: int
    budget: float
    total_spent: float
    saved: float
    expenses: List[ExpenseResponse]
