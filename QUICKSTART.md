# Quick Start Guide 🚀

## Get Started in 5 Minutes

### Step 1: Backend Setup
```powershell
# Navigate to backend folder
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python run.py
```
✅ Backend running at http://localhost:8000

### Step 2: Frontend Setup (New Terminal)
```powershell
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
✅ Frontend running at http://localhost:5173

### Step 3: Use the App
1. Open http://localhost:5173 in your browser
2. Click "Create one" to register a new account
3. Login with your credentials
4. Click "New Habit" to create your first habit
5. Click the checkmark to complete it for today!

## What You Can Do

- ✅ Create unlimited habits with custom icons & colors
- 📊 Track daily completion with one click
- 🔥 Build and maintain streaks
- 📈 View daily, weekly, and monthly progress
- 🎯 Monitor completion rates
- 💪 Stay motivated with visual feedback

## Folder Structure

```
New-Project/
├── backend/          # FastAPI + SQLAlchemy backend
│   ├── app/         # Application code
│   ├── .env         # Environment variables (pre-configured)
│   └── run.py       # Start script
└── frontend/         # React + Vite + Tailwind frontend
    ├── src/         # Source code
    ├── .env         # Environment variables (pre-configured)
    └── package.json # Dependencies
```

## Default Configuration

Both `.env` files are pre-configured and ready to use:
- Backend: Port 8000, SQLite database
- Frontend: Port 5173, connects to backend

## Need Help?

Check the main README.md for:
- Complete feature list
- API documentation
- Database schema
- Troubleshooting guide
- Production deployment instructions

---

Happy habit tracking! 🌟
