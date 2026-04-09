import { LogOut, User, BookOpen, LayoutDashboard, Target, ChevronDown, ChevronLeft, ChevronRight, Flame, Trophy, Calendar, PiggyBank, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
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

  const isActive = (path) => location.pathname === path;

  const loadCheckinData = useCallback(async () => {
    try {
      const [monthlyData, statsData] = await Promise.all([
        checkinService.getMonthlyCheckins(currentDate.getFullYear(), currentDate.getMonth() + 1),
        checkinService.getStats()
      ]);
      setCheckins(new Set(monthlyData.checkins));
      setStats({
        totalCheckins: statsData.total_checkins || 0,
        currentStreak: statsData.current_streak || 0,
        longestStreak: statsData.longest_streak || 0,
        thisMonthCheckins: statsData.this_month_checkins || 0
      });
    } catch (error) {
      console.error('Failed to load check-in data:', error);
    }
  }, [currentDate]);

  useEffect(() => {
    if (user) loadCheckinData();
  }, [user, loadCheckinData]);

  useEffect(() => {
    if (showCalendar && user) loadCheckinData();
  }, [showCalendar, user, loadCheckinData]);

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

  const isDayCheckedIn = (date) => checkins.has(format(date, 'yyyy-MM-dd'));

  const navItems = [
    { path: '/dashboard', label: 'Tracker', icon: LayoutDashboard },
    { path: '/journal', label: 'Journal', icon: BookOpen },
    { path: '/new-skill', label: 'New Skill', icon: Target },
    { path: '/expenses', label: 'Expenses', icon: PiggyBank },
  ];

  return (
    <nav className="nav-bar sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Brand */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-lg font-extrabold tracking-tight text-neutral-900 hover:opacity-80 transition-opacity"
          >
            YOU vs YOU
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isActive(path) ? 'nav-link-active' : 'nav-link'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile Nav */}
            <div className="md:hidden flex items-center gap-0.5">
              {navItems.map(({ path, label, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive(path) ? 'text-primary-500' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>

            {/* User + Calendar */}
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary-500" />
                </div>
                <span className="hidden sm:inline font-medium text-neutral-700">{user?.username}</span>
                <div className="flex items-center gap-0.5 text-xs text-primary-500">
                  <Flame className="w-3 h-3" />
                  <span className="font-semibold">{stats.currentStreak}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute top-full right-0 mt-2 w-80 card-clean p-4 z-50 shadow-float animate-fade-in-up">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <Flame className="w-4 h-4 mx-auto mb-1 text-primary-500" />
                      <div className="text-sm font-bold text-neutral-800">{stats.currentStreak}</div>
                      <div className="text-xs text-neutral-400">Streak</div>
                    </div>
                    <div className="text-center">
                      <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                      <div className="text-sm font-bold text-neutral-800">{stats.longestStreak}</div>
                      <div className="text-xs text-neutral-400">Best</div>
                    </div>
                    <div className="text-center">
                      <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                      <div className="text-sm font-bold text-neutral-800">{stats.thisMonthCheckins}</div>
                      <div className="text-xs text-neutral-400">Month</div>
                    </div>
                  </div>

                  <hr className="divider mb-3" />

                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-neutral-100 rounded text-neutral-500">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-neutral-700">{format(currentDate, 'MMMM yyyy')}</span>
                    <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-neutral-100 rounded text-neutral-500">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-xs font-medium text-neutral-400 py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {getDaysInMonth().map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isCheckedIn = isDayCheckedIn(date);
                      const isTodayDate = isToday(date);
                      const isPastDate = isBefore(date, new Date());
                      const isCurrentMonth = format(date, 'MM') === format(currentDate, 'MM');
                      const shouldShow = isCurrentMonth && (isPastDate || isTodayDate);

                      let cls = 'aspect-square rounded-lg text-xs flex items-center justify-center font-medium ';
                      if (!isCurrentMonth) {
                        cls += 'text-neutral-200';
                      } else if (isTodayDate && isCheckedIn) {
                        cls += 'checkin-day-today bg-green-50 ring-2 ring-green-400';
                      } else if (isTodayDate) {
                        cls += 'checkin-day-today';
                      } else if (shouldShow && isCheckedIn) {
                        cls += 'checkin-day-logged';
                      } else if (shouldShow && !isCheckedIn) {
                        cls += 'checkin-day-missed';
                      } else {
                        cls += 'text-neutral-500';
                      }

                      return (
                        <div key={dateStr} className={cls}>
                          {format(date, 'd')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-400"></div>
                      <span>Logged In</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-pink-50 border-2 border-pink-200"></div>
                      <span>Missed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-primary-100 border-2 border-primary-400"></div>
                      <span>Today</span>
                    </div>
                  </div>

                  <hr className="divider my-3" />

                  {/* Profile + Logout */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigate('/profile'); setShowCalendar(false); }}
                      className="flex-1 text-sm font-medium text-neutral-600 hover:text-neutral-800 py-2 text-center rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={logout}
                      className="flex items-center justify-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
