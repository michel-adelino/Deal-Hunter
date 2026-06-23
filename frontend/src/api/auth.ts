import { apiClient } from './client';

export const authAPI = {
  signup: async (email: string, password: string) => {
    const response = await apiClient.post('/api/v1/auth/signup', { email, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/v1/auth/login', { email, password });
    return response.data;
  },
};
