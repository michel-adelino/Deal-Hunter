import { useCardStore } from '../store/cardStore';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, Search, Zap, CreditCard, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface RecentSearch {
  id: string;
  product: string;
  timestamp: number;
  savings?: number;
}

export function DashboardPage() {
  const cards = useCardStore((state) => state.cards);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('dealhunter-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const totalCards = cards.length;
  const totalOffers = cards.reduce((sum, c) => sum + c.manual_offers.length, 0);

  return (
    <div className="space-y-10 py-6">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white px-8 py-12 shadow-2xl shadow-slate-950/20 border border-slate-800">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-semibold tracking-wide border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome back to DealHunter
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
              Maximize Every Purchase
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Instantly scan coupons, cashback portals, and credit card reward benefits stacked together to unlock the lowest possible prices.
            </p>
          </div>
          <Link
            to="/hunt"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-bold px-6 py-4.5 rounded-2xl shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start New Hunt
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Cards */}
        <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-card-hover hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Card Portfolio</p>
              <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{totalCards}</h3>
            </div>
            <div className="bg-slate-100 group-hover:bg-brand-50 text-slate-600 group-hover:text-brand-600 p-3 rounded-2xl transition">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500 font-medium">Manage credit cards</span>
            <Link
              to="/cards"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-0.5"
            >
              Configure <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Manual Offers */}
        <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-card-hover hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Manual Offers</p>
              <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{totalOffers}</h3>
            </div>
            <div className="bg-slate-100 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 p-3 rounded-2xl transition">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500 font-medium">Cashback & credits active</span>
            <span className="text-xs font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
              Stackable
            </span>
          </div>
        </div>

        {/* Card 3: Recent Searches */}
        <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-card-hover hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hunt History</p>
              <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{recentSearches.length}</h3>
            </div>
            <div className="bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 p-3 rounded-2xl transition">
              <Search className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500 font-medium">Recent product searches</span>
            <span className="text-xs font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
              Tracked
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start Actions Section */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-6 font-display">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/hunt"
            className="group block p-6 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 hover:from-brand-100 hover:to-emerald-100 border border-brand-100/50 hover:border-brand-200 text-slate-800 transition shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-4 transition duration-300 group-hover:scale-110">
              🔍
            </div>
            <h3 className="font-extrabold text-lg tracking-tight mb-2">Configure Hunt</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Create lists and seek maximum cash back stacking for high-end gear.
            </p>
          </Link>

          <Link
            to="/cards"
            className="group block p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-100/50 hover:border-indigo-200 text-slate-800 transition shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-4 transition duration-300 group-hover:scale-110">
              💳
            </div>
            <h3 className="font-extrabold text-lg tracking-tight mb-2">Build Card Wallet</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Select card profiles to enable automatic matching of points multipliers.
            </p>
          </Link>

          <div className="relative group block p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed">
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              SOON
            </div>
            <div className="w-12 h-12 bg-slate-200/50 rounded-xl flex items-center justify-center text-2xl mb-4">
              🔔
            </div>
            <h3 className="font-extrabold text-lg tracking-tight mb-2">Price Drop Alerts</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Auto-trigger alerts when retail items fall beneath designated thresholds.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-display">Recent Hunt Log</h2>
            <button 
              onClick={() => {
                localStorage.removeItem('dealhunter-searches');
                setRecentSearches([]);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 transition"
            >
              Clear Log
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSearches.slice(0, 5).map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between py-4 transition group hover:bg-slate-50/50 px-2 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-brand-700 transition">
                      {search.product}
                    </p>
                    <p className="text-xs text-slate-400">
                      Searched {new Date(search.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {search.savings ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 font-bold text-xs">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Save ${search.savings.toFixed(2)}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Scanned</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
