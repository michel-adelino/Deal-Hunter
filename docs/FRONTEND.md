# Frontend Implementation — DealHunter

**Stack:** React 18 · TypeScript · Vite · TanStack Query · Zustand · Tailwind CSS · shadcn/ui

---

## Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   ├── pages/
│   │   ├── HuntPage.tsx          # Main deal hunt dashboard
│   │   ├── CardsPage.tsx         # Card portfolio editor
│   │   ├── AlertsPage.tsx        # Price drop & expiry alerts
│   │   └── ProductPage.tsx       # Deep deal breakdown for one product
│   ├── components/
│   │   ├── hunt/
│   │   │   ├── ProductInput.tsx  # Add products to wishlist
│   │   │   ├── DealCard.tsx      # One product's deal summary
│   │   │   ├── StackedDeal.tsx   # Layered savings breakdown
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   └── PriceHistoryChart.tsx
│   │   ├── cards/
│   │   │   ├── CardEditor.tsx
│   │   │   ├── ManualOfferForm.tsx
│   │   │   └── CardStack.tsx
│   │   └── shared/
│   │       ├── Layout.tsx
│   │       └── SSEStream.tsx     # Generic SSE hook wrapper
│   ├── hooks/
│   │   ├── useHunt.ts            # Main hunt orchestration hook
│   │   ├── useSSE.ts             # SSE stream hook
│   │   ├── useCards.ts
│   │   └── useAlerts.ts
│   ├── store/
│   │   ├── userStore.ts          # Zustand: user profile
│   │   ├── cardStore.ts          # Zustand: card portfolio (persisted)
│   │   └── wishlistStore.ts      # Zustand: product wishlist (persisted)
│   ├── api/
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── hunt.ts               # Hunt API calls
│   │   ├── cards.ts
│   │   └── alerts.ts
│   ├── types/
│   │   └── index.ts              # TypeScript types mirroring API schema
│   └── lib/
│       └── confidence.ts         # Confidence level display helpers
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Key Type Definitions

`src/types/index.ts`

```typescript
export type DealConfidence = 'verified' | 'inferred' | 'user_entered' | 'expired';

export interface PriceSnapshot {
  retailer: string;
  url: string;
  current_price: number;
  price_30d_low: number | null;
  price_90d_low: number | null;
  predicted_drop_date: string | null;
  drop_confidence: number | null;
  confidence: DealConfidence;
  captured_at: string;
}

export interface CardBenefit {
  card_type: string;
  card_label: string;
  benefit_type: 'cashback' | 'portal' | 'credit' | 'multiplier';
  amount: number | null;
  rate: number | null;
  merchant: string;
  source_url: string | null;
  confidence: DealConfidence;
  expires_at: string | null;
}

export interface CouponResult {
  code: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  source: string;
  verified: boolean;
  verified_at: string | null;
  stacks_with_portal: boolean | null;
}

export interface StackStep {
  order: number;
  action: string;
  type: string;
  saves: number;
  confidence: DealConfidence;
}

export interface StackedDeal {
  steps: StackStep[];
  original_price: number;
  final_net_price: number;
  total_savings: number;
  caveats: string[];
}

export interface HuntResult {
  hunt_id: string;
  status: 'running' | 'complete' | 'error';
  product: { name: string; canonical_name: string; category: string };
  prices: PriceSnapshot[];
  card_benefits: CardBenefit[];
  coupons: CouponResult[];
  portal_offers: PortalOffer[];
  stacked_deal: StackedDeal | null;
}

// SSE event union
export type HuntSSEEvent =
  | { type: 'price_result'; data: PriceSnapshot }
  | { type: 'card_benefit'; data: CardBenefit }
  | { type: 'coupon_result'; data: CouponResult }
  | { type: 'stacked_deal'; data: StackedDeal }
  | { type: 'hunt_complete'; data: { hunt_id: string } }
  | { type: 'error'; data: { agent: string; message: string } };
```

---

## SSE Hook

`src/hooks/useSSE.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { HuntSSEEvent } from '../types';

export function useHuntStream(huntId: string | null) {
  const [events, setEvents] = useState<HuntSSEEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!huntId) return;
    const token = localStorage.getItem('token');
    const es = new EventSource(
      `/api/v1/hunt/${huntId}/stream?token=${token}`
    );
    esRef.current = es;

    const handleEvent = (type: string) => (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [...prev, { type, data } as HuntSSEEvent]);
      if (type === 'hunt_complete') setIsComplete(true);
    };

    ['price_result', 'card_benefit', 'coupon_result', 'portal_result',
     'stacked_deal', 'hunt_complete', 'error'].forEach(type => {
      es.addEventListener(type, handleEvent(type));
    });

    return () => { es.close(); };
  }, [huntId]);

  return { events, isComplete };
}
```

---

## Main Hunt Hook

