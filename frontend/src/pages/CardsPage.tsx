import { useCardStore } from '../store/cardStore';
import { CardPreview } from '../components/CardPreview';
import { getCardInfo, CARD_LOGOS } from '../lib/cardLogos';
import { useState } from 'react';
import { Plus, X, Calendar, AlertCircle, Trash2, CreditCard } from 'lucide-react';

export function CardsPage() {
  const cards = useCardStore((state) => state.cards);
  const addCard = useCardStore((state) => state.addCard);
  const removeCard = useCardStore((state) => state.removeCard);
  const addOffer = useCardStore((state) => state.addOffer);
  const removeOffer = useCardStore((state) => state.removeOffer);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    cards.length > 0 ? cards[0].id : null
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCardType, setNewCardType] = useState('');
  const [newCardLabel, setNewCardLabel] = useState('');

  // Add offer form states
  const [offerMerchant, setOfferMerchant] = useState('');
  const [offerValue, setOfferValue] = useState('');
  const [offerType, setOfferType] = useState<'percent' | 'fixed'>('fixed');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerExpiry, setOfferExpiry] = useState('');

  const selectedCard = cards.find((c) => c.id === selectedCardId) || null;

  const handleAddCard = () => {
    if (!newCardType) return;
    const info = getCardInfo(newCardType);
    const newId = crypto.randomUUID();
    addCard({
      id: newId,
      card_type: newCardType,
      label: newCardLabel.trim() || info.name,
      manual_offers: [],
    });
    setSelectedCardId(newId);
    setNewCardType('');
    setNewCardLabel('');
    setShowAddForm(false);
  };

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const cardId = selectedCardId;
    if (!cardId || !offerMerchant.trim() || !offerValue) return;

    const val = parseFloat(offerValue);
    if (isNaN(val)) return;

    addOffer(cardId, {
      merchant: offerMerchant.trim(),
      amount: val,
      description: offerDesc.trim() || `${offerType === 'fixed' ? '$' : ''}${val}${offerType === 'percent' ? '%' : ''} back at ${offerMerchant}`,
      expires_at: offerExpiry || undefined,
    });

    setOfferMerchant('');
    setOfferValue('');
    setOfferDesc('');
    setOfferExpiry('');
  };

  const handleDeleteCard = (id: string) => {
    removeCard(id);
    if (selectedCardId === id) {
      const remaining = cards.filter((c) => c.id !== id);
      setSelectedCardId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const POPULAR_CARD_TYPES = Object.keys(CARD_LOGOS);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 font-display">
            💳 Manage Card Portfolio
          </h1>
          <p className="text-sm text-slate-500">
            Configure your active credit cards and log targeted merchant statement credits.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl shadow-sm transition-all transform active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Credit Card
        </button>
      </div>

      {/* Grid / Sidebar Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Cards Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {cards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map((card) => (
                <CardPreview
                  key={card.id}
                  card={card}
                  onDelete={handleDeleteCard}
                  onSelect={() => setSelectedCardId(card.id)}
                  isActive={selectedCardId === card.id}
                />
              ))}

              {/* Add Card Placeholder Block */}
              <div
                onClick={() => setShowAddForm(true)}
                className="w-full h-56 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50/10 flex flex-col items-center justify-center gap-3 cursor-pointer transition duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500 hover:text-brand-600">
                  Add another credit card
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center shadow-sm">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
                Your Wallet is Empty
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">
                Add credit cards like Chase Sapphire or American Express to activate automatic portal cash back calculators.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-brand-500/20 text-sm transition"
              >
                Add Your First Card
              </button>
            </div>
          )}

          {/* Guidelines Box */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 border border-slate-200/50">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brand-500" />
              Maximize Stacking Rewards
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 font-bold">✓</span>
                Statement credits are auto-calculated in correct sequence to prevent stack disqualification.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 font-bold">✓</span>
                We support fixed dollars back ($15 off) or percentages (10% cash back).
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 font-bold">✓</span>
                Make sure card names match popular networks to pull default point multiplier multipliers.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Sidebar offers drawer */}
        <div className="lg:col-span-5 xl:col-span-4">
          {selectedCard ? (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden sticky top-24">
              {/* Header card preview */}
              <div className="bg-slate-50 p-6 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Selected Card</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getCardInfo(selectedCard.card_type).logo}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-800">{selectedCard.label}</h3>
                    <p className="text-xs text-slate-400">{getCardInfo(selectedCard.card_type).name}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Active offers list */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Active Targeted Offers ({selectedCard.manual_offers.length})
                  </h4>
                  {selectedCard.manual_offers.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedCard.manual_offers.map((offer, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition group"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-slate-800">{offer.merchant}</span>
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-brand-50 text-[10px] font-bold text-brand-600">
                                {(offer.description || '').includes('%') ? 'Cashback' : 'Discount'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">{offer.description || ''}</p>
                            {offer.expires_at && (
                              <p className="text-[9px] text-amber-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Exp: {offer.expires_at}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeOffer(selectedCard.id, index)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-400">No manual coupons logged yet.</p>
                    </div>
                  )}
                </div>

                {/* Add offer form */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Add targeted card credit
                  </h4>
                  <form onSubmit={handleAddOffer} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Merchant Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Best Buy, Nike"
                        value={offerMerchant}
                        onChange={(e) => setOfferMerchant(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Benefit Value
                        </label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="e.g. 10 or 15"
                          value={offerValue}
                          onChange={(e) => setOfferValue(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Reward Format
                        </label>
                        <select
                          value={offerType}
                          onChange={(e) => setOfferType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white"
                        >
                          <option value="fixed">Fixed USD ($)</option>
                          <option value="percent">Percentage (%)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Expires (Optional)
                        </label>
                        <input
                          type="date"
                          value={offerExpiry}
                          onChange={(e) => setOfferExpiry(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Label/Desc (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 10% back limit $15"
                          value={offerDesc}
                          onChange={(e) => setOfferDesc(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl shadow-sm text-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Statement Offer
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 h-96 flex flex-col items-center justify-center gap-2">
              <CreditCard className="w-10 h-10 mb-2 opacity-55" />
              <p className="font-bold text-sm text-slate-500">No Card Selected</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Select one of the credit cards from your portfolio grid to log active promotions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Overlay Modal for Adding Credit Cards */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 font-display">Add Card Template</h2>
                <p className="text-xs text-slate-400">Initialize a credit card layout for rewards matching.</p>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Popular Templates Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-3">
                  Select Card Network / Model
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {POPULAR_CARD_TYPES.map((type) => {
                    const info = getCardInfo(type);
                    const isSelected = newCardType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setNewCardType(type)}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition duration-200 ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                            : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <span className="text-2xl">{info.logo}</span>
                        <div className="overflow-hidden">
                          <p className="font-extrabold text-xs text-slate-800 truncate">{info.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Default</p>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setNewCardType('custom')}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition duration-200 ${
                      newCardType === 'custom'
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">💳</span>
                    <div>
                      <p className="font-extrabold text-xs text-slate-800">Other Card...</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">Custom</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Label configuration */}
              {newCardType && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Custom Label (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. My Personal Platinum, Travel Card"
                      value={newCardLabel}
                      onChange={(e) => setNewCardLabel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                disabled={!newCardType}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs transition"
              >
                Add to Portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
