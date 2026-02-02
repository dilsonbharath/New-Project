import api from './api';

export const expenseService = {
  async getMonthly(month, year) {
    const response = await api.get('/expenses/summary', { params: { month, year } });
    return response.data;
  },

  async saveToday({ amount, note, date }) {
    const response = await api.post('/expenses/today', { amount, note, date });
    return response.data;
  },

  async updateExpense(expenseId, { amount, note }) {
    const response = await api.put(`/expenses/expense/${expenseId}`, { amount, note });
    return response.data;
  },

  async deleteExpense(expenseId) {
    const response = await api.delete(`/expenses/expense/${expenseId}`);
    return response.data;
  },

  async saveBudget({ month, year, amount }) {
    const response = await api.put('/expenses/budget', { month, year, amount });
    return response.data;
  },

  async saveDailyBudget({ date, amount }) {
    const response = await api.put('/expenses/daily-budget', { date, amount });
    return response.data;
  },

  async getDailyBudget(date) {
    const response = await api.get('/expenses/daily-budget', { params: { budget_date: date } });
    return response.data;
  },
};
