import api from './api';

export const progressService = {
  async getOverallProgress() {
    const response = await api.get('/progress/');
    return response.data;
  }
};
