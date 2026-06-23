import { UserCard } from '../types';
import { getCardInfo } from '../lib/cardLogos';
import { Trash2 } from 'lucide-react';

interface Props {
  card: UserCard;
  onDelete: (id: string) => void;
  onSelect?: () => void;
  isActive?: boolean;
}

export function CardPreview({ card, onDelete, onSelect, isActive }: Props) {
  const info = getCardInfo(card.card_type);

  // Custom premium gradients for specific cards
  const getGradient = (type: string) => {
    switch (type) {
      case 'amex_platinum':
        return 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #334155 100%)'; // Metallic Silver Platinum
      case 'amex_gold':
        return 'linear-gradient(135deg, #b45309 0%, #fbbf24 50%, #d97706 100%)'; // Gold Shimmer
      case 'chase_sapphire_preferred':
      case 'chase_sapphire_reserve':
        return 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e3a8a 100%)'; // Deep Sapphire Blue
      case 'chase_freedom':
        return 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'; // Cyan Blue
      case 'apple_card':
        return 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'; // Apple Silver White
      case 'capital_one_venture':
        return 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)'; // Copper Red
      case 'discover_it':
        return 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #ef4444 100%)'; // Vibrant Orange
      case 'citi_double_cash':
        return 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'; // Citi Blue
      default:
        return 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'; // Dark Slate Glass
    }
  };

  const isLightCard = card.card_type === 'apple_card';
  const textColor = isLightCard ? 'text-slate-800' : 'text-white';
  const textMutedColor = isLightCard ? 'text-slate-500' : 'text-white/70';

  return (
    <div
      onClick={onSelect}
      className={`relative w-full h-56 rounded-2xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl border-2 ${
        isActive 
          ? 'border-brand-500 ring-4 ring-brand-500/20' 
          : 'border-white/10 hover:border-white/20'
      }`}
      style={{
        background: getGradient(card.card_type),
      }}
    >
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

      {/* Holographic Logo watermark */}
      <div className="absolute top-2 right-4 text-7xl opacity-10 select-none">
        {info.logo}
      </div>

      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Card Top */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{info.logo}</span>
              <h3 className={`text-lg font-extrabold tracking-tight ${textColor}`}>
                {card.label || info.name}
              </h3>
            </div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${textMutedColor}`}>
              {info.name}
            </p>
          </div>
        </div>

        {/* Card Chip graphic */}
        <div className="my-1.5 flex items-center justify-between">
          <svg 
            className="w-11 h-9 rounded-md bg-amber-400/90 border border-amber-300/40 p-1 flex flex-col justify-between shadow-sm"
            viewBox="0 0 40 32"
          >
            <path 
              d="M 0 6 L 12 6 M 0 16 L 12 16 M 0 26 L 12 26 M 28 6 L 40 6 M 28 16 L 40 16 M 28 26 L 40 26" 
              stroke="#78350f" 
              strokeWidth="1.5" 
            />
            <rect 
              x="14" 
              y="6" 
              width="12" 
              height="20" 
              rx="2" 
              fill="none" 
              stroke="#78350f" 
              strokeWidth="1.5" 
            />
          </svg>
          <div className={`text-[10px] font-mono tracking-widest ${textMutedColor}`}>
            •••• •••• •••• {card.id.slice(0, 4).toUpperCase()}
          </div>
        </div>

        {/* Card Bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div>
            <p className={`text-[9px] uppercase tracking-wider ${textMutedColor}`}>
              Active Offers
            </p>
            <p className={`text-sm font-bold flex items-center gap-1 ${textColor}`}>
              {card.manual_offers.length > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  {card.manual_offers.length} stackable offer{card.manual_offers.length !== 1 ? 's' : ''}
                </>
              ) : (
                <span className="opacity-60">No manual offers</span>
              )}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card.id);
            }}
            className={`p-2 rounded-xl transition ${
              isLightCard
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Remove Card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
