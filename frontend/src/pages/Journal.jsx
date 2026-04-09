import { useState, useEffect } from 'react';
import { format, startOfWeek, startOfMonth, parseISO, isSameDay, lastDayOfMonth, isSameWeek } from 'date-fns';
import { Save, ChevronLeft, ChevronRight, Star, BookOpen } from 'lucide-react';
import Navbar from '../components/Navbar';
import { journalService } from '../services/journalService';

const Journal = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyEntry, setDailyEntry] = useState({ content: '', date: '' });
  const [weeklyEntry, setWeeklyEntry] = useState({ content: '', date: '' });
  const [monthlyEntry, setMonthlyEntry] = useState({ content: '', goal_text: '', daily_progress: '{}', rating: null, feedback: '', date: '' });
  const [dailyProgress, setDailyProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [entries, setEntries] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    if (activeTab === 'monthly' && monthlyEntry.daily_progress) {
      try { setDailyProgress(JSON.parse(monthlyEntry.daily_progress) || {}); } catch { setDailyProgress({}); }
    } else if (activeTab === 'monthly') { setDailyProgress({}); }
  }, [activeTab, monthlyEntry.daily_progress]);

  useEffect(() => { loadRecentEntries(); }, [activeTab, currentDate]);
  useEffect(() => { loadEntry(); }, [currentDate, activeTab]);

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
        setMonthlyEntry({ content: entry.content || '', goal_text: entry.goal_text || '', daily_progress: entry.daily_progress || '{}', rating: entry.rating || null, feedback: entry.feedback || '', date: dateStr, id: entry.id });
      }
    } catch (error) { console.error('Failed to load entry:', error); }
    finally { setLoading(false); }
  };

  const isEditablePeriod = () => {
    const today = new Date();
    if (activeTab === 'daily') return isSameDay(currentDate, today);
    if (activeTab === 'weekly') return isSameWeek(currentDate, today, { weekStartsOn: 1 });
    return currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();
  };

  const canEdit = isEditablePeriod();

  const loadRecentEntries = async () => {
    try {
      const data = await journalService.getEntries(activeTab, null, null);
      setEntries(data.slice(0, 10));
    } catch (error) { console.error('Failed to load entries:', error); }
  };

  const handleSave = async () => {
    if (!canEdit) { setSaveStatus('Only editable for current period'); setTimeout(() => setSaveStatus(''), 2000); return; }
    setLoading(true); setSaveStatus('Saving...');
    try {
      let entryData;
      if (activeTab === 'daily') { entryData = { entry_type: 'daily', date: dailyEntry.date, content: dailyEntry.content }; }
      else if (activeTab === 'weekly') { entryData = { entry_type: 'weekly', date: weeklyEntry.date, content: weeklyEntry.content }; }
      else { entryData = { entry_type: 'monthly', date: monthlyEntry.date, content: monthlyEntry.content, goal_text: monthlyEntry.goal_text, daily_progress: JSON.stringify(dailyProgress), rating: monthlyEntry.rating, feedback: monthlyEntry.feedback }; }
      await journalService.saveEntry(entryData);
      setSaveStatus('Saved ✓'); loadRecentEntries();
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) { setSaveStatus('Failed to save'); setTimeout(() => setSaveStatus(''), 2000); }
    finally { setLoading(false); }
  };

  const navigateDate = (dir) => {
    const d = new Date(currentDate);
    if (activeTab === 'daily') d.setDate(d.getDate() + dir);
    else if (activeTab === 'weekly') d.setDate(d.getDate() + (dir * 7));
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getDateDisplay = () => {
    if (activeTab === 'daily') return format(currentDate, 'EEEE, MMMM d');
    if (activeTab === 'weekly') return `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;
    return format(currentDate, 'MMMM yyyy');
  };

  const getCurrentEntry = () => {
    if (activeTab === 'daily') return dailyEntry;
    if (activeTab === 'weekly') return weeklyEntry;
    return monthlyEntry;
  };

  const setCurrentEntry = (field, value) => {
    if (activeTab === 'daily') setDailyEntry(prev => ({ ...prev, [field]: value }));
    else if (activeTab === 'weekly') setWeeklyEntry(prev => ({ ...prev, [field]: value }));
    else setMonthlyEntry(prev => ({ ...prev, [field]: value }));
  };

  const toggleDayProgress = (day) => {
    const today = new Date();
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!isSameDay(d, today)) return;
    setDailyProgress(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const prompts = {
    daily: ['What moved you forward today?', 'One small win worth noting', 'What will tomorrow\'s you remember?'],
    weekly: ['What pattern kept showing up?', 'Where did you surprise yourself?', 'What to repeat or drop?'],
    monthly: ['A theme for this month in one line', 'Which habit moved the needle most?', 'What feels like progress?']
  };

  const tabs = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="section-header mb-1">Journal</h2>
          <p className="text-sm text-neutral-400">Capture, reflect, grow</p>
        </div>

        {/* Tabs */}
        <div className="tab-bar mb-6 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-item ${activeTab === t.key ? 'tab-item-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-neutral-800">{getDateDisplay()}</div>
            <div className="text-xs text-neutral-400 mt-0.5">{canEdit ? 'Editable' : 'Read only'}</div>
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Writing area */}
        <div className="mb-6">
          <textarea
            value={getCurrentEntry().content}
            onChange={(e) => setCurrentEntry('content', e.target.value)}
            placeholder={activeTab === 'daily' ? 'How was your day?' : activeTab === 'weekly' ? 'Reflect on your week...' : 'Reflect on your month...'}
            disabled={!canEdit}
            className={`w-full input-clean rounded-2xl resize-none text-[15px] leading-relaxed ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            rows="8"
            style={{ minHeight: '200px' }}
          />
        </div>

        {/* Monthly extras */}
        {activeTab === 'monthly' && (
          <div className="space-y-6 mb-6">
            {/* Skill Goal */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">Monthly Skill Goal</label>
              <input
                type="text" value={monthlyEntry.goal_text}
                onChange={(e) => setCurrentEntry('goal_text', e.target.value)}
                disabled={!canEdit} className={`input-clean ${!canEdit ? 'opacity-50' : ''}`}
                placeholder="e.g. Learn spoken English basics"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">Rate this month</label>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => canEdit && setCurrentEntry('rating', s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`w-7 h-7 ${s <= (monthlyEntry.rating || 0) ? 'fill-primary-400 text-primary-400' : 'text-neutral-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">Month-end feedback</label>
              <textarea
                value={monthlyEntry.feedback}
                onChange={(e) => setCurrentEntry('feedback', e.target.value)}
                disabled={!canEdit} className={`input-clean rounded-xl resize-none ${!canEdit ? 'opacity-50' : ''}`}
                rows="3" placeholder="What improved? What to carry forward?"
              />
            </div>
          </div>
        )}

        {/* Save + Library toggle */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs text-neutral-400">{saveStatus}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLibrary(!showLibrary)}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Library
            </button>
            <button onClick={handleSave} disabled={loading || !canEdit}
              className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>

        {/* Prompts */}
        <div className="p-4 bg-neutral-50/70 rounded-2xl mb-6">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Writing prompts</p>
          <div className="space-y-2">
            {prompts[activeTab].map((p, i) => (
              <p key={i} className="text-sm text-neutral-500 flex items-start gap-2">
                <span className="text-primary-400 mt-0.5">→</span> {p}
              </p>
            ))}
          </div>
        </div>

        {/* Library */}
        {showLibrary && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-neutral-800 mb-4">Journal Library</h3>
            {entries.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">No entries yet</p>
            ) : (
              <div className="space-y-2">
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => { setCurrentDate(parseISO(entry.date)); setActiveTab(entry.entry_type); }}
                    className="w-full text-left p-4 hover:bg-neutral-50 rounded-xl transition-colors border border-neutral-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary-500 capitalize">{entry.entry_type}</span>
                      <span className="text-xs text-neutral-400">{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm text-neutral-600 line-clamp-2">{entry.content || 'No content'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Journal;
