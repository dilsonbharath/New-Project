import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, PiggyBank, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
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
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);

  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const fetchMonth = async (targetDate) => {
    setLoading(true);
    setStatus('');
    try {
      const data = await expenseService.getMonthly(targetDate.getMonth() + 1, targetDate.getFullYear());
      const budgetValue = data?.budget ?? 0;
      setBudget(budgetValue);
      setBudgetInput(budgetValue > 0 ? budgetValue.toString() : '');
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch (err) {
      console.error('Failed to load expenses', err);
      setStatus('Failed to load expenses for this month. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyBudget = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const data = await expenseService.getDailyBudget(today);
      if (data && data.amount) {
        setTodayBudget(data.amount);
      }
    } catch (err) {
      console.error('Failed to load daily budget', err);
    }
  };

  useEffect(() => {
    fetchMonth(viewDate);
    fetchDailyBudget();
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
      // Add the new expense to the list (supports multiple expenses per day)
      setExpenses((prev) => [...prev, saved]);
      setForm((prev) => ({ ...prev, amount: '', note: '' }));
      setStatus('Saved for today. You can add more expenses.');
    } catch (err) {
      console.error('Failed to save expense', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
      console.error('Error details:', errorMsg);
      setStatus(`Could not save today's expense: ${errorMsg}`);
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

  const persistDailyBudget = async (amount) => {
    const normalized = Number(amount) || 0;
    setTodayBudget(normalized);
    setSavingDailyBudget(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await expenseService.saveDailyBudget({ date: today, amount: normalized });
      setStatus('Today\'s budget saved.');
    } catch (err) {
      console.error('Failed to save daily budget', err);
      setStatus('Could not save today\'s budget. Please try again.');
    } finally {
      setSavingDailyBudget(false);
    }
  };

  const startEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setEditForm({ amount: expense.amount.toString(), note: expense.note || '' });
  };

  const cancelEdit = () => {
    setEditingExpenseId(null);
    setEditForm({ amount: '', note: '' });
  };

  const updateExpense = async (expenseId) => {
    const amountNum = parseFloat(editForm.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setStatus('Enter a valid amount.');
      return;
    }

    try {
      const updated = await expenseService.updateExpense(expenseId, {
        amount: amountNum,
        note: editForm.note.trim(),
      });
      setExpenses((prev) => prev.map((exp) => (exp.id === expenseId ? updated : exp)));
      setEditingExpenseId(null);
      setEditForm({ amount: '', note: '' });
      setStatus('Expense updated successfully.');
    } catch (err) {
      console.error('Failed to update expense', err);
      setStatus('Could not update expense. Please try again.');
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await expenseService.deleteExpense(expenseId);
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
      setStatus('Expense deleted successfully.');
    } catch (err) {
      console.error('Failed to delete expense', err);
      setStatus('Could not delete expense. Please try again.');
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

  const todayExpenses = useMemo(
    () =>
      expenses.filter((exp) => {
        const d = typeof exp.date === 'string' ? parseISO(exp.date) : new Date(exp.date);
        return isToday(d);
      }),
    [expenses]
  );

  const todaySpent = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const todaySaved = Math.max(todayBudget - todaySpent, 0);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    currentMonthExpenses.forEach((exp) => {
      const key = format(typeof exp.date === 'string' ? parseISO(exp.date) : new Date(exp.date), 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, { expenses: [], total: 0 });
      }
      const dayData = map.get(key);
      dayData.expenses.push(exp);
      dayData.total += exp.amount;
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, data]) => ({ day, ...data }));
  }, [currentMonthExpenses]);

  const changeMonth = (direction) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + direction);
    setViewDate(d);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-900 mb-1">Expenses</h1>
            <p className="text-xs sm:text-sm text-neutral-700">Track daily spending and monthly savings</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
          {/* Today's Expenses Card */}
          <div className="bubble-card rounded-2xl p-2.5 sm:p-3 border border-primary-100/60 shadow-soft max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 text-primary-900 font-semibold text-sm mb-2.5">
              <Plus className="w-4 h-4" />
              <span>Today's Expenses</span>
            </div>
            
            <div className="space-y-2.5">
              {/* Today's Budget Input */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">Today's Budget</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={todayBudget || ''}
                  onChange={(e) => setTodayBudget(Number(e.target.value) || 0)}
                  onBlur={(e) => persistDailyBudget(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-lg font-bold text-blue-600 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={savingDailyBudget}
                  placeholder="Set today's budget"
                />
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-neutral-600">Spent Today</span>
                  <span className={`font-semibold ${todaySpent > todayBudget ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{todaySpent.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Add Expense Form */}
              <div className="border-t border-primary-100 pt-2">
                <h3 className="text-xs font-semibold text-neutral-700 mb-1.5">Add New Expense</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 250.00"
                      className="w-full px-2.5 py-1.5 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Note</label>
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Groceries, coffee, transport..."
                      className="w-full px-2.5 py-1.5 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={addExpense}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Expense</span>
                  </button>
                  
                  {status && <p className="text-xs text-primary-700 mt-2">{status}</p>}
                </div>
              </div>

              {/* Today's Expenses List */}
              <div className="border-t border-primary-100 pt-2">
                <h3 className="text-xs font-semibold text-neutral-700 mb-1.5">Today's Transactions</h3>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {todayExpenses.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-2">No expenses added today.</p>
                  ) : (
                    todayExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="bg-white border border-primary-50 rounded-lg px-2.5 py-1.5"
                      >
                        {editingExpenseId === exp.id ? (
                          // Edit mode
                          <div className="space-y-1.5">
                            <div>
                              <label className="block text-xs font-semibold text-neutral-700 mb-1">Amount (₹)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-primary-200 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-700 mb-1">Note</label>
                              <input
                                type="text"
                                value={editForm.note}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-primary-200 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateExpense(exp.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-neutral-500 text-white text-xs font-semibold hover:bg-neutral-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col flex-1">
                              <span className="text-neutral-700 font-medium">₹{exp.amount.toFixed(2)}</span>
                              {exp.note && <span className="text-xs text-neutral-500">{exp.note}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditExpense(exp)}
                                className="p-1.5 rounded hover:bg-primary-50 text-primary-600 transition-colors"
                                title="Edit expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteExpense(exp.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                                title="Delete expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Overview Card */}
          <div className="bubble-card rounded-2xl p-2.5 sm:p-3 border border-primary-100/60 shadow-soft max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 text-primary-900 font-semibold text-sm mb-2.5">
              <PiggyBank className="w-4 h-4" />
              <span>Budget</span>
            </div>
            
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Monthly Budget (₹)</label>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={(e) => persistBudget(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm input-plain rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  disabled={savingBudget}
                  placeholder="Enter monthly budget"
                />
              </div>
              
              {/* Monthly Budget Progress */}
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                  <span className="font-semibold uppercase tracking-wide">This Month</span>
                </div>
                <div className="flex items-center justify-between text-sm text-primary-900 mb-2">
                  <span>Spent</span>
                  <span className="font-semibold">₹{totalSpent.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-primary-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary-600"
                    style={{ width: `${budget ? Math.min((totalSpent / budget) * 100, 100) : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Saved</span>
                  <span className="font-semibold text-green-600">₹{saved.toFixed(2)}</span>
                </div>
              </div>
              
              {/* This Month Expenses Section */}
              <div className="border-t border-primary-100 pt-2">
                <div 
                  onClick={() => setIsMonthExpanded(!isMonthExpanded)}
                  className="flex items-center justify-between mb-1.5 cursor-pointer hover:bg-primary-50/50 -mx-1 px-1 py-0.5 rounded transition-colors"
                >
                  <h3 className="text-xs font-semibold text-neutral-800">This Month Details</h3>
                  <span className="text-xs text-neutral-600">{isMonthExpanded ? 'Hide' : 'Show'}</span>
                </div>
                {isMonthExpanded && (
                  <div className="space-y-1.5 overflow-y-auto pr-1">
                    {loading ? (
                      <p className="text-xs text-neutral-600">Loading {format(viewDate, 'MMMM yyyy')}…</p>
                    ) : groupedByDay.length === 0 ? (
                      <p className="text-xs text-neutral-600">No expenses for {format(viewDate, 'MMMM yyyy')}.</p>
                    ) : (
                      groupedByDay.map((dayData) => (
                        <div key={dayData.day} className="bg-white border border-primary-100 rounded-lg overflow-hidden">
                          {/* Date header - clickable */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDate(expandedDate === dayData.day ? null : dayData.day);
                            }}
                            className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-primary-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-neutral-800">{format(parseISO(dayData.day), 'dd MMM')}</span>
                              <span className="text-xs text-neutral-500">({dayData.expenses.length})</span>
                            </div>
                            <span className="text-xs font-semibold text-primary-700">₹{dayData.total.toFixed(2)}</span>
                          </div>
                          
                          {/* Expanded expense details */}
                          {expandedDate === dayData.day && (
                            <div className="border-t border-primary-100 bg-primary-50/30">
                              {dayData.expenses.map((exp) => (
                                <div
                                  key={exp.id}
                                  className="flex items-center justify-between px-2.5 py-1 text-xs border-b border-primary-50 last:border-b-0"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-neutral-700 font-medium">₹{exp.amount.toFixed(2)}</span>
                                    {exp.note && <span className="text-xs text-neutral-500">{exp.note}</span>}
                                  </div>
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
        </div>
      </div>
    </div>
  );
};

export default Expenses;
