from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base

class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    check_in_date = Column(String, index=True)  # Format: YYYY-MM-DD
    logged_in_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())