import { useState } from 'react';
import { useHunt } from '../hooks/useHunt';
import { useCardStore } from '../store/cardStore';
import { DealResultsView } from '../components/DealResultsView';
import { Search, Sparkles, Database, ShieldAlert, Cpu, X } from 'lucide-react';

export function HuntPage() {
  const [productInput, setProductInput] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const { startHunt, streamingResult, isComplete, huntId } = useHunt();
  const cards = useCardStore((state) => state.cards);

  const addProduct = () => {
    const val = productInput.trim();
    if (val && !products.includes(val)) {
      setProducts(prev => [...prev, val]);
    }
    setProductInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addProduct();
  };

  const handleStartHunt = () => {
    if (products.length === 0) return;
    startHunt.mutate(products);
  };

  const isHunting = startHunt.isPending || (huntId !== null && !isComplete);
  const hasResults = !!(streamingResult.prices?.length || streamingResult.stacked_deal);
  const productName = streamingResult.product?.name || products[0] || 'Product';

  return (
    <div className="space-y-10 py-6 max-w-7xl mx-auto">

      {/* ── HERO HEADER ──────────────────────────────────────────── */}
      {!hasResults && !isHunting && (
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Multi-Agent Stack Search Engine
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-display text-slate-800">
            Find Real-Time Deals
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Enter a product. Our agents compare prices across retailers, find working coupons,
            check your card cashbacks, and stack every saving in the right order.
          </p>
        </div>
      )}

      {/* ── SEARCH BAR ───────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm max-w-3xl mx-auto space-y-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={productInput}
              onChange={e => setProductInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. AirPods Pro, Sony WH-1000XM5, iPad Air…"
              className="w-full pl-12 pr-4 py-4 border border-slate-200 focus:border-brand-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 text-sm text-slate-800 placeholder-slate-400 transition"
            />
          </div>
          <button
            onClick={addProduct}
            className="px-6 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold transition shadow-md shadow-brand-500/15 text-sm"
          >
            Add
          </button>
        </div>

        {products.length > 0 && (
          <div className="space-y-4 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Wishlist ({products.length})
              </span>
              <button onClick={() => setProducts([])} className="text-[11px] font-bold text-red-400 hover:text-red-600 transition">
                Clear all
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {products.map((p, i) => (
                <span
                  key={i}
                  className="bg-brand-50 border border-brand-100 text-brand-700 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                >
                  {p}
                  <button
                    onClick={() => setProducts(products.filter((_, idx) => idx !== i))}
                    className="text-brand-400 hover:text-red-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={handleStartHunt}
              disabled={isHunting}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl font-bold transition text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isHunting ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                  Scanning agents…
                </>
              ) : '🚀 Find Best Deal'}
            </button>
          </div>
        )}

        {cards.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold">No cards configured.</span> Add your credit cards on the Cards page to unlock stacked cashback recommendations.
            </p>
          </div>
        )}
      </div>

      {/* ── SONAR LOADING ────────────────────────────────────────── */}
      {isHunting && !hasResults && (
        <div className="bg-slate-900 text-white rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

          <div className="relative w-44 h-44 rounded-full border border-slate-800 flex items-center justify-center mb-7">
            <div className="absolute inset-0 rounded-full border border-brand-500/20 animate-sonar" />
            <div className="absolute w-32 h-32 rounded-full border border-slate-700/60" />
            <div className="absolute w-20 h-20 rounded-full border border-slate-700/40" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-500/15 to-transparent animate-spin [animation-duration:4s]" />
            <Cpu className="w-9 h-9 text-brand-400 relative z-10" />
          </div>

          <div className="text-center relative z-10 space-y-2">
            <h3 className="font-extrabold text-lg tracking-tight flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              Scanning for Best Deal
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Checking retailers, verifying coupon codes, and matching card cashbacks — finding the cheapest total price.
            </p>
          </div>

          <div className="absolute top-8 left-8 md:left-20 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-brand-300 font-bold">
            <Database className="w-3.5 h-3.5" /> Amazon
          </div>
          <div className="absolute top-8 right-8 md:right-20 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-indigo-300 font-bold">
            <Database className="w-3.5 h-3.5" /> Best Buy
          </div>
          <div className="absolute bottom-8 left-8 md:left-32 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-300 font-bold">
            <Database className="w-3.5 h-3.5" /> Walmart
          </div>
          <div className="absolute bottom-8 right-8 md:right-32 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-sky-300 font-bold">
            <Database className="w-3.5 h-3.5" /> Target
          </div>
        </div>
      )}

      {/* ── DEAL RESULTS ─────────────────────────────────────────── */}
      {hasResults && (
        <DealResultsView
          prices={streamingResult.prices ?? []}
          productName={productName}
          deal={streamingResult.stacked_deal}
        />
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────── */}
      {isComplete && !hasResults && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="text-5xl">🔍</div>
          <h3 className="text-xl font-extrabold text-slate-800 font-display">No deals found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Try a different product name or check back later as prices are updated regularly.
          </p>
        </div>
      )}

    </div>
  );
}
