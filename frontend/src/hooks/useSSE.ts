import { useEffect, useRef, useState } from 'react';
import { HuntSSEEvent } from '../types';
import { huntAPI } from '../api/hunt';

export function useHuntStream(huntId: string | null) {
  const [events, setEvents] = useState<HuntSSEEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!huntId) return;

    const es = huntAPI.streamHunt(huntId);
    esRef.current = es;

    const handleEvent = (type: string) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [...prev, { type, data } as HuntSSEEvent]);
        if (type === 'hunt_complete') {
          setIsComplete(true);
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    const eventTypes = [
      'hunt_started',
      'price_result',
      'card_benefit',
      'coupon_result',
      'portal_result',
      'stacked_deal',
      'product_complete',
      'hunt_complete',
      'error',
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, handleEvent(type));
    });

    return () => {
      es.close();
    };
  }, [huntId]);

  return { events, isComplete };
}
