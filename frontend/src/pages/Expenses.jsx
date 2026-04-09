import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Save, X, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import { expenseService } from '../services/expenseService';

const Expenses = () => {
  const [viewDate, setViewDate] = useState(new Date());
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ amount: '', note: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [todayBudget, setTodayBudget] = useState(0);
  const [savingDailyBudget, setSavingDailyBudget] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', note: '' });
  const [expandedDate, setExpandedDate] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const fetchMonth = async (targetDate) => {
    setLoading(true); setStatus('');
    try {
      const data = await expenseService.getMonthly(targetDate.getMonth() + 1, targetDate.getFullYear());
      const budgetValue = data?.budget ?? 0;
      setBudget(budgetValue);
      setBudgetInput(budgetValue > 0 ? budgetValue.toString() : '');
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch (err) { setStatus('Failed to load expenses.'); }
    finally { setLoading(false); }
  };

  const fetchDailyBudget = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const data = await expenseService.getDailyBudget(today);
      if (data?.amount) setTodayBudget(data.amount);
    } catch (err) { console.error('Failed to load daily budget', err); }
  };

  useEffect(() => { fetchMonth(viewDate); fetchDailyBudget(); }, [viewDate]);

  const addExpense = async () => {
    const amountNum = parseFloat(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) { setStatus('Enter a valid amount.'); return; }
    if (!isToday(parseISO(form.date))) { setStatus("You can only add today's expenses."); return; }
    try {
      const saved = await expenseService.saveToday({ amount: amountNum, note: form.note.trim(), date: form.date });
      setExpenses(prev => [...prev, saved]);
      setForm(prev => ({ ...prev, amount: '', note: '' }));
      setStatus('Expense added ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) { setStatus(`Could not save: ${err.response?.data?.detail || err.message}`); }
  };

  const persistBudget = async (val) => {
    const n = Number(val) || 0; setBudget(n); setSavingBudget(true);
    try { await expenseService.saveBudget({ month, year, amount: n }); } catch (err) { setStatus('Could not save budget.'); }
    finally { setSavingBudget(false); }
  };

  const persistDailyBudget = async (val) => {
    const n = Number(val) || 0; setTodayBudget(n); setSavingDailyBudget(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await expenseService.saveDailyBudget({ date: today, amount: n });
    } catch (err) { setStatus('Could not save daily budget.'); }
    finally { setSavingDailyBudget(false); }
  };

  const startEditExpense = (exp) => { setEditingExpenseId(exp.id); setEditForm({ amount: exp.amount.toString(), note: exp.note || '' }); };
  const cancelEdit = () => { setEditingExpenseId(null); setEditForm({ amount: '', note: '' }); };

  const updateExpense = async (id) => {
    const n = parseFloat(editForm.amount);
    if (Number.isNaN(n) || n <= 0) { setStatus('Enter a valid amount.'); return; }
    try {
      const updated = await expenseService.updateExpense(id, { amount: n, note: editForm.note.trim() });
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
      cancelEdit(); setStatus('Updated ✓');
    } catch (err) { setStatus('Could not update.'); }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expenseService.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      setStatus('Deleted');
    } catch (err) { setStatus('Could not delete.'); }
  };

  const currentMonthExpenses = useMemo(() =>
    expenses.filter(e => { const d = typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date); return isSameMonth(d, viewDate); }),
    [expenses, viewDate]
  );

  const totalSpent = currentMonthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const saved = Math.max(budget - totalSpent, 0);

  const todayExpenses = useMemo(() =>
    expenses.filter(e => { const d = typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date); return isToday(d); }),
    [expenses]
  );

  const todaySpent = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    currentMonthExpenses.forEach(e => {
      const key = format(typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, { expenses: [], total: 0 });
      const d = map.get(key); d.expenses.push(e); d.total += e.amount;
    });
    return Array.from(map.entries()).sort((a, b) => a[0] < b[0] ? 1 : -1).map(([day, data]) => ({ day, ...data }));
  }, [currentMonthExpenses]);

  const changeMonth = (dir) => { const d = new Date(viewDate); d.setMonth(d.getMonth() + dir); setViewDate(d); };
  const spentPct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="section-header mb-1">Expenses</h2>
            <p className="text-sm text-neutral-400">Track daily spending, build savings</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-neutral-700 min-w-[80px] text-center">{format(viewDate, 'MMM yyyy')}</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Monthly overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div>
            <div className="stat-label mb-1">Budget</div>
            <input
              type="number" min="0" value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onBlur={(e) => persistBudget(e.target.value)}
              className="text-2xl font-extrabold text-neutral-800 bg-transparent border-none outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={savingBudget} placeholder="₹0"
            />
          </div>
          <div>
            <div className="stat-label mb-1">Spent</div>
            <div className={`text-2xl font-extrabold ${totalSpent > budget && budget > 0 ? 'text-red-500' : 'text-neutral-800'}`}>
              ₹{totalSpent.toFixed(0)}
            </div>
          </div>
          <div>
            <div className="stat-label mb-1">Saved</div>
            <div className="text-2xl font-extrabold text-green-600">₹{saved.toFixed(0)}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="progress-track" style={{ height: '4px' }}>
            <div className={`h-full rounded-full transition-all ${spentPct > 90 ? 'bg-red-400' : ''}`}
              style={{ width: `${spentPct}%`, background: spentPct > 90 ? undefined : 'linear-gradient(90deg, #f97352, #ff9580)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>{Math.round(spentPct)}% used</span>
            <span>{Math.round(100 - spentPct)}% remaining</span>
          </div>
        </div>

        {/* Today section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-neutral-800 mb-4">Today</h3>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="text-xs text-neutral-400 mb-1">Today's budget</div>
              <input
                type="number" min="0" value={todayBudget || ''}
                onChange={(e) => setTodayBudget(Number(e.target.value) || 0)}
                onBlur={(e) => persistDailyBudget(e.target.value)}
                className="text-lg font-bold text-neutral-800 bg-transparent border-none outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={savingDailyBudget} placeholder="₹0"
              />
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-400 mb-1">Spent</div>
              <div className={`text-lg font-bold ${todaySpent > todayBudget && todayBudget > 0 ? 'text-red-500' : 'text-neutral-800'}`}>
                ₹{todaySpent.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Add expense — inline */}
          <div className="flex gap-2 mb-4">
            <input
              type="number" min="0" step="0.01" value={form.amount}
              onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="₹ Amount" className="input-clean flex-1 text-sm"
            />
            <input
              type="text" value={form.note}
              onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Note (optional)" className="input-clean flex-1 text-sm"
            />
            <button onClick={addExpense} className="btn-primary px-3 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>

          {status && <p className="text-xs text-primary-600 mb-3">{status}</p>}

          {/* Today's transactions */}
          {todayExpenses.length > 0 && (
            <div className="space-y-1">
              {todayExpenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-3 py-2 px-1 text-sm border-b border-neutral-50 last:border-0">
                  {editingExpenseId === exp.id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input type="number" value={editForm.amount} onChange={(e) => setEditForm(p => ({ ...p, amount: e.target.value }))}
                        className="input-clean text-sm w-20" />
                      <input type="text" value={editForm.note} onChange={(e) => setEditForm(p => ({ ...p, note: e.target.value }))}
                        className="input-clean text-sm flex-1" />
                      <button onClick={() => updateExpense(exp.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={cancelEdit} className="p-1.5 text-neutral-400 hover:bg-neutral-100 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-medium text-neutral-800">₹{exp.amount.toFixed(2)}</span>
                        {exp.note && <span className="text-neutral-400 ml-2">{exp.note}</span>}
                      </div>
                      <button onClick={() => startEditExpense(exp)} className="p-1.5 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteExpense(exp.id)} className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Month history */}
        <div>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-600 transition-colors mb-4"
          >
            <span>This month's history</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          {showHistory && (
            <div className="space-y-1">
              {loading ? (
                <p className="text-sm text-neutral-400">Loading...</p>
              ) : groupedByDay.length === 0 ? (
                <p className="text-sm text-neutral-400">No expenses this month.</p>
              ) : (
                groupedByDay.map(dayData => (
                  <div key={dayData.day}>
                    <button
                      onClick={() => setExpandedDate(expandedDate === dayData.day ? null : dayData.day)}
                      className="w-full flex items-center justify-between py-2.5 px-1 text-sm hover:bg-neutral-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-700">{format(parseISO(dayData.day), 'dd MMM')}</span>
                        <span className="text-xs text-neutral-400">({dayData.expenses.length})</span>
                      </div>
                      <span className="font-semibold text-neutral-800">₹{dayData.total.toFixed(0)}</span>
                    </button>
                    {expandedDate === dayData.day && (
                      <div className="pl-6 pb-2 space-y-1">
                        {dayData.expenses.map(exp => (
                          <div key={exp.id} className="flex items-center justify-between text-xs py-1 text-neutral-500">
                            <span>₹{exp.amount.toFixed(2)} {exp.note && `· ${exp.note}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expenses;