`src/hooks/useHunt.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../api/client';
import { useHuntStream } from './useSSE';
import { HuntResult } from '../types';

export function useHunt() {
  const [huntId, setHuntId] = useState<string | null>(null);
  const [partialResult, setPartialResult] = useState<Partial<HuntResult>>({});

  const { events, isComplete } = useHuntStream(huntId);

  // Merge streaming events into partial result as they arrive
  // This is what makes the UI update progressively
  const streamingResult = events.reduce((acc, event) => {
    switch (event.type) {
      case 'price_result':
        return { ...acc, prices: [...(acc.prices ?? []), event.data] };
      case 'card_benefit':
        return { ...acc, card_benefits: [...(acc.card_benefits ?? []), event.data] };
      case 'coupon_result':
        return { ...acc, coupons: [...(acc.coupons ?? []), event.data] };
      case 'stacked_deal':
        return { ...acc, stacked_deal: event.data };
      default:
        return acc;
    }
  }, partialResult);

  const startHunt = useMutation({
    mutationFn: async (products: string[]) => {
      const res = await apiClient.post('/hunt', { products });
      setHuntId(res.data.hunt_id);
      return res.data;
    },
  });

  return { startHunt, streamingResult, isComplete, huntId };
}
```

---

## Confidence Badge Component

`src/components/hunt/ConfidenceBadge.tsx`

```tsx
import { DealConfidence } from '../../types';

const CONFIG: Record<DealConfidence, { label: string; className: string; tooltip: string }> = {
  verified: {
    label: 'Verified',
    className: 'bg-green-100 text-green-800',
    tooltip: 'Confirmed by a live request in the last 24 hours',
  },
  inferred: {
    label: 'Rate table',
    className: 'bg-blue-100 text-blue-800',
    tooltip: 'Based on publicly documented rates — may vary',
  },
  user_entered: {
    label: 'You told us',
    className: 'bg-amber-100 text-amber-800',
    tooltip: 'You entered this offer — verify it\'s active in your card app',
  },
  expired: {
    label: 'May be expired',
    className: 'bg-gray-100 text-gray-500 line-through',
    tooltip: 'Not re-confirmed in the last 48 hours',
  },
};

export function ConfidenceBadge({ confidence }: { confidence: DealConfidence }) {
  const cfg = CONFIG[confidence];
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
      title={cfg.tooltip}
    >
      {cfg.label}
    </span>
  );
}
```

---

## Deal Stacker Component

`src/components/hunt/StackedDeal.tsx`

```tsx
import { StackedDeal as StackedDealType } from '../../types';
import { ConfidenceBadge } from './ConfidenceBadge';

export function StackedDeal({ deal }: { deal: StackedDealType }) {
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-500 line-through">
          ${deal.original_price.toFixed(2)}
        </span>
        <div className="text-right">
          <p className="text-2xl font-semibold">
            ~${deal.final_net_price.toFixed(2)}
          </p>
          <p className="text-sm text-green-700">
            Save ${deal.total_savings.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {deal.steps.map(step => (
          <div key={step.order} className="flex items-start gap-3 text-sm">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center
                             justify-center text-xs text-gray-600 flex-shrink-0 mt-0.5">
              {step.order}
            </span>
            <div className="flex-1">
              <p>{step.action}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-green-700 font-medium">
                -${step.saves.toFixed(2)}
              </span>
              <ConfidenceBadge confidence={step.confidence} />
            </div>
          </div>
        ))}
      </div>

      {deal.caveats.length > 0 && (
        <div className="space-y-1 pt-2 border-t">
          {deal.caveats.map((caveat, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              {caveat}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Zustand Card Store

`src/store/cardStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ManualOffer {
  merchant: string;
  amount: number;
  description: string;
  expires_at: string | null;
}

interface UserCard {
  id: string;
  card_type: string;
  label: string;
  manual_offers: ManualOffer[];
}

interface CardStore {
  cards: UserCard[];
  addCard: (card: Omit<UserCard, 'id'>) => void;
  removeCard: (id: string) => void;
  addOffer: (cardId: string, offer: ManualOffer) => void;
  removeOffer: (cardId: string, offerIndex: number) => void;
}

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
      cards: [],
      addCard: (card) => set(state => ({
        cards: [...state.cards, { ...card, id: crypto.randomUUID() }]
      })),
      removeCard: (id) => set(state => ({
        cards: state.cards.filter(c => c.id !== id)
      })),
      addOffer: (cardId, offer) => set(state => ({
        cards: state.cards.map(c =>
          c.id === cardId
            ? { ...c, manual_offers: [...c.manual_offers, offer] }
            : c
        )
      })),
      removeOffer: (cardId, offerIndex) => set(state => ({
        cards: state.cards.map(c =>
          c.id === cardId
            ? { ...c, manual_offers: c.manual_offers.filter((_, i) => i !== offerIndex) }
            : c
        )
      })),
    }),
    { name: 'dealhunter-cards' }  // persisted to localStorage
  )
);
```

---

## Environment Variables

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
```

---

## package.json (key deps)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.5.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.323.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0"
  }
}
```
