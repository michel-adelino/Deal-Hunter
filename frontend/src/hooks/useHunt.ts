import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { huntAPI } from '../api/hunt';
import { useHuntStream } from './useSSE';
import { HuntResult } from '../types';

export function useHunt() {
  const [huntId, setHuntId] = useState<string | null>(null);
  const [partialResult] = useState<Partial<HuntResult>>({});

  const { events, isComplete } = useHuntStream(huntId);

  const streamingResult = events.reduce((acc, event) => {
    switch (event.type) {
      case 'price_result':
        return {
          ...acc,
          prices: [...(acc.prices ?? []), event.data],
        };
      case 'card_benefit':
        return {
          ...acc,
          card_benefits: [...(acc.card_benefits ?? []), event.data],
        };
      case 'coupon_result':
        return {
          ...acc,
          coupons: [...(acc.coupons ?? []), event.data],
        };
      case 'portal_result':
        return {
          ...acc,
          portal_offers: [...(acc.portal_offers ?? []), event.data],
        };
      case 'stacked_deal':
        return {
          ...acc,
          stacked_deal: event.data,
        };
      case 'hunt_started':
        return {
          ...acc,
          product: { name: event.data.product, canonical_name: event.data.canonical_name },
        };
      default:
        return acc;
    }
  }, partialResult);

  const startHunt = useMutation({
    mutationFn: async (products: string[]) => {
      const res = await huntAPI.startHunt(products);
      setHuntId(res.hunt_id);
      return res;
    },
  });

  return {
    startHunt,
    streamingResult,
    isComplete,
    huntId,
  };
}
