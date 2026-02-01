import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import { CheckCircle, User, Calendar, Flame, Trophy, Target } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkIns, setCheckIns] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    currentStreak: 0,
    longestStreak: 0,
    thisMonthCheckIns: 0
  });

  useEffect(() => {
    fetchCheckIns();
  }, [currentDate]);

  const fetchCheckIns = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual API
      const mockCheckIns = [
        '2026-02-01',
        '2026-01-31',
        '2026-01-30',
        '2026-01-29',
        '2026-01-28',
        '2026-01-25',
        '2026-01-24',
        '2026-01-23'
      ];
      
      setCheckIns(new Set(mockCheckIns));
      
      // Calculate stats
      const today = format(new Date(), 'yyyy-MM-dd');
      const thisMonth = format(currentDate, 'yyyy-MM');
      const thisMonthCount = mockCheckIns.filter(date => date.startsWith(thisMonth)).length;
      
      setStats({
        totalCheckIns: mockCheckIns.length,
        currentStreak: 4, // Mock current streak
        longestStreak: 7, // Mock longest streak
        thisMonthCheckIns: thisMonthCount
      });
    } catch (error) {
      console.error('Failed to fetch check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 }); // Start week on Monday
    const endWeek = endOfWeek(end, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startWeek, end: endWeek });
  };

  const isDayCheckedIn = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkIns.has(dateStr);
  };

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isCurrentMonth = format(date, 'MM') === format(currentDate, 'MM');
    const isCheckedIn = checkIns.has(dateStr);
    const isTodayDate = isToday(date);
    const isPastDate = isBefore(date, new Date()) && !isTodayDate;

    if (!isCurrentMonth) return 'text-gray-300 bg-gray-50';
    if (isTodayDate && isCheckedIn) return 'bg-green-500 text-white font-bold border-2 border-green-600';
    if (isTodayDate) return 'bg-blue-100 text-blue-700 font-bold border-2 border-blue-300';
    if (isCheckedIn) return 'bg-green-500 text-white';
    if (isPastDate) return 'bg-red-50 text-red-300';
    return 'text-gray-600 hover:bg-gray-100';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.username}!</h1>
                <p className="text-gray-600">Track your daily check-ins and build consistency</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Check-ins</h3>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCheckIns}</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Current Streak</h3>
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.currentStreak} days</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Longest Streak</h3>
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.longestStreak} days</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">This Month</h3>
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.thisMonthCheckIns} days</p>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-indigo-600" />
                Daily Check-in Calendar
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold text-gray-700 min-w-[150px] text-center">
                  {format(currentDate, 'MMMM yyyy')}
                </h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  →
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center space-x-6 mb-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Checked In</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-50 rounded"></div>
                <span>Missed</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {getDaysInMonth().map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const dayStatus = getDayStatus(date);
                const isCheckedIn = isDayCheckedIn(date);
                
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-default relative ${dayStatus}`}
                  >
                    <span>{format(date, 'd')}</span>
                    {isCheckedIn && (
                      <CheckCircle className="w-3 h-3 text-white absolute top-0.5 right-0.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today's Status */}
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Today's Check-in</h3>
                  <p className="text-gray-600">
                    {isDayCheckedIn(new Date()) 
                      ? '✅ You\'re checked in for today! Keep the streak going!' 
                      : '⏰ You\'re logged in right now - check-in recorded!'
                    }
                  </p>
                </div>
                <div className="text-4xl">
                  {isDayCheckedIn(new Date()) ? '🎉' : '💪'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;