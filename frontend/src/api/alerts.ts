import { apiClient } from './client';

export const alertsAPI = {
  listAlerts: async () => {
    const response = await apiClient.get('/api/v1/alerts');
    return response.data;
  },

  createAlert: async (productName: string, alertType: string, thresholdPrice?: number) => {
    const response = await apiClient.post('/api/v1/alerts', {
      product_name: productName,
      alert_type: alertType,
      threshold_price: thresholdPrice,
    });
    return response.data;
  },

  deleteAlert: async (alertId: string) => {
    await apiClient.delete(`/api/v1/alerts/${alertId}`);
  },

  toggleAlert: async (alertId: string) => {
    const response = await apiClient.post(`/api/v1/alerts/${alertId}/toggle`);
    return response.data;
  },
};
