import api from './api';

export const journalService = {
  async getEntries(entryType = null, startDate = null, endDate = null) {
    const params = new URLSearchParams();
    if (entryType) params.append('entry_type', entryType);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/journal/entries?${params.toString()}`);
    return response.data;
  },

  async getEntry(entryId) {
    const response = await api.get(`/journal/entries/${entryId}`);
    return response.data;
  },

  async getEntryByDate(entryType, date) {
    const response = await api.get(`/journal/entry/${entryType}/${date}`);
    return response.data;
  },

  async createEntry(entryData) {
    const response = await api.post('/journal/entries', entryData);
    return response.data;
  },

  async updateEntry(entryId, entryData) {
    const response = await api.put(`/journal/entries/${entryId}`, entryData);
    return response.data;
  },

  async saveEntry(entryData) {
    const response = await api.post('/journal/save', entryData);
    return response.data;
  },

  async deleteEntry(entryId) {
    const response = await api.delete(`/journal/entries/${entryId}`);
    return response.data;
  }
};
