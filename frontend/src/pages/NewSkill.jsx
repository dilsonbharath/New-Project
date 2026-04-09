import { useState, useEffect } from 'react';
import { format, startOfMonth, getDaysInMonth, isSameDay, lastDayOfMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Star, Save, Calendar as CalendarIcon } from 'lucide-react';
import Navbar from '../components/Navbar';
import { journalService } from '../services/journalService';

const NewSkill = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [skillEntry, setSkillEntry] = useState({ goal_text: '', daily_progress: '{}', rating: null, feedback: '', date: '', id: undefined });
  const [dailyProgress, setDailyProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showYearView, setShowYearView] = useState(false);
  const [yearlySkills, setYearlySkills] = useState([]);

  useEffect(() => {
    if (skillEntry.daily_progress) {
      try { setDailyProgress(JSON.parse(skillEntry.daily_progress) || {}); } catch { setDailyProgress({}); }
    } else { setDailyProgress({}); }
  }, [skillEntry.daily_progress]);

  useEffect(() => { loadSkillEntry(); }, [currentDate]);
  useEffect(() => { loadYearlySkills(); }, []);

  const loadSkillEntry = async () => {
    setLoading(true);
    try {
      const dateStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const entry = await journalService.getEntryByDate('monthly', dateStr);
      setSkillEntry({ goal_text: entry.goal_text || '', daily_progress: entry.daily_progress || '{}', rating: entry.rating || null, feedback: entry.feedback || '', date: dateStr, id: entry.id });
    } catch (error) { console.error('Failed to load skill entry:', error); }
    finally { setLoading(false); }
  };

  const loadYearlySkills = async () => {
    try {
      const data = await journalService.getEntries('monthly', null, null);
      setYearlySkills(data);
    } catch (error) { console.error('Failed to load yearly skills:', error); }
  };

  const handleSave = async () => {
    setLoading(true); setSaveStatus('Saving...');
    try {
      await journalService.saveEntry({ entry_type: 'monthly', date: skillEntry.date, content: '', goal_text: skillEntry.goal_text, daily_progress: JSON.stringify(dailyProgress), rating: skillEntry.rating, feedback: skillEntry.feedback });
      setSaveStatus('Saved ✓'); loadYearlySkills();
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) { setSaveStatus('Failed to save'); setTimeout(() => setSaveStatus(''), 2000); }
    finally { setLoading(false); }
  };

  const navigateMonth = (dir) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const toggleDayProgress = (day) => {
    const today = new Date();
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!isSameDay(d, today)) return;
    setDailyProgress(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const isLastDay = () => isSameDay(currentDate, lastDayOfMonth(currentDate));

  const getCompletedDays = (progressStr) => {
    try { return Object.values(JSON.parse(progressStr || '{}')).filter(Boolean).length; } catch { return 0; }
  };

  const completedCount = Object.values(dailyProgress).filter(Boolean).length;
  const daysInMonth = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="section-header mb-1">New Skill</h2>
            <p className="text-sm text-neutral-400">Master one skill per month — 12 skills per year</p>
          </div>
          <button
            onClick={() => setShowYearView(!showYearView)}
            className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {showYearView ? 'Monthly' : 'Year View'}
          </button>
        </div>

        {!showYearView ? (
          <div className="space-y-6">
            {/* Month's skill */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">This month's skill 🎯</label>
              <input
                type="text" value={skillEntry.goal_text}
                onChange={(e) => setSkillEntry(prev => ({ ...prev, goal_text: e.target.value }))}
                placeholder="e.g. Learn Python, Master Guitar, Read 5 Books"
                className="input-clean"
              />
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-neutral-800">{format(currentDate, 'MMMM yyyy')}</span>
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Progress grid */}
            <div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const today = new Date();
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isTodayDate = isSameDay(dayDate, today);
                  const planted = !!dailyProgress[day];

                  let cls = 'skill-day ';
                  if (planted) cls += 'skill-day-done ';
                  else if (isTodayDate) cls += 'skill-day-today ';
                  else if (dayDate < today) cls += 'skill-day-empty ';
                  else cls += 'skill-day-empty skill-day-locked ';

                  if (isTodayDate) cls += 'skill-day-active ';

                  return (
                    <button key={day} onClick={() => toggleDayProgress(day)} disabled={!isTodayDate}
                      className={cls} aria-label={`Day ${day}`}
                    >
                      {planted ? '✓' : day}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-400 mt-3">
                {completedCount} / {daysInMonth} days completed · Only today is editable
              </p>
            </div>

            {/* Rating + Feedback (last day) */}
            {isLastDay() && (
              <div className="space-y-4 p-5 bg-neutral-50/70 rounded-2xl">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-2">Rate this month</label>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setSkillEntry(prev => ({ ...prev, rating: s }))}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`w-7 h-7 ${s <= (skillEntry.rating || 0) ? 'fill-primary-400 text-primary-400' : 'text-neutral-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1.5">Month-end reflection</label>
                  <textarea
                    value={skillEntry.feedback}
                    onChange={(e) => setSkillEntry(prev => ({ ...prev, feedback: e.target.value }))}
                    className="input-clean rounded-xl resize-none" rows="3"
                    placeholder="How did this month go? What did you achieve?"
                  />
                </div>
              </div>
            )}

            {/* Save */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{saveStatus}</span>
              <button onClick={handleSave} disabled={loading}
                className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        ) : (
          /* Year view */
          <div className="space-y-3">
            {yearlySkills.length === 0 ? (
              <p className="text-center text-neutral-400 py-12">No skills tracked yet. Start your first challenge!</p>
            ) : (
              yearlySkills.map(skill => (
                <div key={skill.id} className="flex items-center gap-4 py-4 border-b border-neutral-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-primary-500">{format(parseISO(skill.date), 'MMM yyyy')}</span>
                      {skill.rating && (
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= skill.rating ? 'fill-primary-400 text-primary-400' : 'text-neutral-200'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="font-medium text-neutral-800 text-sm">{skill.goal_text || 'No skill set'}</p>
                    {skill.feedback && <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{skill.feedback}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-neutral-800">{getCompletedDays(skill.daily_progress)}</div>
                    <div className="text-xs text-neutral-400">days</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewSkill;
