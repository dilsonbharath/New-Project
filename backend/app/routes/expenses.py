from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from .. import crud, schemas, models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter()


def _resolve_month_year(month: Optional[int], year: Optional[int]) -> tuple[int, int]:
    today = date.today()
    resolved_month = month or today.month
    resolved_year = year or today.year
    return resolved_month, resolved_year


@router.get("/summary", response_model=schemas.ExpenseSummary)
def get_monthly_expenses(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return expenses, budget, and totals for the requested month."""
    resolved_month, resolved_year = _resolve_month_year(month, year)

    expenses = crud.get_expenses_for_month(db, current_user.id, resolved_month, resolved_year)
    budget = crud.get_monthly_budget(db, current_user.id, resolved_month, resolved_year)

    total_spent = sum(exp.amount for exp in expenses)
    budget_amount = budget.amount if budget else 0.0
    saved = max(budget_amount - total_spent, 0)

    summary_expenses = [schemas.ExpenseResponse.from_orm(exp) for exp in expenses]

    return schemas.ExpenseSummary(
        month=resolved_month,
        year=resolved_year,
        budget=budget_amount,
        total_spent=total_spent,
        saved=saved,
        expenses=summary_expenses,
    )


@router.post("/today", response_model=schemas.ExpenseResponse, status_code=status.HTTP_201_CREATED)
def save_today_expense(
    expense: schemas.ExpenseCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update today's expense. Enforces one entry per day."""
    today = date.today()
    if expense.date != today:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can only save today's expense.")

    saved = crud.upsert_expense_for_date(
        db,
        user_id=current_user.id,
        expense_date=today,
        amount=expense.amount,
        note=expense.note,
    )
    return saved


@router.put("/budget", response_model=schemas.BudgetResponse)
def upsert_budget(
    payload: schemas.BudgetUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update monthly budget for the user."""
    budget = crud.upsert_monthly_budget(
        db,
        user_id=current_user.id,
        month=payload.month,
        year=payload.year,
        amount=payload.amount,
    )
    return budget
