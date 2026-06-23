import { PriceSnapshot } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ExternalLink } from 'lucide-react';

interface Props {
  price: PriceSnapshot;
}

export function DealCard({ price }: Props) {
  return (
    <div className="border rounded-lg p-3 bg-white hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900 capitalize">{price.retailer}</p>
          <p className="text-2xl font-bold text-green-700">${price.current_price.toFixed(2)}</p>
          {price.price_30d_low && (
            <p className="text-xs text-gray-600">
              30-day low: ${price.price_30d_low.toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <ConfidenceBadge confidence={price.confidence} />
          <a
            href={price.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
