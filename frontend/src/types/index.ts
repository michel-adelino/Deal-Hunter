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

export interface PortalOffer {
  portal_name: string;
  cashback_rate: number;
  retailer: string;
  retailer_url: string;
  source_url: string;
  scraped_at: string;
  confidence: DealConfidence;
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
  savings_breakdown: StackStep[];
  caveats: string[];
}

export interface HuntResult {
  hunt_id: string;
  status: 'running' | 'complete' | 'error';
  product?: { name: string; canonical_name: string };
  prices: PriceSnapshot[];
  card_benefits: CardBenefit[];
  coupons: CouponResult[];
  portal_offers: PortalOffer[];
  stacked_deal: StackedDeal | null;
}

export type HuntSSEEvent =
  | { type: 'hunt_started'; data: { product: string; canonical_name: string } }
  | { type: 'price_result'; data: PriceSnapshot }
  | { type: 'card_benefit'; data: CardBenefit }
  | { type: 'coupon_result'; data: CouponResult }
  | { type: 'portal_result'; data: PortalOffer }
  | { type: 'stacked_deal'; data: StackedDeal }
  | { type: 'product_complete'; data: { product: string; stacked_deal: StackedDeal | null } }
  | { type: 'hunt_complete'; data: { hunt_id: string; status: string } }
  | { type: 'error'; data: { product: string; message: string } };

export interface UserCard {
  id: string;
  card_type: string;
  label?: string;
  manual_offers: ManualOffer[];
}

export interface ManualOffer {
  merchant: string;
  amount: number;
  description?: string;
  expires_at?: string;
}

export interface Alert {
  id: string;
  product_name: string;
  alert_type: string;
  threshold_price?: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}
