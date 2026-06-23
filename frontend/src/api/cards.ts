import { apiClient } from './client';
import { ManualOffer } from '../types';

export const cardsAPI = {
  listCards: async () => {
    const response = await apiClient.get('/api/v1/cards');
    return response.data;
  },

  createCard: async (cardType: string, label?: string) => {
    const response = await apiClient.post('/api/v1/cards', { card_type: cardType, label });
    return response.data;
  },

  updateCard: async (cardId: string, label: string) => {
    const response = await apiClient.put(`/api/v1/cards/${cardId}`, { label });
    return response.data;
  },

  deleteCard: async (cardId: string) => {
    await apiClient.delete(`/api/v1/cards/${cardId}`);
  },

  addOffer: async (cardId: string, offer: ManualOffer) => {
    const response = await apiClient.post(`/api/v1/cards/${cardId}/offers`, offer);
    return response.data;
  },
};
