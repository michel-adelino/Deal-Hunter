import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface Props {
  data: { date: string; [retailer: string]: number | string }[];
  retailers: string[];
  currentPrice: number;
}

// Palette: one distinct color per retailer
const PALETTE = [
  { stroke: '#10b981', fill: '#10b981' }, // emerald
  { stroke: '#6366f1', fill: '#6366f1' }, // indigo
  { stroke: '#f59e0b', fill: '#f59e0b' }, // amber
  { stroke: '#ef4444', fill: '#ef4444' }, // red
  { stroke: '#8b5cf6', fill: '#8b5cf6' }, // violet
  { stroke: '#0ea5e9', fill: '#0ea5e9' }, // sky
];

const RETAILER_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  bestbuy: 'Best Buy',
  target: 'Target',
  walmart: 'Walmart',
  apple: 'Apple',
  newegg: 'Newegg',
  bhphotovideo: 'B&H',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl min-w-[140px]">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-slate-300 capitalize">
              {RETAILER_LABELS[entry.dataKey] ?? entry.dataKey}
            </span>
          </div>
          <span className="text-xs font-black text-white">${Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ retailers }: { retailers: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      {retailers.map((r, i) => {
        const color = PALETTE[i % PALETTE.length].stroke;
        return (
          <div key={r} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[11px] font-semibold text-slate-500 capitalize">
              {RETAILER_LABELS[r] ?? r}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PriceHistoryChart({ data, retailers, currentPrice }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No price history available
      </div>
    );
  }

  // Only show ticks every ~15 days to avoid clutter
  const tickIndices = new Set<number>();
  data.forEach((_, i) => {
    if (i === 0 || i === data.length - 1 || i % 5 === 0) tickIndices.add(i);
  });

  return (
    <div className="w-full space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {retailers.map((r, i) => {
              const color = PALETTE[i % PALETTE.length].fill;
              return (
                <linearGradient key={r} id={`grad-${r}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Current price reference line */}
          <ReferenceLine
            y={currentPrice}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `Current $${currentPrice.toFixed(0)}`,
              position: 'right',
              fontSize: 9,
              fill: '#10b981',
              fontWeight: 700,
            }}
          />

          {retailers.map((r, i) => {
            const { stroke } = PALETTE[i % PALETTE.length];
            return (
              <Area
                key={r}
                type="monotone"
                dataKey={r}
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#grad-${r})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>

      <CustomLegend retailers={retailers} />
    </div>
  );
}
