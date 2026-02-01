import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [habitsData, progressData] = await Promise.all([
        habitService.getHabits(),
        progressService.getOverallProgress()
      ]);
      
      setHabits(habitsData);
      setProgress(progressData);
      
      // Fetch today's logs for all habits
      const logsPromises = habitsData.map(habit =>
        habitService.getHabitLogs(habit.id, today, today)
          .then(logs => ({
            habitId: habit.id,
            completed: logs.some(log => log.completed)
          }))
      );
      
      const logsData = await Promise.all(logsPromises);
      const logsMap = {};
      logsData.forEach(({ habitId, completed }) => {
        logsMap[habitId] = completed;
      });
      
      setTodayLogs(logsMap);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (habitData) => {
    try {
      await habitService.createHabit(habitData);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create habit:', error);
    }
  };

  const handleUpdateHabit = async (habitData) => {
    try {
      await habitService.updateHabit(editingHabit.id, habitData);
      setIsModalOpen(false);
      setEditingHabit(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      try {
        await habitService.deleteHabit(habitId);
        fetchData();
      } catch (error) {
        console.error('Failed to delete habit:', error);
      }
    }
  };

  const handleToggleHabit = async (habitId) => {
    try {
      await habitService.toggleHabitLog(habitId, today);
      fetchData();
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  const handleEditClick = (habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading your habits...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">
              Today's Progress
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              <span className="hidden sm:inline">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
              <span className="sm:hidden">{format(new Date(), 'MMM d, yyyy')}</span>
            </p>
          </div>
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 surface-card-soft rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-primary-50">Stats</span>
            {showProgress ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress Cards */}
        {progress && showProgress && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <ProgressCard
              title="Today's Completion"
              value={progress.daily.completed_habits}
              total={progress.daily.total_habits}
              percentage={progress.daily.completion_rate}
              icon="📅"
              color="primary"
            />
            <ProgressCard
              title="This Week"
              value={progress.weekly.actual_completions}
              total={progress.weekly.total_possible_completions}
              percentage={progress.weekly.completion_rate}
              icon="📊"
              color="primary"
            />
            <ProgressCard
              title="This Month"
              value={progress.monthly.actual_completions}
              total={progress.monthly.total_possible_completions}
              percentage={progress.monthly.completion_rate}
              icon="🎯"
              color="primary"
            />
          </div>
        )}

        {/* Habits Section */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">Your Habits</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-card text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Habit</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Habits List */}
        {habits.length === 0 ? (
          <div className="surface-card rounded-xl p-12 text-center">
            <span className="text-6xl mb-4 block">🌱</span>
            <h3 className="text-xl font-semibold text-primary-50 mb-2">
              No habits yet
            </h3>
            <p className="text-primary-100/90 mb-6">
              Start building better habits today!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Create Your First Habit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={todayLogs[habit.id] || false}
                onToggle={() => handleToggleHabit(habit.id)}
                onEdit={() => handleEditClick(habit)}
                onDelete={() => handleDeleteHabit(habit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
        habit={editingHabit}
      />
    </div>
  );
};

export default Dashboard;
