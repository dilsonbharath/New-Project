from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import auth, habits, logs, progress, journal
from .routes import checkins, expenses

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Daily Habit Tracker API",
    description="API for tracking daily habits with JWT authentication",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(habits.router, prefix="/api/habits", tags=["Habits"])
app.include_router(logs.router, prefix="/api/habits", tags=["Habit Logs"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
app.include_router(journal.router, prefix="/api/journal", tags=["Journal"])
app.include_router(checkins.router, prefix="/api", tags=["Daily Check-ins"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])


@app.get("/")
def root():
    return {"message": "Daily Habit Tracker API", "status": "active"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
