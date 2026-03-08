export interface VipTierConfig {
  tier: 'Normal' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  commissionRate: number; // decimal, e.g. 0.005 = 0.5%
  productsPerSet: number;
  minimumBalance: number;
  productMin: number;
  productMax: number;
}

export const VIP_TIER_CONFIG: Record<VipTierConfig['tier'], VipTierConfig> = {
  Normal: {
    tier: 'Normal',
    commissionRate: 0.005,
    productsPerSet: 35,
    minimumBalance: 99,
    productMin: 99,
    productMax: 398,
  },
  Silver: {
    tier: 'Silver',
    commissionRate: 0.0075,
    productsPerSet: 40,
    minimumBalance: 399,
    productMin: 399,
    productMax: 598,
  },
  Gold: {
    tier: 'Gold',
    commissionRate: 0.01,
    productsPerSet: 45,
    minimumBalance: 599,
    productMin: 599,
    productMax: 1998,
  },
  Platinum: {
    tier: 'Platinum',
    commissionRate: 0.0125,
    productsPerSet: 50,
    minimumBalance: 1999,
    productMin: 1999,
    productMax: 9998,
  },
  Diamond: {
    tier: 'Diamond',
    commissionRate: 0.015,
    productsPerSet: 55,
    minimumBalance: 9999,
    productMin: 9999,
    productMax: 19998,
  },
};

export const VIP_TIER_ORDER: VipTierConfig['tier'][] = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'];

export const getVipTierConfig = (tier: string): VipTierConfig => {
  const normalized = String(tier || '').trim() as VipTierConfig['tier'];
  return VIP_TIER_CONFIG[normalized] || VIP_TIER_CONFIG.Normal;
};
