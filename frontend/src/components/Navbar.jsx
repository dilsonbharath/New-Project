import { LogOut, User, BookOpen, LayoutDashboard, Target, Calendar, ChevronDown, ChevronLeft, ChevronRight, CheckCircle, Flame, Trophy, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import { checkinService } from '../services/checkinService';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkins, setCheckins] = useState(new Set());
  const [stats, setStats] = useState({
    totalCheckins: 0,
    currentStreak: 0,
    longestStreak: 0,
    thisMonthCheckins: 0
  });
  const [loading, setLoading] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Record check-in and load data when component mounts
  useEffect(() => {
    if (user) {
      recordTodayCheckin();
      loadCheckinData();
    }
  }, [user]);

  const recordTodayCheckin = async () => {
    try {
      await checkinService.recordCheckin();
    } catch (error) {
      console.error('Failed to record check-in:', error);
    }
  };

  const loadCheckinData = async () => {
    try {
      setLoading(true);
      const [monthlyData, statsData] = await Promise.all([
        checkinService.getMonthlyCheckins(currentDate.getFullYear(), currentDate.getMonth() + 1),
        checkinService.getStats()
      ]);
      
      setCheckins(new Set(monthlyData.checkins));
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load check-in data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = async (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
    
    try {
      const monthlyData = await checkinService.getMonthlyCheckins(newDate.getFullYear(), newDate.getMonth() + 1);
      setCheckins(new Set(monthlyData.checkins));
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    const endWeek = endOfWeek(end, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startWeek, end: endWeek });
  };

  const isDayCheckedIn = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkins.has(dateStr);
  };

  const getDayStatus = (date) => {
    const isCurrentMonth = format(date, 'MM') === format(currentDate, 'MM');
    const isCheckedIn = isDayCheckedIn(date);
    const isTodayDate = isToday(date);
    const isPastDate = isBefore(date, new Date()) && !isTodayDate;

    if (!isCurrentMonth) return 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800';
    if (isTodayDate && isCheckedIn) return 'bg-green-500 text-white font-bold border-2 border-green-600';
    if (isTodayDate) return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border-2 border-blue-300 dark:border-blue-600';
    if (isCheckedIn) return 'bg-green-500 text-white';
    if (isPastDate) return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500';
    return 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700';
  };

  return (
    <nav className="surface-nav sticky top-0 z-40 text-primary-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <h1 className="text-base sm:text-xl font-bold text-primary-50 truncate">
                <span className="hidden sm:inline">YOU vs YOU</span>
                <span className="sm:hidden">YOU vs YOU</span>
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1 ml-4">
              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tracker</span>
              </button>
              <button
                onClick={() => navigate('/journal')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive('/journal')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Journal</span>
              </button>
              <button
                onClick={() => navigate('/new-skill')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive('/new-skill')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>New Skill</span>
              </button>
              <button
                onClick={() => navigate('/expenses')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive('/expenses')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
              >
                <PiggyBank className="w-4 h-4" />
                <span>Expenses</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-1">
              <button
                onClick={() => navigate('/dashboard')}
                className={`p-2 rounded-lg transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
                title="Tracker"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/journal')}
                className={`p-2 rounded-lg transition-colors ${
                  isActive('/journal')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
                title="Journal"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/new-skill')}
                className={`p-2 rounded-lg transition-colors ${
                  isActive('/new-skill')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
                title="New Skill"
              >
                <Target className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/expenses')}
                className={`p-2 rounded-lg transition-colors ${
                  isActive('/expenses')
                    ? 'bg-primary-800/70 text-primary-50'
                    : 'text-primary-100 hover:bg-primary-800/60'
                }`}
                title="Expenses"
              >
                <PiggyBank className="w-5 h-5" />
              </button>
            </div>

            <div className="hidden sm:flex items-center space-x-2 text-primary-50 relative">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="font-medium text-sm sm:text-base flex items-center space-x-1 hover:bg-primary-800/60 px-2 py-1 rounded-lg transition-colors"
              >
                <span>{user?.username}</span>
                <div className="flex items-center space-x-1 text-xs">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span>{stats.currentStreak}</span>
                </div>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute top-full right-0 mt-2 surface-card rounded-xl p-4 z-50 w-80">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center text-orange-400 mb-1">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-primary-50">{stats.currentStreak}</div>
                      <div className="text-xs text-primary-100/80">Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-yellow-400 mb-1">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-primary-50">{stats.longestStreak}</div>
                      <div className="text-xs text-primary-100/80">Best</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-blue-300 mb-1">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-primary-50">{stats.thisMonthCheckins}</div>
                      <div className="text-xs text-primary-100/80">Month</div>
                    </div>
                  </div>
                  
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1 hover:bg-primary-800/60 rounded text-primary-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-semibold text-primary-50">
                      {format(currentDate, 'MMMM yyyy')}
                    </h3>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-primary-800/60 rounded text-primary-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-primary-100/80 py-1">
                        {day}
                      </div>
                    ))}
                    
                    {getDaysInMonth().map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayStatus = getDayStatus(date);
                      const isCheckedIn = isDayCheckedIn(date);
                      
                      return (
                        <div
                          key={dateStr}
                          className={`aspect-square rounded text-xs flex items-center justify-center relative ${dayStatus}`}
                        >
                          <span>{format(date, 'd')}</span>
                          {isCheckedIn && (
                            <CheckCircle className="w-2 h-2 text-white absolute top-0 right-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-between text-xs text-primary-100/80">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded"></div>
                      <span>Logged In</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-200 border border-blue-500 rounded"></div>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 text-primary-50 hover:bg-primary-800/60 rounded-lg transition-colors text-sm sm:text-base"
              title="Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
