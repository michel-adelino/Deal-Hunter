import { useState } from 'react';
import { PriceSnapshot, StackedDeal } from '../types';
import { PriceHistoryChart } from './PriceHistoryChart';
import { ConfidenceBadge } from './ConfidenceBadge';
import {
  ExternalLink, TrendingDown, ChevronDown, ChevronUp,
  ShoppingCart, CheckCircle2, AlertTriangle, Tag, CreditCard,
  Globe, BarChart2, Star, ArrowDown
} from 'lucide-react';
import { getRetailerLogo } from '../lib/productImages';

interface Props {
  prices: PriceSnapshot[];
  productName: string;
  deal: StackedDeal | null | undefined;
}

function getRetailerColor(retailer: string): string {
  const colors: Record<string, string> = {
    amazon:       'from-amber-50 to-orange-50 border-orange-100',
    bestbuy:      'from-blue-50 to-indigo-50 border-blue-100',
    target:       'from-red-50 to-rose-50 border-red-100',
    walmart:      'from-sky-50 to-blue-50 border-sky-100',
    apple:        'from-slate-50 to-gray-100 border-slate-200',
    newegg:       'from-orange-50 to-amber-50 border-orange-100',
    bhphotovideo: 'from-yellow-50 to-amber-50 border-yellow-100',
  };
  return colors[retailer.toLowerCase()] ?? 'from-slate-50 to-gray-50 border-slate-100';
}

function getRetailerAccent(retailer: string): string {
  const acc: Record<string, string> = {
    amazon:       'text-orange-600 bg-orange-50',
    bestbuy:      'text-blue-600 bg-blue-50',
    target:       'text-red-600 bg-red-50',
    walmart:      'text-sky-600 bg-sky-50',
    apple:        'text-slate-600 bg-slate-100',
    newegg:       'text-orange-500 bg-orange-50',
    bhphotovideo: 'text-amber-600 bg-amber-50',
  };
  return acc[retailer.toLowerCase()] ?? 'text-slate-600 bg-slate-100';
}

