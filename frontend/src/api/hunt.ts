import { apiClient } from './client';

export const huntAPI = {
  startHunt: async (products: string[]) => {
    const response = await apiClient.post('/api/v1/hunt', { products });
    return response.data;
  },

  getHunt: async (huntId: string) => {
    const response = await apiClient.get(`/api/v1/hunt/${huntId}`);
    return response.data;
  },

  streamHunt: (huntId: string) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return new EventSource(
      `${baseUrl}/api/v1/hunt/${huntId}/stream?token=${token}`
    );
  },
};
