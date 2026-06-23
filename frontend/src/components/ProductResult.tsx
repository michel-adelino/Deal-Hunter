import { PriceSnapshot, StackedDeal } from '../types';
import { getRetailerLogo, getProductImageSync } from '../lib/productImages';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ExternalLink, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface Props {
  price: PriceSnapshot;
  productName: string;
  deal?: StackedDeal;
}

export function ProductResult({ price, productName, deal }: Props) {
  const savings = deal?.total_savings || 0;
  const savingsPercent = deal ? ((savings / price.current_price) * 100).toFixed(1) : '0';
  const [imageError, setImageError] = useState(false);
  const imageUrl = getProductImageSync(productName);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 hover:shadow-card-hover hover:border-slate-300/80 transition-all duration-300 overflow-hidden flex flex-col justify-between h-full">
      
      {/* Product Image Panel */}
      <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={productName}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="text-5xl">{getRetailerLogo(price.retailer)}</div>
        )}

        {/* Retailer badge overlay */}
        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md rounded-xl px-2.5 py-1 border border-white/10 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="text-xs">{getRetailerLogo(price.retailer)}</span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest">
              {price.retailer}
            </span>
          </div>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        {/* Top details */}
        <div className="space-y-2">
          <h3 className="font-extrabold text-slate-800 text-xs line-clamp-2 leading-relaxed min-h-[32px]">
            {productName}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Source Status:</span>
            <ConfidenceBadge confidence={price.confidence} />
          </div>
        </div>

        {/* Price stack reduction details */}
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-brand-600">
              ${price.current_price.toFixed(2)}
            </span>
            {price.price_30d_low && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                30d low: ${price.price_30d_low.toFixed(2)}
              </span>
            )}
          </div>

          {savings > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 text-[10px] font-black">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Save ${savings.toFixed(2)} ({savingsPercent}%)</span>
            </div>
          )}
        </div>

        {/* Link Button */}
        <a
          href={price.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-bold active:scale-98 shadow-sm"
        >
          View Deal
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      
    </div>
  );
}
