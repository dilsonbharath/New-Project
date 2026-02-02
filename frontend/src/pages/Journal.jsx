import { useState, useEffect } from 'react';
import { format, startOfWeek, startOfMonth, endOfMonth, startOfDay, parseISO, getDaysInMonth, isSameDay, lastDayOfMonth, isSameWeek } from 'date-fns';
import { BookOpen, Calendar, Save, ChevronLeft, ChevronRight, Star, Check, Book } from 'lucide-react';
import Navbar from '../components/Navbar';
import { journalService } from '../services/journalService';

const Journal = () => {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyEntry, setDailyEntry] = useState({ content: '', date: '' });
  const [weeklyEntry, setWeeklyEntry] = useState({ content: '', date: '' });
  const [monthlyEntry, setMonthlyEntry] = useState({ 
    content: '', 
    goal_text: '', 
    daily_progress: '{}',
    rating: null, 
    feedback: '', 
    date: '' 
  });
  const [dailyProgress, setDailyProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [entries, setEntries] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  // Parse daily progress from monthly entry
  useEffect(() => {
    if (activeTab === 'monthly' && monthlyEntry.daily_progress) {
      try {
        const parsed = JSON.parse(monthlyEntry.daily_progress);
        setDailyProgress(parsed || {});
      } catch {
        setDailyProgress({});
      }
    } else if (activeTab === 'monthly') {
      setDailyProgress({});
    }
  }, [activeTab, monthlyEntry.daily_progress]);

  useEffect(() => {
    loadRecentEntries();
  }, [activeTab, currentDate]);

  useEffect(() => {
    loadEntry();
  }, [currentDate]);

  const loadEntry = async () => {
    setLoading(true);
    try {
      let dateStr;
      if (activeTab === 'daily') {
        dateStr = format(currentDate, 'yyyy-MM-dd');
        const entry = await journalService.getEntryByDate(activeTab, dateStr);
        setDailyEntry({ content: entry.content || '', date: dateStr, id: entry.id });
      } else if (activeTab === 'weekly') {
        dateStr = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const entry = await journalService.getEntryByDate(activeTab, dateStr);
        setWeeklyEntry({ content: entry.content || '', date: dateStr, id: entry.id });
      } else {
        dateStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const entry = await journalService.getEntryByDate(activeTab, dateStr);
        setMonthlyEntry({ 
          content: entry.content || '', 
          goal_text: entry.goal_text || '', 
          daily_progress: entry.daily_progress || '{}',
          rating: entry.rating || null,
          feedback: entry.feedback || '',
          date: dateStr,
          id: entry.id
        });
      }
    } catch (error) {
      console.error('Failed to load entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEditablePeriod = () => {
    const today = new Date();
    if (activeTab === 'daily') {
      return isSameDay(currentDate, today);
    }
    if (activeTab === 'weekly') {
      return isSameWeek(currentDate, today, { weekStartsOn: 1 });
    }
    return (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth()
    );
  };

  const canEdit = isEditablePeriod();
  const gridCols = showRecent ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  const promptSets = {
    daily: [
      'One moment you’re grateful for today',
      'A small win that deserves a nod',
      'What should tomorrow’s you remember?'
    ],
    weekly: [
      'What pattern kept showing up?',
      'Where did you surprise yourself?',
      'What should you repeat or drop next week?'
    ],
    monthly: [
      'A theme for this month in one line',
      'Which habit moved the needle most?',
      'What will feel like progress by month-end?'
    ]
  };

  const loadRecentEntries = async () => {
    try {
      const data = await journalService.getEntries(activeTab, null, null);
      setEntries(data.slice(0, 10));
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      setSaveStatus('Edits allowed only for the current period');
      setTimeout(() => setSaveStatus(''), 2000);
      return;
    }
    setLoading(true);
    setSaveStatus('Saving...');
    
    try {
      let entryData;
      if (activeTab === 'daily') {
        entryData = {
          entry_type: 'daily',
          date: dailyEntry.date,
          content: dailyEntry.content
        };
      } else if (activeTab === 'weekly') {
        entryData = {
          entry_type: 'weekly',
          date: weeklyEntry.date,
          content: weeklyEntry.content
        };
      } else {
        entryData = {
          entry_type: 'monthly',
          date: monthlyEntry.date,
          content: monthlyEntry.content,
          goal_text: monthlyEntry.goal_text,
          daily_progress: JSON.stringify(dailyProgress),
          rating: monthlyEntry.rating,
          feedback: monthlyEntry.feedback
        };
      }

      await journalService.saveEntry(entryData);
      setSaveStatus('Saved ✓');
      loadRecentEntries();
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save entry:', error);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (activeTab === 'daily') {
      newDate.setDate(currentDate.getDate() + direction);
    } else if (activeTab === 'weekly') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(currentDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const getDateDisplay = () => {
    if (activeTab === 'daily') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (activeTab === 'weekly') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return `Week of ${format(weekStart, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  const getCurrentEntry = () => {
    if (activeTab === 'daily') return dailyEntry;
    if (activeTab === 'weekly') return weeklyEntry;
    return monthlyEntry;
  };

  const setCurrentEntry = (field, value) => {
    if (activeTab === 'daily') {
      setDailyEntry(prev => ({ ...prev, [field]: value }));
    } else if (activeTab === 'weekly') {
      setWeeklyEntry(prev => ({ ...prev, [field]: value }));
    } else {
      setMonthlyEntry(prev => ({ ...prev, [field]: value }));
    }
  };

  const loadHistoricalEntry = async (entry) => {
    setCurrentDate(parseISO(entry.date));
    setActiveTab(entry.entry_type);
  };

  const toggleDayProgress = (day) => {
    const today = new Date();
    const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // Only allow toggling for today's date
    if (!isSameDay(currentMonthDate, today)) {
      return; // Don't allow checking past or future dates
    }
    
    setDailyProgress(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const isLastDayOfMonth = () => {
    const lastDay = lastDayOfMonth(currentDate);
    return isSameDay(currentDate, lastDay);
  };

  const StarRating = ({ value, onChange }) => {
    return (
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl journal-hero p-5 sm:p-6 mb-5 sm:mb-7">
          <div className="absolute inset-0 journal-dots opacity-30"></div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-primary-100">
                  <BookOpen className="w-5 h-5 text-primary-700" />
                </div>
                <div className="journal-chip px-3 py-1 rounded-full text-xs font-semibold">Your story, one entry at a time</div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-primary-900 leading-tight">Journal</h1>
              <p className="text-sm sm:text-base text-neutral-700 max-w-2xl">
                Capture what mattered today, reflect on this week, and celebrate the month. Entries outside the current period stay read-only to keep you present.
              </p>
              <div className="flex items-center space-x-2 text-sm text-primary-800">
                <Calendar className="w-4 h-4" />
                <span>Now viewing: {getDateDisplay()}</span>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end space-y-3 self-start md:self-center">
              <div className="pill-bar rounded-full p-1 sm:p-1.5 shadow-sm">
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium touch-manipulation pill-button ${
                      activeTab === 'daily' ? 'pill-button-active' : ''
                    }`}
                  >
                    <span className="hidden sm:inline">Daily Note</span>
                    <span className="sm:hidden">Daily</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium touch-manipulation pill-button ${
                      activeTab === 'weekly' ? 'pill-button-active' : ''
                    }`}
                  >
                    <span className="hidden sm:inline">Weekly Note</span>
                    <span className="sm:hidden">Weekly</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium touch-manipulation pill-button ${
                      activeTab === 'monthly' ? 'pill-button-active' : ''
                    }`}
                  >
                    <span className="hidden sm:inline">Monthly Note</span>
                    <span className="sm:hidden">Monthly</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${gridCols} gap-4 sm:gap-6`}>
          {/* Main Journal Area */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Journal Entry Form */}
            <div className="orb-card relative p-4 sm:p-6 lg:p-7">
              <div className="absolute right-3 sm:right-5 top-3 sm:top-4 flex items-center gap-1 sm:gap-2 text-xs">
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-2 bg-white/70 hover:bg-white text-primary-800 rounded-full border border-primary-100 shadow-sm transition-colors touch-manipulation"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-primary-100 shadow-sm text-primary-900 font-semibold">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">{getDateDisplay()}</span>
                  <span className="sm:hidden text-xs">
                    {activeTab === 'daily' ? format(currentDate, 'MMM d') : 
                     activeTab === 'weekly' ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d') :
                     format(currentDate, 'MMM yyyy')}
                  </span>
                </div>
                <button
                  onClick={() => navigateDate(1)}
                  className="p-2 bg-white/70 hover:bg-white text-primary-800 rounded-full border border-primary-100 shadow-sm transition-colors touch-manipulation"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="relative flex flex-col lg:flex-row gap-4 sm:gap-6 z-10">
                <div className="flex-1 space-y-4 sm:space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-primary-100 text-xs font-semibold text-primary-800 capitalize">{activeTab} track</span>
                        <label className="text-sm font-semibold text-neutral-800">
                          {activeTab === 'daily' ? 'Daily Notes' : 
                           activeTab === 'weekly' ? 'Weekly Reflections' : 
                           'Monthly Reflections'}
                        </label>
                      </div>
                      <span className="text-xs text-primary-700 font-semibold">{canEdit ? 'Editable now' : 'View only'}</span>
                    </div>
                    <textarea
                      value={getCurrentEntry().content}
                      onChange={(e) => setCurrentEntry('content', e.target.value)}
                      placeholder={
                        activeTab === 'daily' ? 'How was your day? What did you learn?' :
                        activeTab === 'weekly' ? 'Reflect on your week...' :
                        'Reflect on your month...'
                      }
                      disabled={!canEdit}
                      className={`w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base rounded-3xl bg-white/85 border border-primary-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none shadow-md ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      rows="10"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs sm:text-sm text-neutral-600">
                      {saveStatus || (canEdit ? 'Click Save to store your changes' : 'Locked: only editable for current day/week/month')}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSave}
                        disabled={loading || !canEdit}
                        className="flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base touch-manipulation"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setShowRecent(!showRecent)}
                        className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white border border-primary-100 shadow-sm hover:shadow-md transition"
                      >
                        <Book className="w-5 h-5 text-primary-700" />
                        <span className="text-sm font-semibold text-primary-800">Journal Library</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-72">
                  <div className="bubble-card p-3 sm:p-4 mt-8 sm:mt-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 border border-primary-200 capitalize">{activeTab}</span>
                      <span className="text-[11px] font-semibold text-primary-700">{canEdit ? 'Live' : 'Locked'}</span>
                    </div>
                    <p className="text-sm font-semibold text-neutral-800 mb-2">Need a spark?</p>
                    <div className="space-y-2">
                      {promptSets[activeTab].map((prompt) => (
                        <div key={prompt} className="flex items-start space-x-2 text-sm text-neutral-700">
                          <Check className="w-4 h-4 text-primary-600 mt-0.5" />
                          <span>{prompt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Entries Sidebar */}
          {showRecent && (
            <div className="lg:col-span-1">
              <div className="bubble-card p-4 sm:p-5 sticky top-20">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg font-semibold text-neutral-800">Journal Library</h3>
                  <button
                    onClick={() => setShowRecent(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    Hide
                  </button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {entries.length === 0 ? (
                    <p className="text-sm text-neutral-600 text-center py-8">
                      No entries yet. Start writing!
                    </p>
                  ) : (
                    entries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => loadHistoricalEntry(entry)}
                        className="w-full text-left p-3 hover:bg-neutral-100 active:bg-neutral-200 rounded-2xl transition-colors border border-neutral-200 touch-manipulation surface-plain"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-700 border border-primary-200">
                            {entry.entry_type}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {format(parseISO(entry.date), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 line-clamp-2">
                          {entry.content || entry.goals || 'No content'}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Journal;
