# Daily Habit Tracker 🌟

A production-ready full-stack web application for tracking daily habits with streak monitoring, progress analytics, and a clean, minimal UI designed to motivate productivity.

## Features

✨ **Complete Authentication System**
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes on both frontend and backend

📊 **Comprehensive Habit Tracking**
- Create, edit, and delete habits
- Daily completion tracking
- Automatic streak calculation (current & longest)
- 30-day completion rate
- Custom icons and colors for each habit

📈 **Progress Analytics**
- Real-time daily progress
- Weekly summaries with daily breakdown
- Monthly analytics with weekly breakdown
- Visual progress indicators

🎨 **Beautiful UI/UX**
- Clean, minimal design
- Calm, positive color scheme
- Fully responsive layout
- Smooth animations and transitions
- Tailwind CSS styling

## Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **SQLite** - Lightweight database
- **JWT** - Secure token-based authentication
- **Bcrypt** - Password hashing
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **date-fns** - Date formatting

## Project Structure

```
New-Project/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── habits.py        # Habit CRUD endpoints
│   │   │   ├── logs.py          # Habit log endpoints
│   │   │   └── progress.py      # Progress analytics endpoints
│   │   ├── __init__.py
│   │   ├── auth.py              # JWT & password hashing
│   │   ├── config.py            # Configuration settings
│   │   ├── crud.py              # Database operations
│   │   ├── database.py          # Database connection
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── models.py            # SQLAlchemy models
│   │   └── schemas.py           # Pydantic schemas
│   ├── .env                     # Environment variables
│   ├── requirements.txt         # Python dependencies
│   └── run.py                   # Run script
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── HabitCard.jsx    # Habit display component
    │   │   ├── HabitModal.jsx   # Habit creation/edit modal
    │   │   ├── Navbar.jsx       # Navigation bar
    │   │   ├── ProgressCard.jsx # Progress display component
    │   │   └── ProtectedRoute.jsx # Route protection wrapper
    │   ├── context/
    │   │   └── AuthContext.jsx  # Authentication context
    │   ├── pages/
    │   │   ├── Dashboard.jsx    # Main dashboard page
    │   │   ├── Login.jsx        # Login page
    │   │   └── Register.jsx     # Registration page
    │   ├── services/
    │   │   ├── api.js           # Axios instance with interceptors
    │   │   ├── authService.js   # Authentication API calls
    │   │   ├── habitService.js  # Habit API calls
    │   │   └── progressService.js # Progress API calls
    │   ├── App.jsx              # Main app component
    │   ├── index.css            # Global styles
    │   └── main.jsx             # App entry point
    ├── index.html
    ├── package.json
    ├── tailwind.config.js       # Tailwind configuration
    └── vite.config.js           # Vite configuration
```

## Installation & Setup

### Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```powershell
cd backend
```

2. Create a virtual environment:
```powershell
python -m venv venv
```

3. Activate the virtual environment:
```powershell
.\venv\Scripts\Activate
```

4. Install dependencies:
```powershell
pip install -r requirements.txt
```

5. The `.env` file is already configured with default settings. For production, update the `SECRET_KEY`:
```env
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=sqlite:///./habits.db
```

6. Run the backend server:
```powershell
python run.py
```

The backend API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```powershell
cd frontend
```

2. Install dependencies:
```powershell
npm install
```

3. The `.env` file is already configured. If needed, update it:
```env
VITE_API_URL=http://localhost:8000
```

4. Run the development server:
```powershell
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Running the Application

### Development Mode

1. **Start Backend** (Terminal 1):
```powershell
cd backend
.\venv\Scripts\Activate
python run.py
```

2. **Start Frontend** (Terminal 2):
```powershell
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### First-Time Usage

1. Click "Create one" on the login page to register
2. Fill in your details (username, email, password)
3. After registration, login with your credentials
4. Start creating habits by clicking "New Habit"
5. Click on the checkmark to mark habits as complete for today
6. Watch your streaks grow!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Habits
- `GET /api/habits/` - Get all user habits
- `GET /api/habits/{habit_id}` - Get specific habit
- `POST /api/habits/` - Create new habit
- `PUT /api/habits/{habit_id}` - Update habit
- `DELETE /api/habits/{habit_id}` - Delete habit

### Habit Logs
- `GET /api/habits/{habit_id}/logs` - Get habit logs
- `POST /api/habits/{habit_id}/logs` - Toggle habit completion
- `DELETE /api/habits/logs/{log_id}` - Delete habit log

### Progress
- `GET /api/progress/` - Get overall progress (daily, weekly, monthly)

## Features in Detail

### Habit Management
- Create habits with custom names, descriptions, icons, and colors
- Set target days per week
- Edit existing habits
- Archive or delete habits

### Daily Tracking
- One-click completion toggle
- Visual feedback for completed habits
- Tracks completion status for each day

### Streak Calculation
- **Current Streak**: Consecutive days from today backwards
- **Longest Streak**: Best streak ever achieved
- Streaks break if a day is missed

### Progress Analytics
- **Daily**: Shows today's completion status
- **Weekly**: Current week's progress with daily breakdown
- **Monthly**: Current month's progress with weekly breakdown
- All metrics calculated in real-time

### Security Features
- JWT token-based authentication
- Automatic token refresh
- Secure password hashing with bcrypt
- Protected API routes
- CORS configuration
- Token stored securely in localStorage

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique)
- username (Unique)
- hashed_password
- created_at

### Habits Table
- id (Primary Key)
- user_id (Foreign Key)
- name
- description
- color
- icon
- target_days
- is_active
- created_at

### Habit Logs Table
- id (Primary Key)
- habit_id (Foreign Key)
- date
- completed
- notes
- created_at

## Customization

### Colors
Edit `frontend/tailwind.config.js` to customize the color palette:
```javascript
colors: {
  primary: { /* your colors */ },
  calm: { /* your colors */ },
  success: { /* your colors */ }
}
```

### Icons
Add more icons in `frontend/src/components/HabitModal.jsx`:
```javascript
const icons = ['⭐', '🎯', '💪', /* add more */];
```

## Production Deployment

### Backend
1. Update `.env` with secure values
2. Use PostgreSQL instead of SQLite for production
3. Set up proper CORS origins
4. Use a production ASGI server (uvicorn with workers)
5. Set up HTTPS

### Frontend
1. Build the production bundle:
```powershell
npm run build
```
2. Deploy the `dist` folder to your hosting service
3. Update `VITE_API_URL` to your production API URL

## Troubleshooting

### Backend Issues
- **Module not found**: Ensure virtual environment is activated and dependencies are installed
- **Database errors**: Delete `habits.db` to reset the database
- **Port already in use**: Change port in `run.py`

### Frontend Issues
- **API connection failed**: Ensure backend is running on port 8000
- **Build errors**: Delete `node_modules` and run `npm install` again
- **Styles not loading**: Run `npm run dev` again

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, please check:
1. This README file
2. Backend API documentation at `/docs`
3. Check console logs for error messages

---

Built with ❤️ using FastAPI, React, and Tailwind CSS