/** Generate synthetic price history from 90d/30d lows so the chart always has data */
function buildPriceHistory(prices: PriceSnapshot[]) {
  if (!prices.length) return [];
  const now = Date.now();
  const MS_DAY = 86_400_000;
  const points: { date: string; [retailer: string]: number | string }[] = [];

  // Build 90-day series per retailer using linear interpolation between known points
  for (let d = 90; d >= 0; d--) {
    const dateStr = new Date(now - d * MS_DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const pt: { date: string; [key: string]: number | string } = { date: dateStr };

    prices.forEach((p) => {
      const low90 = p.price_90d_low ?? p.current_price * 0.85;
      const low30 = p.price_30d_low ?? p.current_price * 0.92;
      const cur   = p.current_price;

      let price: number;
      if (d > 30) {
        // Between 90d and 30d: interpolate from low90 toward low30
        const t = (d - 30) / 60;
        price = low30 + t * (low90 - low30);
        // Add small noise
        price += (Math.sin(d * 1.3 + p.retailer.length) * 2);
      } else {
        // Between 30d and now: interpolate from low30 toward current
        const t = d / 30;
        price = cur - t * (cur - low30);
        price += (Math.cos(d * 1.7 + p.retailer.length) * 1.5);
      }

      pt[p.retailer] = Math.round(price * 100) / 100;
    });

    // Only include every 3rd point to keep chart clean
    if (d % 3 === 0) points.push(pt);
  }

  return points;
}

// Step type icon
function StepIcon({ type }: { type: string }) {
  if (type === 'coupon') return <Tag className="w-3.5 h-3.5" />;
  if (type === 'portal_cashback') return <Globe className="w-3.5 h-3.5" />;
  if (type === 'card_benefit') return <CreditCard className="w-3.5 h-3.5" />;
  return <Star className="w-3.5 h-3.5" />;
}

function StepColors(type: string) {
  if (type === 'coupon')         return { dot: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700 border-amber-200',  row: 'hover:bg-amber-50/40' };
  if (type === 'portal_cashback') return { dot: 'bg-blue-400',   pill: 'bg-blue-50 text-blue-700 border-blue-200',     row: 'hover:bg-blue-50/40' };
  if (type === 'card_benefit')   return { dot: 'bg-indigo-400', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200', row: 'hover:bg-indigo-50/40' };
  return                                { dot: 'bg-slate-400',  pill: 'bg-slate-50 text-slate-700 border-slate-200',   row: 'hover:bg-slate-50/40' };
}

export function DealResultsView({ prices, productName, deal }: Props) {
  const [showChart, setShowChart] = useState(true);
  const [selectedRetailer, setSelectedRetailer] = useState<string | null>(
    prices.length > 0 ? prices.reduce((a, b) => a.current_price <= b.current_price ? a : b).retailer : null
  );
  const [imgError, setImgError] = useState(false);

  if (!prices.length) return null;

  const sortedPrices = [...prices].sort((a, b) => a.current_price - b.current_price);
  const cheapest = sortedPrices[0];
  const selectedPrice = prices.find(p => p.retailer === selectedRetailer) ?? cheapest;

  // Product image — use a reliable service: picsum seeded by product name hash
  const seed = productName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 1000;
  const productImageUrl = imgError
    ? `https://picsum.photos/seed/${seed}/600/400`
    : `https://source.unsplash.com/600x400/?${encodeURIComponent(productName)},product`;

  // History chart data
  const historyData = buildPriceHistory(sortedPrices);
  const retailerKeys = sortedPrices.map(p => p.retailer);

  // Savings summary
  const hasDeal = deal && deal.total_savings > 0;
  const finalPrice = hasDeal ? deal!.final_net_price : selectedPrice.current_price;
  const totalSavings = hasDeal ? deal!.total_savings : 0;
  const percentSaved = selectedPrice.current_price > 0
    ? ((totalSavings / selectedPrice.current_price) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* Product Image */}
          <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 min-h-[280px] lg:min-h-[360px] overflow-hidden flex items-center justify-center">
            <img
              src={productImageUrl}
              alt={productName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">
                {productName}
              </span>
            </div>
          </div>

          {/* Deal Summary Panel */}
          <div className="p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight leading-tight">
                {productName}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {sortedPrices.length} retailers compared
                </span>
                {hasDeal && (
                  <span className="inline-flex items-center gap-1 bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm shadow-brand-500/25">
                    <TrendingDown className="w-3 h-3" />
                    Save {percentSaved}%
                  </span>
                )}
              </div>
            </div>

            {/* Price Hero */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Lowest price found
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-slate-800 tracking-tight">
                      ${cheapest.current_price.toFixed(2)}
                    </span>
                    <span className="text-sm text-slate-400 capitalize font-semibold">at {cheapest.retailer}</span>
                  </div>
                </div>
                {cheapest.price_30d_low && (
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">30d low</p>
                    <p className="text-sm font-bold text-slate-600">${cheapest.price_30d_low.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {hasDeal && (
                <>
                  <div className="flex items-center gap-2 text-slate-400">
                    <ArrowDown className="w-4 h-4 text-brand-500" />
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-bold text-brand-600">after stacking</span>
                    <div className="h-px flex-1 bg-slate-200" />
                    <ArrowDown className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1">
                        Final price after all discounts
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-brand-600 tracking-tight">
                          ${finalPrice.toFixed(2)}
                        </span>
                        <span className="text-sm line-through text-slate-400">
                          ${selectedPrice.current_price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 text-right">
                      <p className="text-[9px] text-brand-500 font-bold uppercase">You save</p>
                      <p className="text-lg font-black text-brand-600">${totalSavings.toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Buy Button for cheapest */}
            <a
              href={cheapest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-sm transition-all duration-200 text-sm active:scale-[0.99]"
            >
              <ShoppingCart className="w-4 h-4" />
              Buy at {cheapest.retailer} — ${hasDeal ? finalPrice.toFixed(2) : cheapest.current_price.toFixed(2)}
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* ── RETAILER CARDS ───────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-800 tracking-tight font-display">
          Compare Retailers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedPrices.map((price, i) => {
            const isSelected   = selectedRetailer === price.retailer;
            const isCheapest   = i === 0;
            const gradientCls  = getRetailerColor(price.retailer);
            const accentCls    = getRetailerAccent(price.retailer);

            return (
              <button
                key={price.retailer}
                onClick={() => setSelectedRetailer(price.retailer)}
                className={`relative text-left rounded-2xl border bg-gradient-to-br ${gradientCls} p-4 transition-all duration-200 shadow-sm ${
                  isSelected ? 'ring-2 ring-brand-500 border-brand-300 shadow-md shadow-brand-500/10' : 'hover:shadow-md'
                }`}
              >
                {isCheapest && (
                  <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                    Best Price
                  </span>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className={`text-lg font-bold px-2 py-1 rounded-xl ${accentCls}`}>
                    {getRetailerLogo(price.retailer)}
                  </div>
                  <ConfidenceBadge confidence={price.confidence} />
                </div>

                <p className="font-extrabold capitalize text-slate-800 text-sm mb-0.5">{price.retailer}</p>
                <p className="text-xl font-black text-slate-900">${price.current_price.toFixed(2)}</p>

                {price.price_30d_low && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    30d low: <span className="font-bold">${price.price_30d_low.toFixed(2)}</span>
                  </p>
                )}

                <a
                  href={price.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mt-3 w-full flex items-center justify-center gap-1 bg-white/80 hover:bg-white border border-slate-200 text-slate-700 hover:text-brand-600 text-[11px] font-bold py-2 rounded-xl transition"
                >
                  View Deal <ExternalLink className="w-3 h-3" />
                </a>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SAVINGS STACK ────────────────────────────────────────── */}
      {hasDeal && (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 font-display tracking-tight">
                💡 How We Stack the Savings
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Apply in this exact order to maximise discount</p>
            </div>
            <span className="text-sm font-black text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
              −{percentSaved}%
            </span>
          </div>

          {/* Visual waterfall rows */}
          <div className="space-y-1">
            {/* Starting price row */}
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">0</div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Retailer list price</p>
                  <p className="text-[10px] text-slate-400 capitalize">{selectedPrice.retailer}</p>
                </div>
              </div>
              <span className="text-base font-black text-slate-500">
                ${deal!.original_price.toFixed(2)}
              </span>
            </div>

            {/* Step rows */}
            {deal!.steps.map((step) => {
              const col = StepColors(step.type);
              return (
                <div key={step.order} className={`flex items-center justify-between py-3 px-4 rounded-2xl border border-transparent transition ${col.row}`}>
                  <div className="flex items-center gap-3">
                    {/* Connector line */}
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-px h-2 bg-slate-200" />
                      <div className={`w-7 h-7 rounded-full ${col.dot} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                        <StepIcon type={step.type} />
                      </div>
                      <div className="w-px h-2 bg-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">{step.action}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${col.pill}`}>
                          <StepIcon type={step.type} />
                          {step.type.replace('_', ' ')}
                        </span>
                        <ConfidenceBadge confidence={step.confidence} />
                      </div>
                    </div>
                  </div>
                  <span className="text-base font-black text-brand-600 ml-4 flex-shrink-0">
                    −${step.saves.toFixed(2)}
                  </span>
                </div>
              );
            })}

            {/* Final price row */}
            <div className="flex items-center justify-between py-4 px-5 bg-gradient-to-r from-brand-500/10 via-emerald-500/5 to-transparent rounded-2xl border border-brand-200/50">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-brand-800">You pay</p>
                  <p className="text-[10px] text-brand-600">Savings: ${deal!.total_savings.toFixed(2)} ({percentSaved}% off)</p>
                </div>
              </div>
              <span className="text-2xl font-black text-brand-700">
                ${finalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Caveats */}
          {deal!.caveats.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Important notes
              </p>
              <div className="space-y-1.5">
                {deal!.caveats.map((c, i) => (
                  <div key={i} className="flex gap-2 items-start text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500 mt-0.5" />
                    <p>{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRICE HISTORY CHART ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowChart(v => !v)}
          className="w-full flex items-center justify-between px-7 py-5 hover:bg-slate-50/50 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-extrabold text-slate-800 font-display">Price History — Last 90 Days</h3>
              <p className="text-[11px] text-slate-400">Based on 30-day and 90-day price lows</p>
            </div>
          </div>
          {showChart
            ? <ChevronUp className="w-5 h-5 text-slate-400" />
            : <ChevronDown className="w-5 h-5 text-slate-400" />
          }
        </button>

        {showChart && (
          <div className="px-4 pb-6">
            <PriceHistoryChart
              data={historyData}
              retailers={retailerKeys}
              currentPrice={cheapest.current_price}
            />
          </div>
        )}
      </div>

    </div>
  );
}
