from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter()


@router.get("/entries", response_model=List[schemas.JournalEntryResponse])
def get_journal_entries(
    entry_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get journal entries with optional filtering"""
    query = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id
    )
    
    if entry_type:
        query = query.filter(models.JournalEntry.entry_type == entry_type)
    
    if start_date:
        query = query.filter(models.JournalEntry.date >= start_date)
    
    if end_date:
        query = query.filter(models.JournalEntry.date <= end_date)
    
    return query.order_by(models.JournalEntry.date.desc()).all()


@router.get("/entries/{entry_id}", response_model=schemas.JournalEntryResponse)
def get_journal_entry(
    entry_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific journal entry"""
    entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    
    return entry


@router.get("/entry/{entry_type}/{entry_date}", response_model=schemas.JournalEntryResponse)
def get_journal_entry_by_date(
    entry_type: str,
    entry_date: date,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a journal entry by type and date"""
    entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id,
        models.JournalEntry.entry_type == entry_type,
        models.JournalEntry.date == entry_date
    ).first()
    
    if not entry:
        # Return empty entry structure
        return schemas.JournalEntryResponse(
            id=0,
            user_id=current_user.id,
            entry_type=entry_type,
            date=entry_date,
            content="",
            goal_text="",
            daily_progress="{}",
            rating=None,
            feedback="",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    return entry


@router.post("/entries", response_model=schemas.JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    entry: schemas.JournalEntryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new journal entry"""
    # Check if entry already exists for this date and type
    existing = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id,
        models.JournalEntry.entry_type == entry.entry_type,
        models.JournalEntry.date == entry.date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal entry already exists for this date and type"
        )
    
    db_entry = models.JournalEntry(
        user_id=current_user.id,
        entry_type=entry.entry_type,
        date=entry.date,
        content=entry.content,
        goal_text=entry.goal_text,
        daily_progress=entry.daily_progress,
        rating=entry.rating,
        feedback=entry.feedback
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put("/entries/{entry_id}", response_model=schemas.JournalEntryResponse)
def update_journal_entry(
    entry_id: int,
    entry_update: schemas.JournalEntryUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a journal entry"""
    db_entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()
    
    if not db_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    
    if entry_update.content is not None:
        setattr(db_entry, 'content', entry_update.content)
    if entry_update.goal_text is not None:
        setattr(db_entry, 'goal_text', entry_update.goal_text)
    if entry_update.daily_progress is not None:
        setattr(db_entry, 'daily_progress', entry_update.daily_progress)
    if entry_update.rating is not None:
        setattr(db_entry, 'rating', entry_update.rating)
    if entry_update.feedback is not None:
        setattr(db_entry, 'feedback', entry_update.feedback)
    
    setattr(db_entry, 'updated_at', datetime.utcnow())
    
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.post("/save", response_model=schemas.JournalEntryResponse)
def save_journal_entry(
    entry: schemas.JournalEntryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a journal entry"""
    existing = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id,
        models.JournalEntry.entry_type == entry.entry_type,
        models.JournalEntry.date == entry.date
    ).first()
    
    if existing:
        # Update existing entry
        if entry.content is not None:
            setattr(existing, 'content', entry.content)
        if entry.goal_text is not None:
            setattr(existing, 'goal_text', entry.goal_text)
        if entry.daily_progress is not None:
            setattr(existing, 'daily_progress', entry.daily_progress)
        if entry.rating is not None:
            setattr(existing, 'rating', entry.rating)
        if entry.feedback is not None:
            setattr(existing, 'feedback', entry.feedback)
        setattr(existing, 'updated_at', datetime.utcnow())
        
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new entry
        db_entry = models.JournalEntry(
            user_id=current_user.id,
            entry_type=entry.entry_type,
            date=entry.date,
            content=entry.content,
            goal_text=entry.goal_text,
            daily_progress=entry.daily_progress,
            rating=entry.rating,
            feedback=entry.feedback
        )
        
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        return db_entry


@router.delete("/entries/{entry_id}")
def delete_journal_entry(
    entry_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a journal entry"""
    db_entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()
    
    if not db_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Journal entry deleted successfully"}
