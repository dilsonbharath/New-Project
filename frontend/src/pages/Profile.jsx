import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import { User, ChevronLeft, ChevronRight, Flame, Trophy, Calendar, Target } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkIns, setCheckIns] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCheckIns: 0, currentStreak: 0, longestStreak: 0, thisMonthCheckIns: 0 });

  useEffect(() => {
    const init = async () => {
      await recordTodayCheckIn();
      await fetchCheckIns();
      await fetchStats();
    };
    init();
  }, [currentDate]);

  const recordTodayCheckIn = async () => {
    try {
      const { checkinService } = await import('../services/checkinService');
      await checkinService.recordCheckin();
    } catch (error) { console.error('Failed to record check-in:', error); }
  };

  const fetchCheckIns = async () => {
    try {
      setLoading(true);
      const { checkinService } = await import('../services/checkinService');
      const response = await checkinService.getMonthlyCheckins(currentDate.getFullYear(), currentDate.getMonth() + 1);
      setCheckIns(new Set(response.checkins));
    } catch (error) { console.error('Failed to fetch check-ins:', error); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { checkinService } = await import('../services/checkinService');
      const statsData = await checkinService.getStats();
      setStats({ totalCheckIns: statsData.total_checkins, currentStreak: statsData.current_streak, longestStreak: statsData.longest_streak, thisMonthCheckIns: statsData.this_month_checkins });
    } catch (error) { console.error('Failed to fetch stats:', error); }
  };

  const navigateMonth = (dir) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(end, { weekStartsOn: 1 }) });
  };

  const isDayCheckedIn = (date) => checkIns.has(format(date, 'yyyy-MM-dd'));

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const statItems = [
    { label: 'Total Check-ins', value: stats.totalCheckIns, icon: Calendar, color: 'text-blue-500' },
    { label: 'Current Streak', value: `${stats.currentStreak}d`, icon: Flame, color: 'text-primary-500' },
    { label: 'Best Streak', value: `${stats.longestStreak}d`, icon: Trophy, color: 'text-amber-500' },
    { label: 'This Month', value: `${stats.thisMonthCheckIns}d`, icon: Target, color: 'text-green-500' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 className="section-header">{user?.username}</h2>
            <p className="text-sm text-neutral-400">Your consistency calendar</p>
          </div>
        </div>

        {/* Stats inline */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {statItems.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className="text-xl font-extrabold text-neutral-800">{value}</div>
              <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">{label}</div>
            </div>
          ))}
        </div>

        <hr className="divider mb-6" />

        {/* Calendar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-neutral-800">{format(currentDate, 'MMMM yyyy')}</h3>
          <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-neutral-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {getDaysInMonth().map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isCheckedIn = isDayCheckedIn(date);
            const isTodayDate = isToday(date);
            const isPastDate = isBefore(date, new Date()) && !isTodayDate;
            const isCurrentMonth = format(date, 'MM') === format(currentDate, 'MM');
            const shouldShow = isCurrentMonth && (isPastDate || isTodayDate);

            let cls = 'aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ';

            if (!isCurrentMonth) {
              cls += 'text-neutral-200';
            } else if (isTodayDate && isCheckedIn) {
              cls += 'bg-green-50 text-green-700 font-bold ring-2 ring-green-400';
            } else if (isTodayDate) {
              cls += 'bg-primary-50 text-primary-600 font-bold ring-2 ring-primary-400';
            } else if (shouldShow && isCheckedIn) {
              cls += 'bg-green-50 text-green-600 ring-1 ring-green-300';
            } else if (shouldShow && !isCheckedIn) {
              cls += 'bg-rose-50 text-rose-300 ring-1 ring-rose-200';
            } else {
              cls += 'text-neutral-500';
            }

            return <div key={dateStr} className={cls}>{format(date, 'd')}</div>;
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 mb-6">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-50 ring-1 ring-green-300"></div>
            <span>Logged In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-50 ring-1 ring-rose-200"></div>
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary-50 ring-2 ring-primary-400"></div>
            <span>Today</span>
          </div>
        </div>

        {/* Today status */}
        <div className="p-4 bg-neutral-50/70 rounded-2xl text-center">
          <p className="text-sm text-neutral-600">
            {isDayCheckedIn(new Date())
              ? '✅ You\'re checked in today! Keep the streak alive.'
              : '💪 Visit daily to build your streak!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;