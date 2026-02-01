# Installation Verification Guide

## Expected Linting Errors (Before Installation)

You may see these errors in VS Code **before installing dependencies**:
- ❌ Import "fastapi" could not be resolved
- ❌ Import "sqlalchemy" could not be resolved  
- ❌ Import "pydantic" could not be resolved

**These are normal!** They will disappear after running:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

## Verification Checklist

### ✅ Backend Installation Success

After installing backend dependencies, verify:

1. **Start the server:**
```powershell
cd backend
python run.py
```

2. **You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

3. **Test endpoints:**
- Open browser: http://localhost:8000
- Should see: `{"message":"Daily Habit Tracker API","status":"active"}`
- Open: http://localhost:8000/docs
- Should see: Interactive API documentation

4. **Database created:**
- Check for `habits.db` file in backend folder
- This confirms SQLite database was created successfully

### ✅ Frontend Installation Success

After installing frontend dependencies, verify:

1. **Start the dev server:**
```powershell
cd frontend
npm install
npm run dev
```

2. **You should see:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

3. **Open browser:**
- Navigate to: http://localhost:5173
- Should see: Beautiful login page with gradient background
- No console errors in browser DevTools

4. **Check build (optional):**
```powershell
npm run build
```
Should complete without errors.

## Common Installation Issues

### Backend Issues

**Issue**: `python: command not found`
**Solution**: Install Python 3.9+ from python.org

**Issue**: `pip: command not found`
**Solution**: Python should include pip. Try `python -m pip` instead

**Issue**: `venv: No module named venv`
**Solution**: Install python3-venv or use virtualenv

**Issue**: Database errors
**Solution**: Delete `habits.db` and restart server

**Issue**: Port 8000 already in use
**Solution**: Change port in `run.py` line 4

### Frontend Issues

**Issue**: `npm: command not found`
**Solution**: Install Node.js 18+ from nodejs.org

**Issue**: Installation takes long time
**Solution**: Normal! npm installs many packages. Wait patiently.

**Issue**: `EACCES` permission errors
**Solution**: Don't use sudo. Fix npm permissions or use nvm.

**Issue**: Port 5173 already in use
**Solution**: Vite will automatically try 5174, 5175, etc.

## Testing the Complete Flow

### 1. Register New User
- Go to http://localhost:5173
- Click "Create one"
- Fill form: username, email, password
- Click "Create Account"
- Should redirect to login

### 2. Login
- Enter username and password
- Click "Sign In"  
- Should redirect to dashboard

### 3. Create First Habit
- Click "New Habit" button
- Enter name: "Morning Exercise"
- Choose icon: 💪
- Choose color: Blue
- Click "Create Habit"
- Should see habit card appear

### 4. Complete Habit Today
- Click the checkmark button on habit
- Should turn green with ✓
- Progress cards should update

### 5. Check Progress
- Daily progress: 1/1 (100%)
- Weekly progress: 1/7
- Monthly progress updates
- Streak shows: 1 day

### 6. Edit Habit
- Click edit icon (pencil)
- Change name to "Morning Workout"
- Click "Update Habit"
- Changes should reflect immediately

### 7. Logout & Login Again
- Click "Logout"
- Login again
- Habits and progress persist
- Completion status maintained

## Success Indicators

✅ **Backend Running Successfully:**
- Server starts without errors
- API docs accessible
- Database file created
- No Python import errors in terminal

✅ **Frontend Running Successfully:**
- Dev server starts
- Page loads in browser
- No console errors
- Styles load correctly
- Fonts load (Inter)

✅ **Integration Working:**
- Can register new users
- Can login successfully
- Habits CRUD operations work
- Progress updates in real-time
- Token persists across refreshes

## Performance Expectations

**Backend:**
- Startup time: < 2 seconds
- API response time: < 100ms
- Database queries: < 50ms

**Frontend:**
- Initial page load: < 1 second
- Navigation: Instant
- API calls: < 200ms
- UI updates: Instant

## Troubleshooting Commands

**Reset Everything:**
```powershell
# Backend
cd backend
Remove-Item habits.db -ErrorAction SilentlyContinue
Remove-Item -Recurse venv -ErrorAction SilentlyContinue

# Frontend  
cd frontend
Remove-Item -Recurse node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
```

**Check Python Version:**
```powershell
python --version
# Should be 3.9 or higher
```

**Check Node Version:**
```powershell
node --version
# Should be 18 or higher
```

**View Backend Logs:**
```powershell
cd backend
python run.py
# Watch terminal output for errors
```

**View Frontend Logs:**
```powershell
cd frontend
npm run dev
# Watch terminal output for errors
```

**Check Browser Console:**
- Press F12 in browser
- Go to Console tab
- Should have no red errors

## What Success Looks Like

When everything is working:

1. **Backend Terminal:**
```
INFO:     Application startup complete.
INFO:     127.0.0.1:xxxxx - "GET /api/habits/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "POST /api/habits/1/logs HTTP/1.1" 201 Created
```

2. **Frontend Terminal:**
```
VITE v5.0.8  ready in 234 ms
```

3. **Browser:**
- Beautiful UI loads
- Login works
- Dashboard shows habits
- All interactions smooth

4. **Network Tab (F12):**
- API calls return 200/201 status
- JSON responses visible
- Authorization headers present

---

**If all checks pass: Congratulations! Your Daily Habit Tracker is ready! 🎉**
