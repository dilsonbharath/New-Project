from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Text, Float, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime, date
from typing import List
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    habits: Mapped[List["Habit"]] = relationship("Habit", back_populates="user", cascade="all, delete-orphan")
    journal_entries: Mapped[List["JournalEntry"]] = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    daily_checkins: Mapped[List["DailyCheckIn"]] = relationship("DailyCheckIn", back_populates="user", cascade="all, delete-orphan")
    expenses: Mapped[List["Expense"]] = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    budgets: Mapped[List["MonthlyBudget"]] = relationship("MonthlyBudget", back_populates="user", cascade="all, delete-orphan")


class Habit(Base):
    __tablename__ = "habits"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    color: Mapped[str] = mapped_column(String, default="#6366f1")
    icon: Mapped[str] = mapped_column(String, default="⭐")
    target_days: Mapped[int] = mapped_column(Integer, default=7)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    user: Mapped["User"] = relationship("User", back_populates="habits")
    logs: Mapped[List["HabitLog"]] = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    habit_id: Mapped[int] = mapped_column(Integer, ForeignKey("habits.id"), nullable=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    habit: Mapped["Habit"] = relationship("Habit", back_populates="logs")


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    entry_type: Mapped[str] = mapped_column(String, nullable=False)  # 'daily', 'weekly', 'monthly'
    date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # Single goal for monthly (new skill)
    daily_progress: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of daily checkboxes {1: true, 2: false, ...}
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5 rating for monthly (last day only)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)  # End of month feedback (last day only)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user: Mapped["User"] = relationship("User", back_populates="journal_entries")


class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    check_in_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User"] = relationship("User", back_populates="daily_checkins")


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (UniqueConstraint("user_id", "expense_date", name="uq_user_expense_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column("expense_date", Date, nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="expenses")


class MonthlyBudget(Base):
    __tablename__ = "monthly_budgets"
    __table_args__ = (UniqueConstraint("user_id", "month", "year", name="uq_user_budget_month"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="budgets")
