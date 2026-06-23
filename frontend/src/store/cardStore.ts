import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserCard, ManualOffer } from '../types';

interface CardStore {
  cards: UserCard[];
  setCards: (cards: UserCard[]) => void;
  addCard: (card: UserCard) => void;
  removeCard: (id: string) => void;
  addOffer: (cardId: string, offer: ManualOffer) => void;
  removeOffer: (cardId: string, offerIndex: number) => void;
}

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
      cards: [],
      setCards: (cards) => set({ cards }),
      addCard: (card) => set((state) => ({
        cards: [...state.cards, card],
      })),
      removeCard: (id) => set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
      })),
      addOffer: (cardId, offer) => set((state) => ({
        cards: state.cards.map((c) =>
          c.id === cardId
            ? { ...c, manual_offers: [...c.manual_offers, offer] }
            : c
        ),
      })),
      removeOffer: (cardId, offerIndex) => set((state) => ({
        cards: state.cards.map((c) =>
          c.id === cardId
            ? { ...c, manual_offers: c.manual_offers.filter((_, i) => i !== offerIndex) }
            : c
        ),
      })),
    }),
    { name: 'dealhunter-cards' }
  )
);
