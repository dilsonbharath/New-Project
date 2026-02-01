import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, PiggyBank, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import { expenseService } from '../services/expenseService';

const Expenses = () => {
  const [viewDate, setViewDate] = useState(new Date());
  const [budget, setBudget] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ amount: '', note: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);

  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const fetchMonth = async (targetDate) => {
    setLoading(true);
    setStatus('');
    try {
      const data = await expenseService.getMonthly(targetDate.getMonth() + 1, targetDate.getFullYear());
      setBudget(data?.budget ?? 0);
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch (err) {
      console.error('Failed to load expenses', err);
      setStatus('Failed to load expenses for this month. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth(viewDate);
  }, [viewDate]);

  const addExpense = async () => {
    const amountNum = parseFloat(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setStatus('Enter a valid amount for today.');
      return;
    }
    const isTodayDate = isToday(parseISO(form.date));
    if (!isTodayDate) {
      setStatus('You can only add or edit today\'s expense.');
      return;
    }

    try {
      const saved = await expenseService.saveToday({
        amount: amountNum,
        note: form.note.trim(),
        date: form.date,
      });
      setExpenses((prev) => {
        const idx = prev.findIndex((exp) => exp.date === saved.date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setForm((prev) => ({ ...prev, amount: '', note: '' }));
      setStatus('Saved for today. You can edit again today.');
    } catch (err) {
      console.error('Failed to save expense', err);
      setStatus('Could not save today\'s expense. Please try again.');
    }
  };

  const persistBudget = async (nextBudget) => {
    const normalized = Number(nextBudget) || 0;
    setBudget(normalized);
    setSavingBudget(true);
    try {
      await expenseService.saveBudget({ month, year, amount: normalized });
      setStatus('Budget saved for this month.');
    } catch (err) {
      console.error('Failed to save budget', err);
      setStatus('Could not save budget. Please try again.');
    } finally {
      setSavingBudget(false);
    }
  };

  const currentMonthExpenses = useMemo(
    () =>
      expenses.filter((exp) => {
        const d = typeof exp.date === 'string' ? parseISO(exp.date) : new Date(exp.date);
        return isSameMonth(d, viewDate);
      }),
    [expenses, viewDate]
  );

  const totalSpent = currentMonthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const saved = Math.max(budget - totalSpent, 0);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    currentMonthExpenses.forEach((exp) => {
      const key = format(typeof exp.date === 'string' ? parseISO(exp.date) : new Date(exp.date), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + exp.amount);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, amt]) => ({ day, amt }));
  }, [currentMonthExpenses]);

  const changeMonth = (direction) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + direction);
    setViewDate(d);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-900 mb-1">Expenses</h1>
            <p className="text-sm sm:text-base text-neutral-700">Track daily spending and monthly savings</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 border border-neutral-200 rounded-full px-2.5 py-1 shadow-sm text-[11px] sm:text-xs">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-neutral-100 active:bg-neutral-200 rounded-full transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-neutral-700" />
            </button>
            <span className="font-semibold text-neutral-800">{format(viewDate, 'MMM yyyy')}</span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-neutral-100 active:bg-neutral-200 rounded-full transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5 text-neutral-700" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bubble-card rounded-2xl p-4 sm:p-5 border border-primary-100/60 shadow-soft">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-primary-900 font-semibold text-lg">
                  <PiggyBank className="w-5 h-5" />
                  <span>Monthly Budget</span>
                </div>
                <p className="text-sm text-neutral-600">Set your target budget and add daily expenses.</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-600">Saved this month</div>
                <div className="text-2xl font-bold text-primary-700">₹{saved.toFixed(2)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Budget</label>
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value) || 0)}
                  onBlur={(e) => persistBudget(e.target.value)}
                  className="w-full px-3 py-2 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  disabled={savingBudget}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Expense amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. 12.50"
                  className="w-full px-3 py-2 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-4">
              <div className="flex-1 mb-2 sm:mb-0">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Groceries, commute, coffee, etc."
                  className="w-full px-3 py-2 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                onClick={addExpense}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            {status && <p className="text-xs text-primary-700 mb-3">{status}</p>}

            <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between text-sm text-primary-900">
                <span>Spent this month</span>
                <span className="font-semibold">₹{totalSpent.toFixed(2)}</span>
              </div>
              <div className="mt-2 h-2 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600"
                  style={{ width: `${budget ? Math.min((totalSpent / budget) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bubble-card rounded-2xl p-4 sm:p-5 border border-primary-100/60 shadow-soft">
            <h2 className="text-lg font-semibold text-primary-900 mb-3">This Month</h2>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {loading ? (
                <p className="text-sm text-neutral-600">Loading {format(viewDate, 'MMMM yyyy')}…</p>
              ) : currentMonthExpenses.length === 0 ? (
                <p className="text-sm text-neutral-600">No expenses for {format(viewDate, 'MMMM yyyy')}.</p>
              ) : (
                currentMonthExpenses
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between text-sm bg-white/90 border border-primary-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-neutral-700">{format(parseISO(exp.date), 'dd MMM')}</span>
                        {exp.note && <span className="text-xs text-neutral-500">{exp.note}</span>}
                      </div>
                      <span className="font-semibold text-primary-700">₹{exp.amount.toFixed(2)}</span>
                    </div>
                  ))
              )}
            </div>

            {groupedByDay.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-neutral-700 mb-2">Daily totals</h3>
                <div className="space-y-1.5 text-sm">
                  {groupedByDay.map((entry) => (
                    <div key={entry.day} className="flex items-center justify-between bg-white/90 rounded-lg px-3 py-2 border border-primary-50">
                      <span className="text-neutral-700">{format(parseISO(entry.day), 'dd MMM')}</span>
                      <span className="font-semibold text-primary-700">₹{entry.amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
