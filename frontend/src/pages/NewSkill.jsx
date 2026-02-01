import { useState, useEffect } from 'react';
import { format, startOfMonth, getDaysInMonth, isSameDay, lastDayOfMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Star, Save, Calendar as CalendarIcon, Sprout } from 'lucide-react';
import Navbar from '../components/Navbar';
import { journalService } from '../services/journalService';

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-2">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="focus:outline-none transition-transform hover:scale-110"
      >
        <Star
          className={`w-8 h-8 ${
            star <= (value || 0) ? 'fill-primary-500 text-primary-500' : 'text-neutral-300'
          }`}
        />
      </button>
    ))}
  </div>
);

const NewSkill = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [skillEntry, setSkillEntry] = useState({
    goal_text: '',
    daily_progress: '{}',
    rating: null,
    feedback: '',
    date: '',
    id: undefined,
  });
  const [dailyProgress, setDailyProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showYearView, setShowYearView] = useState(false);
  const [yearlySkills, setYearlySkills] = useState([]);

  // Parse daily progress into object
  useEffect(() => {
    if (skillEntry.daily_progress) {
      try {
        const parsed = JSON.parse(skillEntry.daily_progress);
        setDailyProgress(parsed || {});
      } catch {
        setDailyProgress({});
      }
    } else {
      setDailyProgress({});
    }
  }, [skillEntry.daily_progress]);

  useEffect(() => {
    loadSkillEntry();
  }, [currentDate]);

  useEffect(() => {
    loadYearlySkills();
  }, []);

  const loadSkillEntry = async () => {
    setLoading(true);
    try {
      const dateStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const entry = await journalService.getEntryByDate('monthly', dateStr);

      setSkillEntry({
        goal_text: entry.goal_text || '',
        daily_progress: entry.daily_progress || '{}',
        rating: entry.rating || null,
        feedback: entry.feedback || '',
        date: dateStr,
        id: entry.id,
      });
    } catch (error) {
      console.error('Failed to load skill entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYearlySkills = async () => {
    try {
      const data = await journalService.getEntries('monthly', null, null);
      setYearlySkills(data);
    } catch (error) {
      console.error('Failed to load yearly skills:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('Saving...');

    try {
      await journalService.saveEntry({
        entry_type: 'monthly',
        date: skillEntry.date,
        content: '',
        goal_text: skillEntry.goal_text,
        daily_progress: JSON.stringify(dailyProgress),
        rating: skillEntry.rating,
        feedback: skillEntry.feedback,
      });

      setSaveStatus('Saved ✓');
      loadYearlySkills();
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save skill:', error);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const toggleDayProgress = (day) => {
    const today = new Date();
    const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    // Only allow toggling for today
    if (!isSameDay(currentMonthDate, today)) return;

    setDailyProgress((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const isLastDayOfMonth = () => {
    const lastDay = lastDayOfMonth(currentDate);
    return isSameDay(currentDate, lastDay);
  };

  const getCompletedDays = (progressStr) => {
    try {
      const progress = JSON.parse(progressStr || '{}');
      return Object.values(progress).filter(Boolean).length;
    } catch {
      return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-900 mb-2">
                New Skill Challenge
              </h1>
              <p className="text-sm sm:text-base text-neutral-700">
                Master one new skill every month
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 flex-none">
              <label className="text-sm sm:text-base font-semibold text-neutral-700 whitespace-nowrap">
                This Month's Skill 🎯
              </label>
              <input
                type="text"
                value={skillEntry.goal_text}
                onChange={(e) => setSkillEntry((prev) => ({ ...prev, goal_text: e.target.value }))}
                placeholder="e.g., Learn Python, Master Guitar, Read 5 Books"
                className="w-48 sm:w-56 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={() => setShowYearView(!showYearView)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 surface-plain rounded-lg transition-colors border border-neutral-200"
            >
              <CalendarIcon className="w-4 h-4 text-primary-700" />
              <span className="text-sm font-medium text-neutral-800">
                {showYearView ? 'Monthly View' : 'Year View'}
              </span>
            </button>
          </div>
        </div>

        {!showYearView ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Main Skill Area */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Skill Entry Form */}
              <div className="bubble-skill rounded-lg p-4 sm:p-5 lg:p-6 relative space-y-4">
                <div className="space-y-4">
                  {/* Daily Progress Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-base sm:text-lg font-semibold text-neutral-700">
                        Daily Progress Garden
                      </label>
                      <div className="flex items-center gap-1.5 bg-white/80 border border-neutral-200 rounded-full px-2 py-1 shadow-sm text-[11px] sm:text-xs">
                        <button
                          onClick={() => navigateMonth(-1)}
                          className="p-1 hover:bg-neutral-100 active:bg-neutral-200 rounded-full transition-colors"
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-neutral-700" />
                        </button>
                        <span className="font-semibold text-neutral-800">
                          {format(currentDate, 'MMM yyyy')}
                        </span>
                        <button
                          onClick={() => navigateMonth(1)}
                          className="p-1 hover:bg-neutral-100 active:bg-neutral-200 rounded-full transition-colors"
                          aria-label="Next month"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-700" />
                        </button>
                      </div>
                    </div>
                    <div className="garden-bed grid grid-cols-7 gap-2 p-2 rounded-2xl">
                      {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1).map((day) => {
                        const today = new Date();
                        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const isToday = isSameDay(dayDate, today);
                        const planted = !!dailyProgress[day];

                        return (
                          <button
                            key={day}
                            onClick={() => toggleDayProgress(day)}
                            disabled={!isToday}
                            className={`garden-plot touch-manipulation ${planted ? 'garden-plot-planted' : ''} ${
                              isToday ? 'garden-plot-active' : 'garden-plot-locked'
                            }`}
                            aria-label={`Day ${day}`}
                          >
                            <span className="garden-day">{day}</span>
                            <div className="garden-seedling">
                              {planted ? (
                                <Sprout className="w-4 h-4 text-primary-600" />
                              ) : (
                                <span className="garden-seed" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                      You can only plant today. {Object.values(dailyProgress).filter(Boolean).length} / {getDaysInMonth(currentDate)} seedlings sprouted
                    </p>
                  </div>

                  {/* Rating and Feedback - Only show on last day of month */}
                  {isLastDayOfMonth() && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Rate This Month (1-5 Stars)
                        </label>
                        <StarRating
                          value={skillEntry.rating}
                          onChange={(rating) => setSkillEntry((prev) => ({ ...prev, rating }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Month-End Reflection
                        </label>
                        <textarea
                          value={skillEntry.feedback}
                          onChange={(e) => setSkillEntry((prev) => ({ ...prev, feedback: e.target.value }))}
                          placeholder="How did this month go? What did you achieve with your skill?"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                          rows="4"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs sm:text-sm text-neutral-600">
                      {saveStatus || 'Click Save to store your progress'}
                    </span>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Yearly View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {yearlySkills.map((skill) => (
              <div key={skill.id} className="surface-plain rounded-lg p-4 hover:shadow-soft transition-shadow">
                <div className="flex items-center justify-between mb-3 text-neutral-800">
                  <h3 className="font-semibold">
                    {format(parseISO(skill.date), 'MMMM yyyy')}
                  </h3>
                  {skill.rating && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= skill.rating ? 'fill-primary-500 text-primary-500' : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {skill.goal_text && (
                  <div className="mb-3">
                    <div className="text-xs text-neutral-600 mb-1">Skill</div>
                    <p className="text-sm font-medium text-neutral-800">{skill.goal_text}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Progress</span>
                  <span className="font-semibold text-primary-700">
                    {getCompletedDays(skill.daily_progress)} days
                  </span>
                </div>

                {skill.feedback && (
                  <div className="mt-3 pt-3 border-t border-neutral-200">
                    <p className="text-xs text-neutral-600 line-clamp-3">{skill.feedback}</p>
                  </div>
                )}
              </div>
            ))}

            {yearlySkills.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-neutral-600">No skills tracked yet. Start your first monthly challenge!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewSkill;
