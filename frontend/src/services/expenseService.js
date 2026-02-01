import api from './api';

export const expenseService = {
  async getMonthly(month, year) {
    const response = await api.get('/api/expenses/summary', { params: { month, year } });
    return response.data;
  },

  async saveToday({ amount, note, date }) {
    const response = await api.post('/api/expenses/today', { amount, note, date });
    return response.data;
  },

  async saveBudget({ month, year, amount }) {
    const response = await api.put('/api/expenses/budget', { month, year, amount });
    return response.data;
  },
};
