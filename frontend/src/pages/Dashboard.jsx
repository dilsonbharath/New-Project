import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import HabitCard from '../components/HabitCard';
import HabitModal from '../components/HabitModal';
import ProgressCard from '../components/ProgressCard';
import { habitService } from '../services/habitService';
import { progressService } from '../services/progressService';

const Dashboard = () => {
  const [habits, setHabits] = useState([]);
  const [progress, setProgress] = useState(null);
  const [todayLogs, setTodayLogs] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [habitsData, progressData] = await Promise.all([
        habitService.getHabits(),
        progressService.getOverallProgress()
      ]);
      setHabits(habitsData);
      setProgress(progressData);

      const logsPromises = habitsData.map(habit =>
        habitService.getHabitLogs(habit.id, today, today)
          .then(logs => ({ habitId: habit.id, completed: logs.some(log => log.completed) }))
      );
      const logsData = await Promise.all(logsPromises);
      const logsMap = {};
      logsData.forEach(({ habitId, completed }) => { logsMap[habitId] = completed; });
      setTodayLogs(logsMap);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (habitData) => {
    try { await habitService.createHabit(habitData); setIsModalOpen(false); fetchData(); } catch (e) { console.error(e); }
  };

  const handleUpdateHabit = async (habitData) => {
    try { await habitService.updateHabit(editingHabit.id, habitData); setIsModalOpen(false); setEditingHabit(null); fetchData(); } catch (e) { console.error(e); }
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm('Delete this habit?')) {
      try { await habitService.deleteHabit(habitId); fetchData(); } catch (e) { console.error(e); }
    }
  };

  const handleToggleHabit = async (habitId) => {
    try { await habitService.toggleHabitLog(habitId, today); fetchData(); } catch (e) { console.error(e); }
  };

  const handleEditClick = (habit) => { setEditingHabit(habit); setIsModalOpen(true); };

  const completedCount = Object.values(todayLogs).filter(Boolean).length;
  const totalCount = habits.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-neutral-400 text-sm">Loading your habits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="section-header">Today's Progress</h2>
              <p className="text-sm text-neutral-400 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-neutral-800">{completionPct}%</div>
              <div className="text-xs text-neutral-400">{completedCount}/{totalCount} done</div>
            </div>
          </div>

          {/* Thin progress bar */}
          <div className="progress-track mt-3" style={{ height: '4px' }}>
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        {/* Stats toggle */}
        {progress && (
          <div className="mb-6">
            <button
              onClick={() => setShowProgress(!showProgress)}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Detailed stats</span>
              {showProgress ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showProgress && (
              <div className="mt-4 grid sm:grid-cols-3 gap-4 p-4 bg-neutral-50/70 rounded-2xl">
                <ProgressCard
                  title="Today" value={progress.daily.completed_habits}
                  total={progress.daily.total_habits} percentage={progress.daily.completion_rate}
                  icon="📅" color="primary"
                />
                <ProgressCard
                  title="This Week" value={progress.weekly.actual_completions}
                  total={progress.weekly.total_possible_completions} percentage={progress.weekly.completion_rate}
                  icon="📊" color="primary"
                />
                <ProgressCard
                  title="This Month" value={progress.monthly.actual_completions}
                  total={progress.monthly.total_possible_completions} percentage={progress.monthly.completion_rate}
                  icon="🎯" color="primary"
                />
              </div>
            )}
          </div>
        )}

        {/* Habits */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-800">Your Habits</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Habit</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">🌱</span>
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">No habits yet</h3>
            <p className="text-neutral-400 text-sm mb-6">Start building better habits today</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              Create Your First Habit
            </button>
          </div>
        ) : (
          <div>
            {habits.map(habit => (
              <HabitCard
                key={habit.id} habit={habit}
                isCompleted={todayLogs[habit.id] || false}
                onToggle={() => handleToggleHabit(habit.id)}
                onEdit={() => handleEditClick(habit)}
                onDelete={() => handleDeleteHabit(habit.id)}
              />
            ))}
          </div>
        )}
      </div>

      <HabitModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingHabit(null); }}
        onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
        habit={editingHabit}
      />
    </div>
  );
};

export default Dashboard;
