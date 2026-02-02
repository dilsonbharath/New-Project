import api from './api';

export const habitService = {
  async getHabits() {
    const response = await api.get('/habits/');
    return response.data;
  },

  async getHabit(habitId) {
    const response = await api.get(`/habits/${habitId}`);
    return response.data;
  },

  async createHabit(habitData) {
    const response = await api.post('/habits/', habitData);
    return response.data;
  },

  async updateHabit(habitId, habitData) {
    const response = await api.put(`/habits/${habitId}`, habitData);
    return response.data;
  },

  async deleteHabit(habitId) {
    await api.delete(`/habits/${habitId}`);
  },

  async getHabitLogs(habitId, startDate, endDate) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get(`/habits/${habitId}/logs`, { params });
    return response.data;
  },

  async toggleHabitLog(habitId, date, notes = null) {
    const response = await api.post(`/habits/${habitId}/logs`, {
      date,
      completed: true,
      notes
    });
    return response.data;
  },

  async deleteHabitLog(logId) {
    await api.delete(`/habits/logs/${logId}`);
  }
};
