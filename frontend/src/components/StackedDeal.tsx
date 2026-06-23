import { StackedDeal as StackedDealType } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  deal: StackedDealType;
}

export function StackedDeal({ deal }: Props) {
  const percentSaved = ((deal.total_savings / deal.original_price) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-6">
      
      {/* Waterfall Header Summary */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-800 tracking-tight">Savings Pipeline</h3>
          <p className="text-[11px] text-slate-400 font-medium">Optimal application sequence</p>
        </div>
        <div className="text-right">
          <span className="inline-flex px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-black">
            Save {percentSaved}%
          </span>
        </div>
      </div>

      {/* Start: Original Retail Price */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-200/60 flex items-center justify-center text-xs font-bold text-slate-500">
            0
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Initial Price</p>
            <p className="text-[10px] text-slate-400">Regular retailer listing</p>
          </div>
        </div>
        <span className="font-bold text-slate-500 line-through text-sm">
          ${deal.original_price.toFixed(2)}
        </span>
      </div>

      {/* Pipeline Steps Flow */}
      <div className="space-y-0 pl-4 relative before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-[2px] before:bg-slate-100">
        {deal.steps.map((step) => {
          // Identify step color
          let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
          if (step.action.toLowerCase().includes('coupon') || step.action.toLowerCase().includes('code')) {
            badgeColor = 'bg-amber-50 text-amber-700 border-amber-200/50';
          } else if (step.action.toLowerCase().includes('portal') || step.action.toLowerCase().includes('rakuten')) {
            badgeColor = 'bg-blue-50 text-blue-700 border-blue-200/50';
          } else if (step.action.toLowerCase().includes('card') || step.action.toLowerCase().includes('cashback')) {
            badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
          }

          return (
            <div key={step.order} className="relative pb-6 last:pb-2 pl-6 group">
              {/* Timeline dot */}
              <div className="absolute left-[-15px] top-1 w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm z-10 transition duration-300 group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-100">
                {step.order}
              </div>

              {/* Step info block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-slate-800">{step.action}</p>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${badgeColor}`}>
                      {step.type || 'Stack Step'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Sequence Verified</span>
                    <ConfidenceBadge confidence={step.confidence} />
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                  <span className="text-sm font-extrabold text-brand-600 bg-brand-50/50 px-2 py-1 rounded-lg">
                    -${step.saves.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* End: Final Stacking Net Price */}
      <div className="bg-gradient-to-tr from-brand-500/10 via-emerald-500/5 to-transparent border border-brand-500/20 rounded-3xl p-5 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-brand-800">Final Net Cost</p>
              <p className="text-[10px] text-brand-600">Total reduction: ${deal.total_savings.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-brand-700 tracking-tight">
              ~${deal.final_net_price.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings & Expirations Caveat */}
      {deal.caveats.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Active Stack Disclaimers
          </p>
          <div className="space-y-1.5">
            {deal.caveats.map((caveat, i) => (
              <div 
                key={i} 
                className="flex gap-2 text-[10px] text-amber-700 bg-amber-50/50 rounded-xl p-2.5 border border-amber-100/30"
              >
                <p className="leading-relaxed font-medium">{caveat}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
