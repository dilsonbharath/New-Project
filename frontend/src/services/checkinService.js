import api from './api';

export const checkinService = {
  // Record today's check-in
  recordCheckin: async () => {
    const response = await api.post('/checkins/today');
    return response.data;
  },

  // Get monthly check-ins
  getMonthlyCheckins: async (year, month) => {
    const response = await api.get(`/checkins/calendar/${year}/${month}`);
    return response.data;
  },

  // Get check-in statistics
  getStats: async () => {
    const response = await api.get('/checkins/stats');
    return response.data;
  }
};