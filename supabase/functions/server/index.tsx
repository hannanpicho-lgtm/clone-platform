import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const NODE_ENV = (Deno.env.get('NODE_ENV') || 'development').toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';
const ALLOW_SUPER_ADMIN_KEY_BYPASS = Deno.env.get('ALLOW_SUPER_ADMIN_KEY_BYPASS') === 'true';
const CORS_ALLOWED_ORIGINS = (Deno.env.get('CORS_ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Create singleton Supabase clients
let serviceClient: any = null;
let anonClient: any = null;

const getServiceClient = () => {
  if (!serviceClient) {
    serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return serviceClient;
};

const getAnonClient = () => {
  if (!anonClient) {
    anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return anonClient;
};

const getAdminApiKeys = (): string[] => {
  const directKeys = [
    Deno.env.get('SUPABASE_ADMIN_API_KEY') ?? '',
    Deno.env.get('ADMIN_API_KEY') ?? '',
  ];

  const additional = String(Deno.env.get('ADMIN_API_KEYS') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set([...directKeys, ...additional].filter(Boolean)));
};

const getKvRowsByPrefix = async (prefix: string): Promise<Array<{ key: string; value: any }>> => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('kv_store_44a642d3')
    .select('key,value')
    .like('key', `${prefix}%`);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({ key: row.key, value: row.value }));
};

const getProjectRefFromUrl = (): string | null => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
};

const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';
const NOWPAYMENTS_SUPPORTED_ASSETS = ['BTC', 'ETH', 'USDT'] as const;

const mapNowPaymentsCurrency = (asset: string, network?: string): string => {
  const normalizedAsset = String(asset || '').trim().toUpperCase();
  const normalizedNetwork = String(network || '').trim().toUpperCase();

  if (normalizedAsset === 'BTC') return 'btc';
  if (normalizedAsset === 'ETH') return 'eth';
  if (normalizedAsset === 'USDT') {
    if (normalizedNetwork.includes('TRC20') || normalizedNetwork.includes('TRON')) return 'usdttrc20';
    if (normalizedNetwork.includes('BEP20') || normalizedNetwork.includes('BSC')) return 'usdtbsc';
    return 'usdterc20';
  }
  return normalizedAsset.toLowerCase();
};

const toHexString = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');

const computeNowPaymentsSignature = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHexString(signature);
};

const buildCryptoWebhookUrl = (): string => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const projectRef = getProjectRefFromUrl();
  if (!supabaseUrl || !projectRef) {
    return '/api/crypto/webhook';
  }
  return `${supabaseUrl}/functions/v1/make-server-44a642d3/api/crypto/webhook`;
};

const requireAdminKey = async (c: any): Promise<{ ok: true } | { ok: false; response: any }> => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { ok: false, response: c.json({ error: 'Unauthorized - Missing authorization header' }, 401) };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const expectedKeys = getAdminApiKeys();

  // Accept both legacy JWT and new secret key
  if (expectedKeys.includes(token)) {
    return { ok: true };
  }

  return { ok: false, response: c.json({ error: 'Forbidden - Invalid admin key' }, 403) };
};

// Helper function to verify JWT token and extract user ID
async function verifyJWT(token: string): Promise<{ userId: string | null; error: string | null }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // First attempt: validate token via service client (most resilient to anon key format changes)
  try {
    const supabase = getServiceClient();
    const { data: { user }, error: serviceError } = await supabase.auth.getUser(token);

    if (user && !serviceError) {
      return { userId: user.id, error: null };
    }

    if (serviceError) {
      console.error('Service client verification failed:', serviceError.message || serviceError);
    }
  } catch (error) {
    console.error('Service client JWT verification error:', error);
  }

  // Primary verification: ask Supabase Auth to validate token and return current user
  // This is the most reliable path when JWT signing is asymmetric.
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (authResponse.ok) {
        const authUser = await authResponse.json();
        if (authUser?.id) {
          return { userId: authUser.id, error: null };
        }
      } else {
        const authErrorText = await authResponse.text();
        console.error('Supabase Auth API verification failed:', authResponse.status, authErrorText);
      }
    }
  } catch (error) {
    console.error('Supabase Auth API verification error:', error);
  }
  
  // Fallback: anon client verification
  try {
    const supabase = getAnonClient();
    
    // Set the auth token for this request
    const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
    
    if (user && !supabaseError) {
      return { userId: user.id, error: null };
    }
    
    if (supabaseError) {
      console.error('Anon client error:', supabaseError);
    }
  } catch (error) {
    console.error('Supabase anon client verification failed:', error);
  }

  // Try manual JWT verification as fallback
  try {
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');

    if (jwtSecret) {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);
      const userId = payload.sub;
      const audience = payload.aud;
      const role = payload.role;

      if (userId && audience === 'authenticated' && role === 'authenticated') {
        return { userId, error: null };
      }
    }
  } catch (error) {
    console.error('Manual JWT verification failed:', String(error));
  }

  return { userId: null, error: 'Invalid or expired token' };
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return IS_PRODUCTION ? '' : '*';
      }
      if (!IS_PRODUCTION) {
        return origin;
      }
      return CORS_ALLOWED_ORIGINS.includes(origin) ? origin : '';
    },
    allowHeaders: ["Content-Type", "Authorization", "apikey", "Idempotency-Key", "X-Idempotency-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});
app.get("/products", async (c) => {
  try {
    const products = await getTaskProductCatalog();
    return c.json({ products });
  } catch (error) {
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});
// Generate a unique invitation code
const generateInvitationCode = async (): Promise<string> => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';

  const pieces: string[] = [];
  for (let i = 0; i < 4; i++) {
    pieces.push(letters.charAt(Math.floor(Math.random() * letters.length)));
  }
  pieces.push(digits.charAt(Math.floor(Math.random() * digits.length)));

  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }

  const code = pieces.join('');
  
  // Check if code already exists
  const existing = await kv.get(`invitecode:${code}`);
  if (existing) {
    return generateInvitationCode();
  }
  
  return code;
};

const normalizeInvitationCode = (value: string): string => value.trim().toUpperCase();

const WITHDRAWAL_PASSWORD_HASH_PREFIX = 'sha256:';

const hashWithdrawalPassword = async (value: string): Promise<string> => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  const hashHex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `${WITHDRAWAL_PASSWORD_HASH_PREFIX}${hashHex}`;
};

const verifyWithdrawalPassword = async (
  providedPassword: string,
  storedPassword: string,
): Promise<{ valid: boolean; upgradedHash?: string }> => {
  const normalizedProvided = String(providedPassword || '').trim();
  const normalizedStored = String(storedPassword || '').trim();

  if (!normalizedProvided || !normalizedStored) {
    return { valid: false };
  }

  if (normalizedStored.startsWith(WITHDRAWAL_PASSWORD_HASH_PREFIX)) {
    const providedHash = await hashWithdrawalPassword(normalizedProvided);
    return { valid: providedHash === normalizedStored };
  }

  if (normalizedProvided !== normalizedStored) {
    return { valid: false };
  }

  return {
    valid: true,
    upgradedHash: await hashWithdrawalPassword(normalizedProvided),
  };
};

const DEFAULT_CONTACT_LINKS = {
  whatsapp: 'https://wa.me/1234567890',
  telegram: 'https://t.me/murphy_00754_support',
  whatsapp2: '',
  telegram2: '',
};

const getContactLinksConfig = async () => {
  const row = await kv.get('support:contact-links') || {};
  const hasWhatsapp = Object.prototype.hasOwnProperty.call(row, 'whatsapp');
  const hasTelegram = Object.prototype.hasOwnProperty.call(row, 'telegram');
  const hasWhatsapp2 = Object.prototype.hasOwnProperty.call(row, 'whatsapp2');
  const hasTelegram2 = Object.prototype.hasOwnProperty.call(row, 'telegram2');
  const whatsapp = hasWhatsapp
    ? String(row?.whatsapp ?? '').trim()
    : DEFAULT_CONTACT_LINKS.whatsapp;
  const telegram = hasTelegram
    ? String(row?.telegram ?? '').trim()
    : DEFAULT_CONTACT_LINKS.telegram;
  const whatsapp2 = hasWhatsapp2
    ? String(row?.whatsapp2 ?? '').trim()
    : DEFAULT_CONTACT_LINKS.whatsapp2;
  const telegram2 = hasTelegram2
    ? String(row?.telegram2 ?? '').trim()
    : DEFAULT_CONTACT_LINKS.telegram2;
  return {
    whatsapp,
    telegram,
    whatsapp2,
    telegram2,
    updatedAt: row?.updatedAt || null,
    updatedBy: row?.updatedBy || null,
  };
};

const DEFAULT_DEPOSIT_CONFIG = {
  bank: {
    accountName: 'Tanknewmedia Operations',
    accountNumber: '0000000000',
    bankName: 'Demo Bank',
    routingNumber: '000000000',
    instructions: 'Use your username as payment reference and upload receipt to Customer Service.',
  },
  crypto: {
    network: 'Bitcoin',
    walletAddress: 'bc1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    instructions: 'Select asset/network carefully. Submit transaction hash and source wallet address in your deposit request.',
    defaultAsset: 'BTC',
    assets: [
      {
        asset: 'BTC',
        network: 'Bitcoin',
        walletAddress: 'bc1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        instructions: 'Send BTC on Bitcoin network only.',
      },
      {
        asset: 'ETH',
        network: 'ERC20',
        walletAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        instructions: 'Send ETH on Ethereum (ERC20) only.',
      },
      {
        asset: 'USDC',
        network: 'ERC20',
        walletAddress: '0xuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
        instructions: 'Send USDC on Ethereum (ERC20) only.',
      },
    ],
  },
  minimumAmount: 50,
};

const getDepositConfig = async () => {
  const row = await kv.get('payments:deposit-config') || {};
  const rawCryptoAssets = Array.isArray(row?.crypto?.assets) && row.crypto.assets.length > 0
    ? row.crypto.assets
    : DEFAULT_DEPOSIT_CONFIG.crypto.assets;
  const normalizedCryptoAssets = rawCryptoAssets
    .map((item: any) => ({
      asset: String(item?.asset || '').toUpperCase(),
      network: String(item?.network || ''),
      walletAddress: String(item?.walletAddress || ''),
      instructions: String(item?.instructions || ''),
    }))
    .filter((item: any) => item.asset && item.network && item.walletAddress);
  const fallbackPrimaryAsset = normalizedCryptoAssets[0] || DEFAULT_DEPOSIT_CONFIG.crypto.assets[0];
  const defaultAsset = String(row?.crypto?.defaultAsset || fallbackPrimaryAsset?.asset || DEFAULT_DEPOSIT_CONFIG.crypto.defaultAsset).toUpperCase();
  const defaultAssetConfig = normalizedCryptoAssets.find((item: any) => item.asset === defaultAsset) || fallbackPrimaryAsset;

  return {
    bank: {
      accountName: String(row?.bank?.accountName || DEFAULT_DEPOSIT_CONFIG.bank.accountName),
      accountNumber: String(row?.bank?.accountNumber || DEFAULT_DEPOSIT_CONFIG.bank.accountNumber),
      bankName: String(row?.bank?.bankName || DEFAULT_DEPOSIT_CONFIG.bank.bankName),
      routingNumber: String(row?.bank?.routingNumber || DEFAULT_DEPOSIT_CONFIG.bank.routingNumber),
      instructions: String(row?.bank?.instructions || DEFAULT_DEPOSIT_CONFIG.bank.instructions),
    },
    crypto: {
      network: String(row?.crypto?.network || defaultAssetConfig?.network || DEFAULT_DEPOSIT_CONFIG.crypto.network),
      walletAddress: String(row?.crypto?.walletAddress || defaultAssetConfig?.walletAddress || DEFAULT_DEPOSIT_CONFIG.crypto.walletAddress),
      instructions: String(row?.crypto?.instructions || defaultAssetConfig?.instructions || DEFAULT_DEPOSIT_CONFIG.crypto.instructions),
      defaultAsset,
      assets: normalizedCryptoAssets,
    },
    minimumAmount: Number.isFinite(Number(row?.minimumAmount)) && Number(row.minimumAmount) > 0
      ? Number(row.minimumAmount)
      : DEFAULT_DEPOSIT_CONFIG.minimumAmount,
    updatedAt: row?.updatedAt || null,
    updatedBy: row?.updatedBy || null,
  };
};

const getVipTaskCommissionRate = (vipTier: string): number => {
  const tier = String(vipTier || 'Normal');
  if (tier === 'Silver') return 0.0075;
  if (tier === 'Gold') return 0.01;
  if (tier === 'Platinum') return 0.0125;
  if (tier === 'Diamond') return 0.015;
  return 0.005;
};

const VIP_TIER_ORDER = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;

const VIP_AUTO_UPGRADE_SET_REQUIREMENTS: Record<string, number> = {
  Normal: 3,
  Silver: 4,
  Gold: 5,
  Platinum: 6,
  Diamond: Number.POSITIVE_INFINITY,
};

const normalizeVipTier = (value: unknown): string => {
  const tier = String(value || 'Normal');
  return VIP_TIER_ORDER.includes(tier as any) ? tier : 'Normal';
};

const getNextVipTier = (vipTier: string): string | null => {
  const normalizedTier = normalizeVipTier(vipTier);
  const currentIndex = VIP_TIER_ORDER.indexOf(normalizedTier as any);
  if (currentIndex < 0 || currentIndex >= VIP_TIER_ORDER.length - 1) {
    return null;
  }
  return VIP_TIER_ORDER[currentIndex + 1];
};

const getRequiredSetsForTierUpgrade = (vipTier: string): number => {
  const normalizedTier = normalizeVipTier(vipTier);
  return Number(VIP_AUTO_UPGRADE_SET_REQUIREMENTS[normalizedTier] ?? Number.POSITIVE_INFINITY);
};

const applyVipAutoUpgrade = (user: any, completedSetIncrement: number) => {
  const increment = Number.isInteger(Number(completedSetIncrement)) && Number(completedSetIncrement) > 0
    ? Number(completedSetIncrement)
    : 0;

  const currentTier = normalizeVipTier(user?.vipTier || 'Normal');
  const currentTierSetProgress = Number.isInteger(Number(user?.tierSetProgress)) && Number(user?.tierSetProgress) >= 0
    ? Number(user.tierSetProgress)
    : 0;
  const currentTotalTaskSetsCompleted = Number.isInteger(Number(user?.totalTaskSetsCompleted)) && Number(user?.totalTaskSetsCompleted) >= 0
    ? Number(user.totalTaskSetsCompleted)
    : 0;

  let nextTier = currentTier;
  let nextTierSetProgress = currentTierSetProgress + increment;
  const nextTotalTaskSetsCompleted = currentTotalTaskSetsCompleted + increment;

  const upgrades: Array<{ from: string; to: string; requiredSets: number }> = [];

  while (true) {
    const requiredSets = getRequiredSetsForTierUpgrade(nextTier);
    const candidateNextTier = getNextVipTier(nextTier);
    if (!candidateNextTier || !Number.isFinite(requiredSets) || nextTierSetProgress < requiredSets) {
      break;
    }

    upgrades.push({
      from: nextTier,
      to: candidateNextTier,
      requiredSets,
    });
    nextTierSetProgress -= requiredSets;
    nextTier = candidateNextTier;
  }

  const requiredSetsForNextUpgrade = getRequiredSetsForTierUpgrade(nextTier);

  return {
    vipTier: nextTier,
    tierSetProgress: nextTierSetProgress,
    totalTaskSetsCompleted: nextTotalTaskSetsCompleted,
    upgraded: upgrades.length > 0,
    upgrades,
    requiredSetsForNextUpgrade: Number.isFinite(requiredSetsForNextUpgrade) ? requiredSetsForNextUpgrade : null,
    remainingSetsForNextUpgrade: Number.isFinite(requiredSetsForNextUpgrade)
      ? Math.max(0, requiredSetsForNextUpgrade - nextTierSetProgress)
      : null,
  };
};

const DEFAULT_DAILY_TASK_SET_LIMIT = 3;

const getTasksPerSetByTier = (vipTier: string): number => {
  const tier = String(vipTier || 'Normal');
  if (tier === 'Silver') return 40;
  if (tier === 'Gold') return 45;
  if (tier === 'Platinum') return 50;
  if (tier === 'Diamond') return 55;
  return 35;
};

const PREMIUM_BUNDLE_PRODUCT_NAMES = [
  'Data Optimization Pack',
  'Conversion Booster Kit',
  'Automation Starter Bundle',
  'Audience Growth Add-on',
  'Campaign Performance Add-on',
  'Engagement Booster Add-on',
];

const roundCurrency = (value: number): number => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const resolvePrincipalBalance = (user: any, totalEarned: number): number => {
  const storedPrincipal = Number(user?.principalBalance ?? NaN);
  if (Number.isFinite(storedPrincipal) && storedPrincipal >= 0) {
    return roundCurrency(storedPrincipal);
  }

  const currentBalance = Number(user?.balance ?? 0);
  return roundCurrency(Math.max(0, currentBalance - Number(totalEarned || 0)));
};

const computeTotalEarnings = (user: any, totalEarned: number): number => {
  const principalBalance = resolvePrincipalBalance(user, totalEarned);
  return roundCurrency(principalBalance + Math.max(0, Number(totalEarned || 0)));
};

const TASK_PRODUCT_CATALOG_KEY = 'task-products:catalog';

const TASK_PRODUCT_DEFAULT_CATALOG = [
  { name: 'stainless steel black sink waterfall faucet', image: 'https://source.unsplash.com/1200x1200/?kitchen,faucet,sink' },
  { name: 'wireless bluetooth noise cancelling headphones', image: 'https://source.unsplash.com/1200x1200/?wireless,headphones' },
  { name: 'smart home security camera system', image: 'https://source.unsplash.com/1200x1200/?security,camera,home' },
  { name: 'portable solar power bank charger', image: 'https://source.unsplash.com/1200x1200/?solar,powerbank,charger' },
  { name: 'ergonomic mesh office chair', image: 'https://source.unsplash.com/1200x1200/?ergonomic,office,chair' },
  { name: 'led desk lamp with wireless charging', image: 'https://source.unsplash.com/1200x1200/?led,desk,lamp' },
  { name: 'stainless steel cookware set', image: 'https://source.unsplash.com/1200x1200/?cookware,stainless,steel' },
  { name: 'digital air fryer with touch screen', image: 'https://source.unsplash.com/1200x1200/?air,fryer,kitchen' },
  { name: 'robot vacuum cleaner with mapping', image: 'https://source.unsplash.com/1200x1200/?robot,vacuum' },
  { name: 'electric standing desk converter', image: 'https://source.unsplash.com/1200x1200/?standing,desk' },
  { name: 'waterproof fitness tracker watch', image: 'https://source.unsplash.com/1200x1200/?fitness,tracker,watch' },
  { name: 'ceramic non-stick frying pan', image: 'https://source.unsplash.com/1200x1200/?frying,pan,ceramic' },
];

const TASK_PRODUCT_IMAGE_POOL = TASK_PRODUCT_DEFAULT_CATALOG.map((item) => item.image);
const TASK_PRODUCT_IMAGE_BY_NAME = new Map(
  TASK_PRODUCT_DEFAULT_CATALOG.map((item) => [item.name.toLowerCase(), item.image]),
);

const TASK_PRODUCT_AI_PREFIXES = [
  'Smart', 'Adaptive', 'Dynamic', 'Optimized', 'Secure', 'Cloud', 'Digital', 'Hybrid', 'Premium', 'AI-Ready',
];

const TASK_PRODUCT_AI_OBJECTS = [
  'Analytics Pack', 'Automation Suite', 'Conversion Module', 'Engagement Bundle', 'Workflow Engine', 'Growth Toolkit',
  'Ops Dashboard', 'Commerce Widget', 'Audience Booster', 'Insights Builder',
];

const getTaskAmountRangeByTier = (vipTier: string): { min: number; max: number } => {
  const tier = String(vipTier || 'Normal');
  if (tier === 'Diamond') return { min: 9999, max: 19998 };
  if (tier === 'Platinum') return { min: 1999, max: 9998 };
  if (tier === 'Gold') return { min: 599, max: 1998 };
  if (tier === 'Silver') return { min: 399, max: 598 };
  return { min: 99, max: 398 };
};

const getMinimumRequiredBalanceForVip = (vipTier: string): number => {
  const amountRange = getTaskAmountRangeByTier(vipTier);
  const tierMinimum = Math.ceil(Number(amountRange?.min || 0));
  return Math.max(100, tierMinimum);
};

const formatTaskTimestamp = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const isValidTaskProductImageUrl = (value: any) => /^https?:\/\//i.test(String(value || '').trim());

const buildDefaultTaskProductCatalog = () => {
  return TASK_PRODUCT_DEFAULT_CATALOG.map((item, index) => ({
    id: `task_default_${index + 1}`,
    name: item.name,
    image: item.image,
    isActive: true,
    isPremiumTemplate: index < 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

const normalizeTaskProduct = (input: any, index: number) => {
  const normalizedName = String(input?.name || '').trim();
  const fallbackName = `task product ${index + 1}`;
  const normalizedImage = String(input?.image || '').trim();

  return {
    id: String(input?.id || `task_${Date.now()}_${index}`).trim(),
    name: normalizedName || fallbackName,
    image: normalizedImage,
    isActive: input?.isActive === undefined ? true : Boolean(input?.isActive),
    isArchived: Boolean(input?.isArchived),
    isPremiumTemplate: Boolean(input?.isPremiumTemplate),
    createdAt: input?.createdAt || new Date().toISOString(),
    updatedAt: input?.updatedAt || new Date().toISOString(),
  };
};

const getTaskProductCatalog = async () => {
  const row = await kv.get(TASK_PRODUCT_CATALOG_KEY);
  const rawProducts = Array.isArray(row?.products) ? row.products : [];

  if (rawProducts.length === 0) {
    const defaults = buildDefaultTaskProductCatalog();
    await kv.set(TASK_PRODUCT_CATALOG_KEY, {
      products: defaults,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    });
    return defaults;
  }

  const normalizedProducts = rawProducts.map((item: any, index: number) => {
    const normalized = normalizeTaskProduct(item, index);
    const canonicalImage = TASK_PRODUCT_IMAGE_BY_NAME.get(String(normalized.name || '').toLowerCase());
    if (canonicalImage) {
      return {
        ...normalized,
        image: canonicalImage,
      };
    }
    return normalized;
  });
  const sanitizedProducts = normalizedProducts.filter((item: any) => {
    if (!String(item?.name || '').trim()) return false;
    if (!isValidTaskProductImageUrl(item?.image)) return false;
    return true;
  });

  if (sanitizedProducts.length !== rawProducts.length) {
    await saveTaskProductCatalog(sanitizedProducts, 'system_sanitize_images');
  }

  return sanitizedProducts;
};

const saveTaskProductCatalog = async (products: any[], updatedBy: string) => {
  await kv.set(TASK_PRODUCT_CATALOG_KEY, {
    products,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
};

const generateAiTaskProducts = (count: number) => {
  const safeCount = Math.max(1, Math.min(50, Math.floor(Number(count) || 1)));
  const now = new Date().toISOString();

  const generated = [];
  for (let index = 0; index < safeCount; index++) {
    const prefix = TASK_PRODUCT_AI_PREFIXES[(Math.floor(Math.random() * TASK_PRODUCT_AI_PREFIXES.length) + index) % TASK_PRODUCT_AI_PREFIXES.length];
    const obj = TASK_PRODUCT_AI_OBJECTS[(Math.floor(Math.random() * TASK_PRODUCT_AI_OBJECTS.length) + index) % TASK_PRODUCT_AI_OBJECTS.length];
    generated.push({
      id: `task_ai_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${prefix} ${obj}`,
      image: TASK_PRODUCT_IMAGE_POOL[(Math.floor(Math.random() * TASK_PRODUCT_IMAGE_POOL.length) + index) % TASK_PRODUCT_IMAGE_POOL.length],
      isActive: true,
      isArchived: false,
      isPremiumTemplate: Math.random() < 0.2,
      createdAt: now,
      updatedAt: now,
    });
  }

  return generated;
};

const getRandomTaskProduct = (products: any[], options?: { premiumOnly?: boolean }) => {
  const premiumOnly = Boolean(options?.premiumOnly);
  const filtered = products.filter((item: any) => {
    if (item?.isArchived) return false;
    if (!item?.isActive) return false;
    if (premiumOnly && !item?.isPremiumTemplate) return false;
    return true;
  });
  if (filtered.length === 0) return null;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
};

const buildNextTaskProduct = async (userProfile: any, nextTaskNumber: number) => {
  const vipTier = String(userProfile?.vipTier || 'Normal');
  const rate = getVipTaskCommissionRate(vipTier);
  const amountRange = getTaskAmountRangeByTier(vipTier);
  const catalog = await getTaskProductCatalog();

  const assignment = userProfile?.premiumAssignment || null;
  const premiumPosition = Number(assignment?.position ?? 0);
  const shouldUsePremiumProduct = Boolean(
    assignment
    && !assignment?.encounteredAt
    && Number.isInteger(premiumPosition)
    && premiumPosition > 0
    && nextTaskNumber === premiumPosition
  );

  if (shouldUsePremiumProduct) {
    const assignedCatalogProduct = assignment?.productId
      ? catalog.find((item: any) => String(item?.id || '') === String(assignment.productId))
      : null;
    const fallbackPremiumProduct = getRandomTaskProduct(catalog, { premiumOnly: true }) || getRandomTaskProduct(catalog) || null;
    const premiumProduct = assignedCatalogProduct || fallbackPremiumProduct;
    const premiumAmount = roundCurrency(Number(assignment?.amount ?? assignment?.enteredAmount ?? 0));
    const resolvedAmount = premiumAmount > 0
      ? premiumAmount
      : roundCurrency((amountRange.min + amountRange.max) / 2);
    const createdAt = formatTaskTimestamp(new Date());

    return {
      name: String(assignment?.productName || premiumProduct?.name || 'Premium Assigned Product'),
      image: String(assignment?.productImage || premiumProduct?.image || TASK_PRODUCT_IMAGE_POOL[0]),
      totalAmount: resolvedAmount,
      profit: roundCurrency(resolvedAmount * rate),
      creationTime: createdAt,
      ratingNo: Math.random().toString(36).substring(2, 12),
      isPremium: true,
      premiumMeta: {
        position: premiumPosition,
        orderId: assignment?.orderId || null,
      },
    };
  }

  const product = getRandomTaskProduct(catalog) || {
    name: 'Default Task Product',
    image: TASK_PRODUCT_IMAGE_POOL[0],
  };

  const amount = roundCurrency(
    amountRange.min + Math.random() * Math.max(1, amountRange.max - amountRange.min)
  );

  return {
    name: String(product?.name || 'Task Product'),
    image: String(product?.image || TASK_PRODUCT_IMAGE_POOL[0]),
    totalAmount: amount,
    profit: roundCurrency(amount * rate),
    creationTime: formatTaskTimestamp(new Date()),
    ratingNo: Math.random().toString(36).substring(2, 12),
    isPremium: false,
    premiumMeta: null,
  };
};

const buildPremiumBundleDetails = (enteredPremiumAmount: number) => {
  const premiumAmount = roundCurrency(enteredPremiumAmount);
  const individualProductCount = Math.random() < 0.5 ? 1 : 3;
  const bundleItems: Array<{ name: string; type: 'premium' | 'individual'; amount: number }> = [];

  const premiumCoreAmount = roundCurrency(premiumAmount * 0.62);
  bundleItems.push({
    name: 'Premium Core Product',
    type: 'premium',
    amount: premiumCoreAmount,
  });

  let remaining = roundCurrency(Math.max(0, premiumAmount - premiumCoreAmount));
  for (let index = 0; index < individualProductCount; index++) {
    const isLast = index === individualProductCount - 1;
    const rawSlice = isLast
      ? remaining
      : roundCurrency(remaining / (individualProductCount - index));
    const amount = roundCurrency(Math.max(0, rawSlice));
    remaining = roundCurrency(Math.max(0, remaining - amount));

    bundleItems.push({
      name: PREMIUM_BUNDLE_PRODUCT_NAMES[(Math.floor(Math.random() * PREMIUM_BUNDLE_PRODUCT_NAMES.length) + index) % PREMIUM_BUNDLE_PRODUCT_NAMES.length],
      type: 'individual',
      amount,
    });
  }

  const normalizedBundleTotal = roundCurrency(bundleItems.reduce((sum, item) => sum + item.amount, 0));

  return {
    bundleTotal: normalizedBundleTotal,
    individualProductCount,
    bundleItems,
  };
};

const getVipPremiumProfitRate = (vipTier: string): number => {
  const tier = String(vipTier || 'Normal');
  if (tier === 'Silver') return 0.075;
  if (tier === 'Gold') return 0.1;
  if (tier === 'Platinum') return 0.125;
  if (tier === 'Diamond') return 0.15;
  return 0.05;
};

const buildTaskState = (user: any) => {
  const dailyTaskSetLimit = Number.isInteger(Number(user?.dailyTaskSetLimit)) && Number(user?.dailyTaskSetLimit) > 0
    ? Number(user.dailyTaskSetLimit)
    : DEFAULT_DAILY_TASK_SET_LIMIT;
  const extraTaskSets = Number.isInteger(Number(user?.extraTaskSets)) && Number(user?.extraTaskSets) >= 0
    ? Number(user.extraTaskSets)
    : 0;
  const taskSetsCompletedToday = Number.isInteger(Number(user?.taskSetsCompletedToday)) && Number(user?.taskSetsCompletedToday) >= 0
    ? Number(user.taskSetsCompletedToday)
    : 0;
  const currentSetTasksCompleted = Number.isInteger(Number(user?.currentSetTasksCompleted)) && Number(user?.currentSetTasksCompleted) >= 0
    ? Number(user.currentSetTasksCompleted)
    : 0;
  const currentSetDate = typeof user?.currentSetDate === 'string' ? user.currentSetDate : null;
  const tasksPerSet = getTasksPerSetByTier(user?.vipTier || 'Normal');

  return {
    dailyTaskSetLimit,
    extraTaskSets,
    taskSetsCompletedToday,
    currentSetTasksCompleted,
    currentSetDate,
    tasksPerSet,
  };
};

const ADMIN_PERMISSION_ALL = '*';
const ADMIN_ALLOWED_PERMISSIONS = [
  'users.view',
  'users.manage_status',
  'users.adjust_balance',
  'users.assign_premium',
  'users.reset_tasks',
  'users.manage_task_limits',
  'users.unfreeze',
  'users.update_vip',
  'support.manage',
  'withdrawals.manage',
  'invitations.manage',
  'premium.manage',
] as const;

type AdminPermission = typeof ADMIN_ALLOWED_PERMISSIONS[number] | '*';

type AdminAccessGranted = {
  ok: true;
  isSuperAdmin: boolean;
  userId: string | null;
  permissions: AdminPermission[];
};

type AdminAccessDenied = {
  ok: false;
  response: any;
};

type AdminAccessResult = AdminAccessGranted | AdminAccessDenied;

const BASELINE_LIMITED_ADMIN_PERMISSIONS: AdminPermission[] = [
  'users.view',
  'users.manage_status',
  'users.adjust_balance',
  'users.assign_premium',
  'support.manage',
];

const sanitizeAdminPermissions = (permissions: unknown): AdminPermission[] => {
  if (!Array.isArray(permissions)) {
    return [];
  }
  const legacyPermissionMap: Record<string, AdminPermission[]> = {
    'users.manage': ['users.manage_status', 'users.adjust_balance', 'users.reset_tasks', 'users.manage_task_limits', 'users.unfreeze', 'users.update_vip'],
    'premium.assign': ['users.assign_premium'],
    'premium.manage': ['users.assign_premium'],
  };
  const unique = new Set<string>();
  for (const value of permissions) {
    const permission = String(value || '').trim();
    if (!permission) continue;
    if (legacyPermissionMap[permission]) {
      for (const mappedPermission of legacyPermissionMap[permission]) {
        unique.add(mappedPermission);
      }
      continue;
    }

      const ADMIN_AUDIT_LOG_KEY = 'admin:audit-log';

      type AdminAuditActor = {
        isSuperAdmin: boolean;
        userId: string | null;
      };

      const appendAdminAuditLog = async (
        actor: AdminAuditActor,
        action: string,
        options?: {
          targetUserId?: string | null;
          targetIdentifier?: string | null;
          meta?: Record<string, unknown>;
        },
      ) => {
        const existing = await kv.get(ADMIN_AUDIT_LOG_KEY);
        const logs = Array.isArray(existing) ? existing : [];
        const entry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          action,
          actorUserId: actor.userId,
          actorType: actor.isSuperAdmin ? 'super_admin' : 'limited_admin',
          targetUserId: options?.targetUserId || null,
          targetIdentifier: options?.targetIdentifier || null,
          createdAt: new Date().toISOString(),
          meta: options?.meta || {},
        };
        await kv.set(ADMIN_AUDIT_LOG_KEY, [entry, ...logs].slice(0, 500));
      };
    if (permission === ADMIN_PERMISSION_ALL || ADMIN_ALLOWED_PERMISSIONS.includes(permission as any)) {
      unique.add(permission);
    }
  }
  return Array.from(unique) as AdminPermission[];
};

const requireSuperAdmin = async (c: any): Promise<{ ok: true } | { ok: false; response: any }> => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { ok: false, response: c.json({ error: 'Unauthorized - Missing authorization header' }, 401) };
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const expectedKeys = getAdminApiKeys();
  if (!ALLOW_SUPER_ADMIN_KEY_BYPASS || expectedKeys.length === 0 || !expectedKeys.includes(token)) {
    return { ok: false, response: c.json({ error: 'Forbidden - Super admin key required' }, 403) };
  }
  return { ok: true };
};

const requireAdminPermission = async (
  c: any,
  requiredPermission: AdminPermission,
): Promise<AdminAccessResult> => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { ok: false, response: c.json({ error: 'Unauthorized - Missing authorization header' }, 401) };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const expectedKeys = getAdminApiKeys();

  if (ALLOW_SUPER_ADMIN_KEY_BYPASS && expectedKeys.includes(token)) {
    return { ok: true, isSuperAdmin: true, userId: null, permissions: [ADMIN_PERMISSION_ALL] };
  }

  const { userId, error } = await verifyJWT(token);
  if (error || !userId) {
    return { ok: false, response: c.json({ error: 'Forbidden - Invalid admin token' }, 403) };
  }

  const adminAccount = await kv.get(`admin:account:${userId}`);
  if (!adminAccount || adminAccount.active === false) {
    return { ok: false, response: c.json({ error: 'Forbidden - Admin account is inactive or not found' }, 403) };
  }

  const permissions = sanitizeAdminPermissions(adminAccount.permissions);
  const hasPermission = permissions.includes(ADMIN_PERMISSION_ALL) || permissions.includes(requiredPermission);

  if (!hasPermission) {
    return { ok: false, response: c.json({ error: `Forbidden - Missing permission: ${requiredPermission}` }, 403) };
  }

  return { ok: true, isSuperAdmin: false, userId, permissions };
};

const requireSupportAccess = async (c: any): Promise<AdminAccessResult> => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { ok: false, response: c.json({ error: 'Unauthorized - Missing authorization header' }, 401) };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const expectedKeys = getAdminApiKeys();

  if (ALLOW_SUPER_ADMIN_KEY_BYPASS && expectedKeys.includes(token)) {
    return { ok: true, isSuperAdmin: true, userId: null, permissions: [ADMIN_PERMISSION_ALL] as AdminPermission[] };
  }

  const { userId, error } = await verifyJWT(token);
  if (error || !userId) {
    return { ok: false, response: c.json({ error: 'Forbidden - Invalid admin token' }, 403) };
  }

  const adminAccount = await kv.get(`admin:account:${userId}`);
  if (!adminAccount || adminAccount.active === false) {
    return { ok: false, response: c.json({ error: 'Forbidden - Admin account is inactive or not found' }, 403) };
  }

  const permissions = sanitizeAdminPermissions(adminAccount.permissions);
  return { ok: true, isSuperAdmin: false, userId, permissions };

};

type AdminScopeConfig =
  | { mode: 'all' }
  | { mode: 'parent'; parentUserId: string }
  | { mode: 'users'; userIds: Set<string> };

const getAdminScopeConfig = async (adminAccess: { isSuperAdmin: boolean; userId: string | null }): Promise<AdminScopeConfig> => {
  if (adminAccess.isSuperAdmin || !adminAccess.userId) {
    return { mode: 'all' };
  }

  return { mode: 'parent', parentUserId: String(adminAccess.userId) };
};

const isUserInAdminScope = (scope: AdminScopeConfig, user: any): boolean => {
  if (scope.mode === 'all') {
    return true;
  }

  if (!user?.id) {
    return false;
  }

  if (scope.mode === 'users') {
    return scope.userIds.has(String(user.id));
  }

  return String(user?.parentUserId || '') === scope.parentUserId;
};

const getAdminScopeFromAccount = (adminAccount: any): AdminScopeConfig => {
  const managedUserIds = Array.isArray(adminAccount?.managedUserIds)
    ? adminAccount.managedUserIds.map((value: any) => String(value || '').trim()).filter(Boolean)
    : [];
  if (managedUserIds.length > 0) {
    return { mode: 'users', userIds: new Set(managedUserIds) };
  }

  const managedParentUserId = String(adminAccount?.managedParentUserId || '').trim();
  if (managedParentUserId) {
    return { mode: 'parent', parentUserId: managedParentUserId };
  }

  const fallbackParentUserId = String(adminAccount?.userId || '').trim();
  if (fallbackParentUserId) {
    return { mode: 'parent', parentUserId: fallbackParentUserId };
  }

  return { mode: 'all' };
};

const resolveFrozenNegativeAmount = (user: any): number => {
  if (!Boolean(user?.accountFrozen)) {
    return 0;
  }

  const balance = Number(user?.balance ?? 0);
  if (balance < 0) {
    return roundCurrency(Math.abs(balance));
  }

  return roundCurrency(Math.max(0, Number(user?.freezeAmount ?? 0)));
};

const resolveUserTotalEarnings = async (user: any): Promise<number> => {
  const explicitTotalEarnings = Number(user?.totalEarnings ?? NaN);
  if (Number.isFinite(explicitTotalEarnings) && explicitTotalEarnings >= 0) {
    return roundCurrency(explicitTotalEarnings);
  }

  const userId = String(user?.id || '').trim();
  if (!userId) {
    return 0;
  }

  const profits = await kv.get(`profits:${userId}`) || { totalEarned: 0 };
  const totalEarned = Number(profits?.totalEarned || 0);
  return computeTotalEarnings(user, totalEarned);
};

const getRequesterIp = (c: any): string => {
  const forwardedFor = String(c.req.header('x-forwarded-for') || '').trim();
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim() || 'unknown';
  }

  return String(
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-client-ip') ||
    'unknown',
  ).trim() || 'unknown';
};

const getRequesterCountry = (c: any): string => {
  const countryCode = String(
    c.req.header('cf-ipcountry') ||
    c.req.header('x-country-code') ||
    '',
  ).trim().toUpperCase();

  if (!countryCode || countryCode === 'XX') {
    return 'Unknown';
  }

  return countryCode;
};

const getRequestLocation = (c: any): { ip: string; country: string } => ({
  ip: getRequesterIp(c),
  country: getRequesterCountry(c),
});

type ServerLogLevel = 'info' | 'warn' | 'error';

const logServerEvent = (
  level: ServerLogLevel,
  event: string,
  details: Record<string, unknown> = {},
): void => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  if (level === 'warn') {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
};

const toCountryDisplayName = (countryCodeOrName: string): string => {
  const value = String(countryCodeOrName || '').trim();
  if (!value) return 'Unknown';
  if (value.length !== 2) return value;

  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const regionName = displayNames.of(value.toUpperCase());
    return regionName || value.toUpperCase();
  } catch {
    return value.toUpperCase();
  }
};

const isPrivateOrLocalIp = (ipAddress: string): boolean => {
  const ip = String(ipAddress || '').trim().replace(/^::ffff:/i, '');
  if (!ip) return true;

  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;

  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip)) {
    return true;
  }

  return false;
};

const resolveBestRequestLocation = async (c: any): Promise<{ ip: string; country: string }> => {
  const base = getRequestLocation(c);
  const normalizedIp = String(base.ip || '').trim().replace(/^::ffff:/i, '');
  const normalizedCountry = toCountryDisplayName(base.country || 'Unknown');

  if (normalizedCountry !== 'Unknown' || !normalizedIp || normalizedIp === 'unknown' || isPrivateOrLocalIp(normalizedIp)) {
    return {
      ip: normalizedIp || 'unknown',
      country: normalizedCountry,
    };
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(normalizedIp)}`);
    if (response.ok) {
      const geo = await response.json();
      if (geo?.success) {
        const countryName = String(geo?.country || '').trim();
        const cityName = String(geo?.city || '').trim();
        const regionName = String(geo?.region || '').trim();
        const bestCountry = countryName || normalizedCountry;
        const locationLabel = cityName
          ? `${cityName}${regionName ? `, ${regionName}` : ''}, ${bestCountry}`
          : bestCountry;

        return {
          ip: normalizedIp,
          country: locationLabel || 'Unknown',
        };
      }
    }
  } catch (error) {
    console.warn(`Geo lookup failed for ip ${normalizedIp}: ${error}`);
  }

  return {
    ip: normalizedIp,
    country: normalizedCountry,
  };
};

const getAdminRateLimitIdentity = (c: any, adminAccess: { isSuperAdmin: boolean; userId: string | null }): string => {
  const ip = getRequesterIp(c);
  if (adminAccess.isSuperAdmin) {
    return `super:${ip}`;
  }
  return `admin:${adminAccess.userId || 'unknown'}:${ip}`;
};

const enforceAdminRateLimit = async (
  c: any,
  adminAccess: { isSuperAdmin: boolean; userId: string | null },
  action: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> => {
  const identity = getAdminRateLimitIdentity(c, adminAccess);
  const rateLimitKey = `admin:ratelimit:${action}:${identity}`;
  const nowMs = Date.now();

  const state = await kv.get(rateLimitKey) || {};
  const windowStartedAtMs = Number(state.windowStartedAtMs || 0);
  const count = Number(state.count || 0);
  const withinWindow = windowStartedAtMs > 0 && (nowMs - windowStartedAtMs) < windowMs;
  const nextCount = withinWindow ? count + 1 : 1;
  const nextWindowStart = withinWindow ? windowStartedAtMs : nowMs;

  if (withinWindow && count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (nowMs - windowStartedAtMs)) / 1000));
    return { allowed: false, retryAfterSec };
  }

  await kv.set(rateLimitKey, {
    count: nextCount,
    windowStartedAtMs: nextWindowStart,
    updatedAtMs: nowMs,
  });

  return { allowed: true };
};

const enforcePublicRateLimit = async (
  c: any,
  action: string,
  limit: number,
  windowMs: number,
  identityOverride?: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> => {
  const ip = getRequesterIp(c);
  const identity = String(identityOverride || ip || 'unknown').trim();
  const rateLimitKey = `public:ratelimit:${action}:${identity}`;
  const nowMs = Date.now();

  const state = await kv.get(rateLimitKey) || {};
  const windowStartedAtMs = Number(state.windowStartedAtMs || 0);
  const count = Number(state.count || 0);
  const withinWindow = windowStartedAtMs > 0 && (nowMs - windowStartedAtMs) < windowMs;
  const nextCount = withinWindow ? count + 1 : 1;
  const nextWindowStart = withinWindow ? windowStartedAtMs : nowMs;

  if (withinWindow && count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (nowMs - windowStartedAtMs)) / 1000));
    return { allowed: false, retryAfterSec };
  }

  await kv.set(rateLimitKey, {
    count: nextCount,
    windowStartedAtMs: nextWindowStart,
    updatedAtMs: nowMs,
  });

  return { allowed: true };
};

const getIdempotencyKey = (c: any): string => {
  return String(
    c.req.header('Idempotency-Key')
    || c.req.header('idempotency-key')
    || c.req.header('X-Idempotency-Key')
    || c.req.header('x-idempotency-key')
    || c.req.raw?.headers?.get?.('Idempotency-Key')
    || c.req.raw?.headers?.get?.('idempotency-key')
    || c.req.raw?.headers?.get?.('X-Idempotency-Key')
    || c.req.raw?.headers?.get?.('x-idempotency-key')
    || ''
  ).trim();
};

const buildIdempotencyStoreKey = (scope: string, actorId: string, idempotencyKey: string): string => {
  return `idempotency:${scope}:${actorId}:${idempotencyKey}`;
};

const beginIdempotentOperation = async (
  storeKey: string,
  fingerprint: string,
): Promise<
  | { state: 'started' }
  | { state: 'replay'; responseStatus: any; responseBody: any }
  | { state: 'in_progress' }
  | { state: 'conflict' }
> => {
  const nowIso = new Date().toISOString();
  const existing = await kv.get(storeKey);
  if (existing) {
    if (String(existing.fingerprint || '') !== fingerprint) {
      return { state: 'conflict' };
    }
    if (existing.state === 'completed') {
      return {
        state: 'replay',
        responseStatus: Number(existing.responseStatus || 200),
        responseBody: existing.responseBody || { success: true },
      };
    }
    return { state: 'in_progress' };
  }

  await kv.set(storeKey, {
    state: 'in_progress',
    fingerprint,
    startedAt: nowIso,
    updatedAt: nowIso,
  });
  return { state: 'started' };
};

const completeIdempotentOperation = async (
  storeKey: string,
  fingerprint: string,
  responseStatus: number,
  responseBody: any,
): Promise<void> => {
  const nowIso = new Date().toISOString();
  await kv.set(storeKey, {
    state: 'completed',
    fingerprint,
    responseStatus,
    responseBody,
    completedAt: nowIso,
    updatedAt: nowIso,
  });
};

const delayMs = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const acquireFinancialLock = async (
  scope: string,
  actorId: string,
  maxWaitMs = 4000,
  leaseMs = 15000,
): Promise<(() => Promise<void>) | null> => {
  const normalizedScope = String(scope || '').trim().toLowerCase();
  const normalizedActor = String(actorId || '').trim();
  if (!normalizedScope || !normalizedActor) {
    return null;
  }

  const lockKey = `finance:lock:${normalizedScope}:${normalizedActor}`;
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < maxWaitMs) {
    const now = Date.now();
    const existing = await kv.get(lockKey);
    const existingExpiresAt = Number(existing?.expiresAt || 0);
    const lockHeld = existing && Number.isFinite(existingExpiresAt) && existingExpiresAt > now;

    if (!lockHeld) {
      const token = `${now}_${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = now + leaseMs;
      await kv.set(lockKey, {
        token,
        acquiredAt: new Date(now).toISOString(),
        expiresAt,
      });

      const verify = await kv.get(lockKey);
      if (String(verify?.token || '') === token) {
        return async () => {
          const current = await kv.get(lockKey);
          if (String(current?.token || '') === token) {
            await kv.del(lockKey);
          }
        };
      }
    }

    await delayMs(75);
  }

  return null;
};

const appendUniqueQueueId = async (queueKey: string, id: string, maxLen = 2000): Promise<string[]> => {
  const existing = await kv.get(queueKey) || [];
  const queue = Array.isArray(existing) ? existing.map((value: any) => String(value)) : [];
  if (!queue.includes(id)) {
    queue.push(id);
  }
  const trimmed = queue.slice(-maxLen);
  await kv.set(queueKey, trimmed);
  return trimmed;
};

const removeQueueId = async (queueKey: string, id: string): Promise<string[]> => {
  const existing = await kv.get(queueKey) || [];
  const queue = Array.isArray(existing) ? existing.map((value: any) => String(value)) : [];
  const updated = queue.filter((value: string) => value !== id);
  await kv.set(queueKey, updated);
  return updated;
};

const buildWithdrawalStoreKey = (withdrawalId: string): string => `withdrawal:${String(withdrawalId || '').trim()}`;

const buildUserWithdrawalIndexKey = (userId: string): string => `withdrawals:user:${String(userId || '').trim()}`;

const appendUserWithdrawalIndex = async (userId: string, withdrawalId: string): Promise<string[]> => {
  return appendUniqueQueueId(buildUserWithdrawalIndexKey(userId), String(withdrawalId), 5000);
};

const removeUserWithdrawalIndex = async (userId: string, withdrawalId: string): Promise<string[]> => {
  return removeQueueId(buildUserWithdrawalIndexKey(userId), String(withdrawalId));
};

const listWithdrawalsByUserId = async (userId: string): Promise<any[]> => {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  const indexedIds = uniqueStringArray(await kv.get(buildUserWithdrawalIndexKey(normalizedUserId)) || []);
  if (indexedIds.length > 0) {
    const records = await kv.mget(indexedIds.map((id) => buildWithdrawalStoreKey(id)));
    return (records || []).filter((entry: any) => String(entry?.userId || '') === normalizedUserId);
  }

  const fallback = await kv.getByPrefix('withdrawal:');
  return (fallback || []).filter((entry: any) => String(entry?.userId || '') === normalizedUserId);
};

const createFinancialOperation = async (
  type: string,
  actorId: string,
  metadata: Record<string, any>,
): Promise<string> => {
  const operationId = `finop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await kv.set(`finance:operation:${operationId}`, {
    id: operationId,
    type,
    actorId,
    status: 'in_progress',
    metadata,
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return operationId;
};

const appendFinancialOperationStep = async (
  operationId: string,
  step: string,
  details?: Record<string, any>,
): Promise<void> => {
  const key = `finance:operation:${operationId}`;
  const current = await kv.get(key);
  if (!current) return;

  const steps = Array.isArray(current.steps) ? current.steps : [];
  steps.push({
    step,
    details: details || null,
    at: new Date().toISOString(),
  });

  await kv.set(key, {
    ...current,
    steps,
    updatedAt: new Date().toISOString(),
  });
};

const finalizeFinancialOperation = async (
  operationId: string,
  status: 'completed' | 'failed',
  summary?: Record<string, any>,
): Promise<void> => {
  const key = `finance:operation:${operationId}`;
  const current = await kv.get(key);
  if (!current) return;

  await kv.set(key, {
    ...current,
    status,
    summary: summary || null,
    completedAt: status === 'completed' ? new Date().toISOString() : (current.completedAt || null),
    failedAt: status === 'failed' ? new Date().toISOString() : (current.failedAt || null),
    updatedAt: new Date().toISOString(),
  });
};

const uniqueStringArray = (values: any[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values || []) {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

const isLikelyTestUser = (user: any): boolean => {
  const email = String(user?.email || '').trim().toLowerCase();
  const username = String(user?.username || '').trim().toLowerCase();

  if (!email && !username) {
    return false;
  }

  if (email.endsWith('@tank.local') || email.endsWith('@test.local')) {
    return true;
  }

  if (
    username.startsWith('user_')
    || username.startsWith('child_')
    || username.startsWith('cs_user_')
    || username.startsWith('premium_test_')
    || username.startsWith('verify_premium_')
  ) {
    return true;
  }

  if (
    email.startsWith('premium-test-')
    || email.startsWith('verify-premium-')
    || email.startsWith('user_')
    || email.startsWith('child_')
    || email.startsWith('cs_user_')
  ) {
    return true;
  }

  return false;
};

const buildNeutralizedTestUser = (user: any) => {
  const now = new Date().toISOString();
  return {
    ...user,
    accountFrozen: false,
    freezeAmount: 0,
    balance: 0,
    premiumAssignment: null,
    productsSubmitted: 0,
    totalProfitFromChildren: 0,
    taskSetsCompletedToday: 0,
    currentSetTasksCompleted: 0,
    currentSetDate: null,
    updatedAt: now,
    testDataCleanup: {
      cleanedAt: now,
      mode: 'neutralized',
    },
  };
};

const AUTH_EMAIL_DOMAIN = 'auth.tank.local';

const normalizeUsername = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
};

const buildAuthEmailFromUsername = (username: string): string => {
  const normalized = normalizeUsername(username);
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isRoutableEmail = (value: string): boolean => {
  return isValidEmail(value) && !value.endsWith(`@${AUTH_EMAIL_DOMAIN}`);
};

// Email service for sending notifications
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SENDER_EMAIL = 'notifications@platform.com';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[Email Skipped - No API Key] To: ${to}, Subject: ${subject}`);
    return true; // Don't fail if no API key, just log
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error(`Email send failed: ${response.statusText}`, await response.text());
      return false;
    }

    console.log(`✓ Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`Email send error: ${error}`);
    return false;
  }
}

// Email templates
const emailTemplates = {
  withdrawalRequested: (userName: string, amount: number) => ({
    subject: '💰 Withdrawal Request Submitted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Withdrawal Request Submitted</h2>
        <p>Hi ${userName},</p>
        <p>Your withdrawal request has been received and is pending admin approval.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending Approval</span></p>
        </div>
        <p>You will receive another email once your withdrawal has been approved or denied.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  withdrawalApproved: (userName: string, amount: number) => ({
    subject: '✅ Withdrawal Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Withdrawal Approved!</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your withdrawal request has been approved.</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span style="color: #10b981;">✓ Approved</span></p>
        </div>
        <p>The funds will be processed and transferred to your account within 1-2 business days.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  withdrawalDenied: (userName: string, amount: number, reason: string) => ({
    subject: '❌ Withdrawal Request Denied',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Withdrawal Request Denied</h2>
        <p>Hi ${userName},</p>
        <p>Unfortunately, your withdrawal request has been denied.</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444;">Denied</span></p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Your account balance remains unchanged. You can contact support for more information.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  newReferral: (userName: string, referralName: string, referralEmail: string) => ({
    subject: '🎉 New Referral Signup - Start Earning Commissions',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Referral Signup!</h2>
        <p>Hi ${userName},</p>
        <p>Congratulations! Someone signed up using your referral code.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>New Member:</strong> ${referralName}</p>
          <p><strong>Email:</strong> ${referralEmail}</p>
        </div>
        <p>You'll now earn 20% commission on every product they submit! The more they earn, the more you earn. 💰</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  commissionEarned: (userName: string, amount: number, source: string) => ({
    subject: `💵 Commission Earned: $${amount.toFixed(2)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Commission Earned!</h2>
        <p>Hi ${userName},</p>
        <p>You've earned a commission from your network!</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Source:</strong> ${source}</p>
        </div>
        <p>This has been added to your account balance. Keep building your network to earn more! 📈</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  welcomeNewUser: (userName: string, invitationCode: string) => ({
    subject: '👋 Welcome! Start Earning Today',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, ${userName}!</h2>
        <p>Your account has been created successfully. You're now ready to start earning!</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Your Referral Code:</strong></p>
          <p style="font-size: 18px; font-weight: bold; color: #2563eb; font-family: monospace;">${invitationCode}</p>
          <p style="font-size: 12px; color: #666;">Share this code with others - you'll earn 20% commission on their purchases!</p>
        </div>
        <p>Next steps:</p>
        <ul style="color: #666;">
          <li>Submit your first product to start earning</li>
          <li>Share your referral code to build your network</li>
          <li>Watch your commissions grow as your team earns</li>
        </ul>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),
};

// Sign up endpoint
app.post("/signup", async (c) => {
  try {
    const rateLimit = await enforcePublicRateLimit(c, 'auth.signup', 8, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for signup. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { email, password, name, username, withdrawalPassword, gender, invitationCode } = await c.req.json();

    const requestedUsername = String(username || name || '').trim();
    const displayName = String(name || username || '').trim();
    if (!requestedUsername || !displayName || !password) {
      return c.json({ error: "Username, password, and name are required" }, 400);
    }

    const normalizedUsername = normalizeUsername(requestedUsername);
    if (!normalizedUsername || normalizedUsername.length < 3) {
      return c.json({ error: "Username must contain at least 3 letters or numbers" }, 400);
    }

    const authEmail = buildAuthEmailFromUsername(requestedUsername);
    const contactEmail = email ? String(email).trim() : null;
    if (contactEmail && !isValidEmail(contactEmail)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    const normalizedInvitationCode = invitationCode ? normalizeInvitationCode(String(invitationCode)) : '';
    let parentInviteInfo: any = null;

    if (normalizedInvitationCode) {
      parentInviteInfo = await kv.get(`invitecode:${normalizedInvitationCode}`);
      if (!parentInviteInfo) {
        return c.json({ error: "Invalid invitation code" }, 400);
      }
      if (parentInviteInfo?.status === 'disabled') {
        return c.json({ error: "Invitation code is disabled" }, 400);
      }
    }

    const supabase = getServiceClient();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      user_metadata: { name: displayName, username: normalizedUsername },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      // Check if user already exists - this is a common scenario, not an error
      if (error.message.includes('already been registered')) {
        console.log(`Info: Signup blocked for existing username: ${requestedUsername}`);
        return c.json({ error: 'Unable to create account with provided details' }, 400);
      }
      
      console.error(`Error during user signup: ${error.message}`);
      return c.json({ error: 'Unable to create account with provided details' }, 400);
    }

    const userId = data.user.id;
    
    // Generate invitation code for this user
    const userInvitationCode = await generateInvitationCode();
    
    // Resolve parent user from validated invitation code
    const parentUserId: string | null = parentInviteInfo?.userId || null;

    const normalizedWithdrawalPassword = String(withdrawalPassword || '').trim();
    const hashedWithdrawalPassword = await hashWithdrawalPassword(normalizedWithdrawalPassword);

    // Create user profile in KV store
    const userProfile = {
      id: userId,
      email: authEmail,
      contactEmail,
      name: displayName,
      username: normalizedUsername,
      vipTier: 'Normal',
      accountDisabled: false,
      gender: gender || 'male',
      withdrawalPassword: hashedWithdrawalPassword,
      invitationCode: userInvitationCode,
      parentUserId: parentUserId || null,
      childCount: 0,
      totalProfitFromChildren: 0,
      balance: 0,
      principalBalance: 0,
      welcomeBonusGranted: false,
      dailyTaskSetLimit: DEFAULT_DAILY_TASK_SET_LIMIT,
      extraTaskSets: 0,
      withdrawalLimit: 0,
      taskSetsCompletedToday: 0,
      totalTaskSetsCompleted: 0,
      tierSetProgress: 0,
      currentSetTasksCompleted: 0,
      currentSetDate: null,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, userProfile);
    
    // Store invitation code mapping
    await kv.set(`invitecode:${userInvitationCode}`, {
      userId,
      email: contactEmail || authEmail,
      name: displayName,
      createdAt: new Date().toISOString(),
      status: 'active',
    });

    // Initialize default metrics for the user
    await kv.set(`metrics:${userId}`, {
      alertCompressionRatio: 85,
      ticketReductionRate: 62,
      mttrImprovement: 45,
      automationCoverage: 78,
    });

    // Initialize profit tracking
    await kv.set(`profits:${userId}`, {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      lastUpdated: new Date().toISOString(),
    });

    // If there's a parent, update their child count
    if (parentUserId) {
      const parentProfile = await kv.get(`user:${parentUserId}`);
      if (parentProfile) {
        parentProfile.childCount = (parentProfile.childCount || 0) + 1;
        await kv.set(`user:${parentUserId}`, parentProfile);
      }
      
      // Log the referral relationship
      await kv.set(`referral:${parentUserId}:${userId}`, {
        parentId: parentUserId,
        childId: userId,
        childEmail: contactEmail || authEmail,
        childName: displayName,
        createdAt: new Date().toISOString(),
        totalSharedProfit: 0,
      });

      // Send email to parent about new referral
      const parentProfileForEmail = await kv.get(`user:${parentUserId}`);
      const parentNotificationEmail = parentProfileForEmail?.contactEmail || parentProfileForEmail?.email;
      if (parentNotificationEmail && isRoutableEmail(parentNotificationEmail) && parentProfileForEmail?.emailNotifications !== false) {
        const template = emailTemplates.newReferral(parentProfileForEmail.name, displayName, contactEmail || authEmail);
        await sendEmail(parentNotificationEmail, template.subject, template.html);
      }
    }

    // Send welcome email to new user
    if (contactEmail && isRoutableEmail(contactEmail)) {
      const template = emailTemplates.welcomeNewUser(displayName, userInvitationCode);
      await sendEmail(contactEmail, template.subject, template.html);
    }

    return c.json({ 
      success: true, 
      user: { 
        id: userId, 
        email: contactEmail || authEmail,
        name: displayName,
        username: normalizedUsername,
        invitationCode: userInvitationCode,
        vipTier: 'Normal' 
      } 
    });
  } catch (error) {
    console.error(`Signup error: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Admin: list invitation codes
app.get("/admin/invitation-codes", async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'invitations.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const codeRows = await getKvRowsByPrefix('invitecode:');
    const invitationCodes = await Promise.all((codeRows ?? []).map(async (row: any) => {
      const rawKey = String(row?.key || '');
      const code = rawKey.replace('invitecode:', '');
      const payload = row?.value ?? {};
      const ownerUserId = payload?.userId || null;

      if (!code) {
        return null;
      }

      if (!adminAccess.isSuperAdmin && ownerUserId !== adminAccess.userId) {
        return null;
      }

      const referrals = ownerUserId ? (await kv.getByPrefix(`referral:${ownerUserId}:`))?.length || 0 : 0;
      return {
        code,
        ownerUserId,
        ownerName: payload?.name || 'Platform Invite',
        ownerEmail: payload?.email || null,
        signups: referrals,
        status: payload?.status || 'active',
        createdAt: payload?.createdAt || new Date().toISOString(),
      };
    }));

    return c.json({ success: true, invitationCodes: invitationCodes.filter(Boolean) });
  } catch (error) {
    console.error(`Error fetching invitation codes: ${error}`);
    return c.json({ error: 'Internal server error while fetching invitation codes' }, 500);
  }
});

// Admin: generate invitation code (optionally bound to an owner user)
app.post("/admin/invitation-codes/generate", async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'invitations.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const body = await c.req.json().catch(() => ({}));
    const ownerUserId = adminAccess.isSuperAdmin ? (body?.ownerUserId || null) : adminAccess.userId;
    let ownerProfile: any = null;
    let ownerAdminAccount: any = null;

    if (ownerUserId) {
      ownerProfile = await kv.get(`user:${ownerUserId}`);
      if (!ownerProfile) {
        ownerAdminAccount = await kv.get(`admin:account:${ownerUserId}`);
      }
      if (!ownerProfile && !ownerAdminAccount) {
        return c.json({ error: 'Owner user not found' }, 404);
      }
    }

    const code = await generateInvitationCode();
    const payload = {
      userId: ownerUserId,
      email: ownerProfile?.email || ownerAdminAccount?.authEmail || null,
      name: ownerProfile?.name || ownerAdminAccount?.displayName || ownerAdminAccount?.username || 'Platform Invite',
      createdAt: new Date().toISOString(),
      status: 'active',
      generatedBy: 'admin',
    };

    await kv.set(`invitecode:${code}`, payload);

    return c.json({
      success: true,
      invitationCode: {
        code,
        ownerUserId,
        ownerName: payload.name,
        ownerEmail: payload.email,
        signups: 0,
        status: 'active',
        createdAt: payload.createdAt,
      },
    });
  } catch (error) {
    console.error(`Error generating invitation code: ${error}`);
    return c.json({ error: 'Internal server error while generating invitation code' }, 500);
  }
});

// Admin: enable/disable invitation code
app.put("/admin/invitation-codes/status", async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'invitations.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const { code, status } = await c.req.json();
    const normalizedCode = normalizeInvitationCode(String(code || ''));

    if (!normalizedCode) {
      return c.json({ error: 'code is required' }, 400);
    }
    if (status !== 'active' && status !== 'disabled') {
      return c.json({ error: 'status must be active or disabled' }, 400);
    }

    const key = `invitecode:${normalizedCode}`;
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ error: 'Invitation code not found' }, 404);
    }

    if (!adminAccess.isSuperAdmin && existing?.userId !== adminAccess.userId) {
      return c.json({ error: 'Forbidden - You can only manage your own invitation codes' }, 403);
    }

    const updated = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(key, updated);
    return c.json({ success: true, code: normalizedCode, status });
  } catch (error) {
    console.error(`Error updating invitation code status: ${error}`);
    return c.json({ error: 'Internal server error while updating invitation code status' }, 500);
  }
});

app.get('/contact-links', async (c) => {
  try {
    const config = await getContactLinksConfig();
    return c.json({ success: true, config });
  } catch (error) {
    console.error(`Error fetching contact links: ${error}`);
    return c.json({ error: 'Internal server error while fetching contact links' }, 500);
  }
});

app.put('/admin/contact-links', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'support.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const body = await c.req.json().catch(() => ({}));
    const hasWhatsapp = Object.prototype.hasOwnProperty.call(body, 'whatsapp');
    const hasTelegram = Object.prototype.hasOwnProperty.call(body, 'telegram');
    const hasWhatsapp2 = Object.prototype.hasOwnProperty.call(body, 'whatsapp2');
    const hasTelegram2 = Object.prototype.hasOwnProperty.call(body, 'telegram2');

    if (!hasWhatsapp && !hasTelegram && !hasWhatsapp2 && !hasTelegram2) {
      return c.json({ error: 'Provide one or more contact links' }, 400);
    }

    const currentConfig = await getContactLinksConfig();
    const nextWhatsapp = hasWhatsapp
      ? String(body?.whatsapp || '').trim()
      : String(currentConfig.whatsapp || '').trim();
    const nextTelegram = hasTelegram
      ? String(body?.telegram || '').trim()
      : String(currentConfig.telegram || '').trim();
    const nextWhatsapp2 = hasWhatsapp2
      ? String(body?.whatsapp2 || '').trim()
      : String(currentConfig.whatsapp2 || '').trim();
    const nextTelegram2 = hasTelegram2
      ? String(body?.telegram2 || '').trim()
      : String(currentConfig.telegram2 || '').trim();

    const payload = {
      whatsapp: nextWhatsapp,
      telegram: nextTelegram,
      whatsapp2: nextWhatsapp2,
      telegram2: nextTelegram2,
      updatedAt: new Date().toISOString(),
      updatedBy: adminAccess.userId || 'super_admin',
    };

    await kv.set('support:contact-links', payload);
    return c.json({ success: true, config: payload });
  } catch (error) {
    console.error(`Error updating contact links: ${error}`);
    return c.json({ error: 'Internal server error while updating contact links' }, 500);
  }
});

app.get('/deposit-config', async (c) => {
  try {
    const config = await getDepositConfig();
    return c.json({ success: true, config });
  } catch (error) {
    console.error(`Error fetching deposit config: ${error}`);
    return c.json({ error: 'Internal server error while fetching deposit config' }, 500);
  }
});

app.put('/admin/deposit-config', async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    if (!adminAccess.isSuperAdmin) {
      const hasAccess = adminAccess.permissions.includes(ADMIN_PERMISSION_ALL)
        || adminAccess.permissions.includes('support.manage')
        || adminAccess.permissions.includes('withdrawals.manage');
      if (!hasAccess) {
        return c.json({ error: 'Forbidden - Missing permission: support.manage or withdrawals.manage' }, 403);
      }
    }

    const body = await c.req.json().catch(() => ({}));
    const currentConfig = await getDepositConfig();
    const payload = {
      bank: {
        accountName: String(body?.bank?.accountName || currentConfig.bank.accountName),
        accountNumber: String(body?.bank?.accountNumber || currentConfig.bank.accountNumber),
        bankName: String(body?.bank?.bankName || currentConfig.bank.bankName),
        routingNumber: String(body?.bank?.routingNumber || currentConfig.bank.routingNumber),
        instructions: String(body?.bank?.instructions || currentConfig.bank.instructions),
      },
      crypto: {
        network: String(body?.crypto?.network || currentConfig.crypto.network),
        walletAddress: String(body?.crypto?.walletAddress || currentConfig.crypto.walletAddress),
        instructions: String(body?.crypto?.instructions || currentConfig.crypto.instructions),
        defaultAsset: String(body?.crypto?.defaultAsset || currentConfig.crypto.defaultAsset || 'BTC').toUpperCase(),
        assets: (Array.isArray(body?.crypto?.assets) && body.crypto.assets.length > 0
          ? body.crypto.assets
          : currentConfig.crypto.assets
        )
          .map((item: any) => ({
            asset: String(item?.asset || '').toUpperCase(),
            network: String(item?.network || ''),
            walletAddress: String(item?.walletAddress || ''),
            instructions: String(item?.instructions || ''),
          }))
          .filter((item: any) => item.asset && item.network && item.walletAddress),
      },
      minimumAmount: Number.isFinite(Number(body?.minimumAmount)) && Number(body.minimumAmount) > 0
        ? Number(body.minimumAmount)
        : currentConfig.minimumAmount,
      updatedAt: new Date().toISOString(),
      updatedBy: adminAccess.userId || 'super_admin',
    };

    await kv.set('payments:deposit-config', payload);
    return c.json({ success: true, config: payload });
  } catch (error) {
    console.error(`Error updating deposit config: ${error}`);
    return c.json({ error: 'Internal server error while updating deposit config' }, 500);
  }
});

const activateCryptoPaymentForUser = async (params: {
  userId: string;
  invoice: any;
  webhookPayload: Record<string, any>;
}) => {
  const userId = String(params.userId || '').trim();
  if (!userId) return;

  const profileKey = `user:${userId}`;
  const user = await kv.get(profileKey);
  if (!user) return;

  const normalizedAmount = Number(params.webhookPayload?.price_amount ?? params.invoice?.priceAmount ?? params.invoice?.amount ?? 0);
  const amount = Number.isFinite(normalizedAmount) ? Math.max(0, normalizedAmount) : 0;
  if (amount <= 0) return;

  const balanceBefore = Number(user?.balance || 0);
  const balanceAfter = roundCurrency(balanceBefore + amount);
  const nowIso = new Date().toISOString();

  await kv.set(profileKey, {
    ...user,
    balance: balanceAfter,
    updatedAt: nowIso,
  });

  const paymentId = String(params.invoice?.paymentId || params.webhookPayload?.payment_id || '').trim();
  const requestId = `dep_crypto_${paymentId || Date.now()}`;
  const requestRecord = {
    id: requestId,
    userId,
    userName: user?.name || 'User',
    userEmail: user?.contactEmail || user?.email || null,
    method: 'crypto',
    amount,
    reference: String(params.webhookPayload?.txid || params.webhookPayload?.payment_id || paymentId || requestId),
    transactionHash: String(params.webhookPayload?.txid || params.webhookPayload?.payment_id || paymentId || requestId),
    sourceWalletAddress: null,
    destinationWalletAddress: String(params.invoice?.payAddress || params.webhookPayload?.pay_address || ''),
    cryptoAsset: String(params.invoice?.asset || params.webhookPayload?.pay_currency || '').toUpperCase(),
    cryptoNetwork: String(params.invoice?.network || params.webhookPayload?.network || ''),
    note: 'Confirmed by NOWPayments webhook',
    status: 'approved',
    createdAt: String(params.invoice?.createdAt || nowIso),
    updatedAt: nowIso,
    approvedAt: nowIso,
  };

  await kv.set(`deposit:request:${requestId}`, requestRecord);
  const userRequests = await kv.get(`deposit:requests:user:${userId}`) || [];
  if (!userRequests.includes(requestId)) {
    userRequests.push(requestId);
    await kv.set(`deposit:requests:user:${userId}`, userRequests.slice(-200));
  }
};

app.post('/api/crypto/create-invoice', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - Missing token' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '').trim();
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const amount = Number(body?.amount || 0);
    const asset = String(body?.asset || 'BTC').trim().toUpperCase();
    const network = String(body?.network || '').trim();
    const targetUserId = String(body?.targetUserId || '').trim();

    if (!NOWPAYMENTS_SUPPORTED_ASSETS.includes(asset as any)) {
      return c.json({ error: 'Unsupported asset. Use BTC, ETH, or USDT.' }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400);
    }

    let payerUserId = String(userId);
    let payerProfile = await kv.get(`user:${payerUserId}`);

    if (!payerProfile) {
      const adminAccess = await requireSupportAccess(c);
      if (!adminAccess.ok) {
        return adminAccess.response;
      }

      if (!targetUserId) {
        return c.json({ error: 'targetUserId is required for admin-generated invoices' }, 400);
      }

      const profile = await kv.get(`user:${targetUserId}`);
      if (!profile) {
        return c.json({ error: 'Target user not found' }, 404);
      }

      const scope = await getAdminScopeConfig(adminAccess);
      if (!isUserInAdminScope(scope, profile)) {
        return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
      }

      payerUserId = targetUserId;
      payerProfile = profile;
    }

    const nowPaymentsApiKey = String(Deno.env.get('NOWPAYMENTS_API_KEY') || '').trim();
    if (!nowPaymentsApiKey) {
      return c.json({ error: 'NOWPayments is not configured' }, 500);
    }

    const payCurrency = mapNowPaymentsCurrency(asset, network);
    const orderId = `crypto_inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const webhookUrl = buildCryptoWebhookUrl();

    const nowPaymentsResponse = await fetch(`${NOWPAYMENTS_API_BASE}/payment`, {
      method: 'POST',
      headers: {
        'x-api-key': nowPaymentsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: payCurrency,
        ipn_callback_url: webhookUrl,
        order_id: orderId,
        order_description: `TankPlatform subscription payment for ${payerUserId}`,
      }),
    });

    const nowPaymentsPayload = await nowPaymentsResponse.json().catch(() => ({}));
    if (!nowPaymentsResponse.ok) {
      return c.json({ error: nowPaymentsPayload?.message || 'Failed to create NOWPayments invoice' }, 502);
    }

    const paymentId = String(nowPaymentsPayload?.payment_id || '').trim();
    if (!paymentId) {
      return c.json({ error: 'NOWPayments invoice did not include payment_id' }, 502);
    }

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const invoiceRecord = {
      invoiceId: orderId,
      paymentId,
      userId: payerUserId,
      userName: String(payerProfile?.name || 'User'),
      userEmail: String(payerProfile?.contactEmail || payerProfile?.email || ''),
      amount,
      asset,
      network: network || payCurrency.toUpperCase(),
      payCurrency: String(nowPaymentsPayload?.pay_currency || payCurrency),
      payAddress: String(nowPaymentsPayload?.pay_address || ''),
      payAmount: Number(nowPaymentsPayload?.pay_amount || 0),
      priceAmount: Number(nowPaymentsPayload?.price_amount || amount),
      priceCurrency: String(nowPaymentsPayload?.price_currency || 'usd'),
      status: String(nowPaymentsPayload?.payment_status || 'waiting'),
      createdAt,
      expiresAt,
      confirmedAt: null,
      activatedAt: null,
      webhookUrl,
      raw: nowPaymentsPayload,
    };

    await kv.set(`crypto:invoice:${paymentId}`, invoiceRecord);
    await kv.set(`crypto:invoice-by-order:${orderId}`, { paymentId, userId: payerUserId, createdAt });

    return c.json({
      success: true,
      invoice: {
        invoiceId: orderId,
        paymentId,
        payAddress: invoiceRecord.payAddress,
        payAmount: invoiceRecord.payAmount,
        payCurrency: invoiceRecord.payCurrency,
        priceAmount: invoiceRecord.priceAmount,
        priceCurrency: invoiceRecord.priceCurrency,
        network: invoiceRecord.network,
        expiresAt,
      },
    });
  } catch (error) {
    console.error(`Error creating crypto invoice: ${error}`);
    return c.json({ error: 'Internal server error while creating crypto invoice' }, 500);
  }
});

app.post('/api/crypto/webhook', async (c) => {
  try {
    const ipnSecret = String(Deno.env.get('NOWPAYMENTS_IPN_SECRET') || '').trim();
    if (!ipnSecret) {
      return c.json({ error: 'NOWPayments IPN secret is not configured' }, 500);
    }

    const signature = String(c.req.header('x-nowpayments-sig') || c.req.header('X-NOWPAYMENTS-SIG') || '').trim().toLowerCase();
    const rawBody = await c.req.text();
    const expectedSignature = (await computeNowPaymentsSignature(rawBody, ipnSecret)).toLowerCase();

    if (!signature || signature !== expectedSignature) {
      return c.json({ error: 'Invalid NOWPayments signature' }, 401);
    }

    const payload = JSON.parse(rawBody || '{}');
    const paymentId = String(payload?.payment_id || '').trim();
    if (!paymentId) {
      return c.json({ success: true, ignored: true, reason: 'missing payment_id' });
    }

    const invoiceKey = `crypto:invoice:${paymentId}`;
    const existingInvoice = await kv.get(invoiceKey);
    if (!existingInvoice) {
      return c.json({ success: true, ignored: true, reason: 'invoice not found' });
    }

    const status = String(payload?.payment_status || existingInvoice?.status || '').toLowerCase();
    const nowIso = new Date().toISOString();
    const confirmed = ['finished', 'confirmed', 'sending'].includes(status);

    const updatedInvoice = {
      ...existingInvoice,
      status,
      webhookReceivedAt: nowIso,
      webhookPayload: payload,
      confirmedAt: confirmed ? (existingInvoice?.confirmedAt || nowIso) : existingInvoice?.confirmedAt || null,
    };

    if (confirmed && !existingInvoice?.activatedAt) {
      await activateCryptoPaymentForUser({
        userId: String(existingInvoice?.userId || ''),
        invoice: existingInvoice,
        webhookPayload: payload,
      });
      updatedInvoice.activatedAt = nowIso;
    }

    await kv.set(invoiceKey, updatedInvoice);

    return c.json({
      success: true,
      paymentId,
      status,
      activated: Boolean(updatedInvoice?.activatedAt),
    });
  } catch (error) {
    console.error(`Error handling NOWPayments webhook: ${error}`);
    return c.json({ error: 'Internal server error while handling crypto webhook' }, 500);
  }
});

app.post('/deposits/request', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const {
      method,
      amount,
      reference,
      note,
      transactionHash,
      sourceWalletAddress,
      destinationWalletAddress,
      cryptoAsset,
      cryptoNetwork,
    } = await c.req.json();
    const normalizedMethod = String(method || '').toLowerCase();
    const normalizedAmount = Number(amount || 0);

    if (!['bank', 'crypto'].includes(normalizedMethod)) {
      return c.json({ error: 'method must be bank or crypto' }, 400);
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400);
    }

    const normalizedReference = String(reference || '').trim() || null;
    const normalizedTransactionHash = String(transactionHash || '').trim() || null;
    const normalizedSourceWalletAddress = String(sourceWalletAddress || '').trim() || null;
    const normalizedDestinationWalletAddressInput = String(destinationWalletAddress || '').trim() || null;
    const normalizedCryptoAsset = String(cryptoAsset || '').trim().toUpperCase() || null;
    const normalizedCryptoNetworkInput = String(cryptoNetwork || '').trim() || null;

    let resolvedCryptoAsset: string | null = null;
    let resolvedCryptoNetwork: string | null = null;
    let resolvedDestinationWalletAddress: string | null = null;

    if (normalizedMethod === 'crypto') {
      const depositConfig = await getDepositConfig();
      const configAssets = Array.isArray(depositConfig?.crypto?.assets) ? depositConfig.crypto.assets : [];
      const fallbackAsset = configAssets.find((item: any) => item?.asset === depositConfig?.crypto?.defaultAsset)
        || configAssets[0]
        || null;
      const matchedAsset = configAssets.find((item: any) => item?.asset === normalizedCryptoAsset) || fallbackAsset;

      resolvedCryptoAsset = String(matchedAsset?.asset || normalizedCryptoAsset || '').toUpperCase() || null;
      resolvedCryptoNetwork = String(normalizedCryptoNetworkInput || matchedAsset?.network || depositConfig?.crypto?.network || '').trim() || null;
      resolvedDestinationWalletAddress = String(normalizedDestinationWalletAddressInput || matchedAsset?.walletAddress || depositConfig?.crypto?.walletAddress || '').trim() || null;

      if (!normalizedSourceWalletAddress) {
        return c.json({ error: 'sourceWalletAddress is required for crypto deposits' }, 400);
      }
      if (!resolvedCryptoAsset) {
        return c.json({ error: 'cryptoAsset is required for crypto deposits' }, 400);
      }
      if (!resolvedCryptoNetwork) {
        return c.json({ error: 'cryptoNetwork is required for crypto deposits' }, 400);
      }
      if (!resolvedDestinationWalletAddress) {
        return c.json({ error: 'destinationWalletAddress is required for crypto deposits' }, 400);
      }
    }

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const requestId = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const request = {
      id: requestId,
      userId,
      userName: user.name || 'User',
      userEmail: user.contactEmail || user.email || null,
      method: normalizedMethod,
      amount: normalizedAmount,
      reference: normalizedMethod === 'crypto'
        ? (normalizedTransactionHash || normalizedReference)
        : normalizedReference,
      transactionHash: normalizedMethod === 'crypto'
        ? (normalizedTransactionHash || normalizedReference)
        : null,
      sourceWalletAddress: normalizedMethod === 'crypto' ? normalizedSourceWalletAddress : null,
      destinationWalletAddress: normalizedMethod === 'crypto' ? resolvedDestinationWalletAddress : null,
      cryptoAsset: normalizedMethod === 'crypto' ? resolvedCryptoAsset : null,
      cryptoNetwork: normalizedMethod === 'crypto' ? resolvedCryptoNetwork : null,
      note: String(note || '').trim() || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`deposit:request:${requestId}`, request);
    const userRequests = await kv.get(`deposit:requests:user:${userId}`) || [];
    userRequests.push(requestId);
    await kv.set(`deposit:requests:user:${userId}`, userRequests.slice(-200));

    const queue = await kv.get('deposit:requests:queue') || [];
    queue.push(requestId);
    await kv.set('deposit:requests:queue', queue.slice(-1000));

    return c.json({ success: true, request });
  } catch (error) {
    console.error(`Error creating deposit request: ${error}`);
    return c.json({ error: 'Internal server error while creating deposit request' }, 500);
  }
});

// Sign in endpoint (handled by Supabase client, but we can add a custom route if needed)
app.post("/signin", async (c) => {
  try {
    const rateLimit = await enforcePublicRateLimit(c, 'auth.signin', 12, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for signin. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { email, username, password } = await c.req.json();

    if (!password || (!email && !username)) {
      return c.json({ error: "Username/email and password are required" }, 400);
    }

    const loginIdentifier = String(email || username || '').trim();
    const loginEmail = loginIdentifier.includes('@')
      ? loginIdentifier.toLowerCase()
      : buildAuthEmailFromUsername(loginIdentifier);

    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      console.error(`Error during user signin: ${error.message}`);
      return c.json({ error: 'Invalid login credentials' }, 401);
    }

    const loginLocation = await resolveBestRequestLocation(c);
    const profileKey = `user:${data.user?.id || ''}`;
    const existingProfile = data.user?.id ? await kv.get(profileKey) : null;
    if (existingProfile?.accountDisabled) {
      await supabase.auth.signOut();
      return c.json({ error: 'Account is disabled. Contact support to reactivate your account.' }, 403);
    }
    if (existingProfile) {
      await kv.set(profileKey, {
        ...existingProfile,
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: loginLocation.ip,
        lastLoginCountry: loginLocation.country,
      });
    }

    return c.json({ 
      success: true,
      session: data.session,
      user: data.user,
      loginLocation,
    });
  } catch (error) {
    console.error(`Signin error: ${error}`);
    return c.json({ error: "Internal server error during signin" }, 500);
  }
});

// Admin sign in endpoint (live limited-admin login)
app.post('/admin/signin', async (c) => {
  try {
    const { username, password } = await c.req.json();

    const normalizedUsername = normalizeUsername(String(username || ''));
    if (!normalizedUsername || !password) {
      return c.json({ error: 'username and password are required' }, 400);
    }

    const requesterIp = getRequesterIp(c);
    const attemptsKey = `admin:signin:attempts:${normalizedUsername}:${requesterIp}`;
    const nowMs = Date.now();
    const lockDurationMs = 15 * 60 * 1000;
    const attemptWindowMs = 15 * 60 * 1000;
    const maxAttempts = 5;
    const storedAttempts = await kv.get(attemptsKey) || {};
    const windowStartedAtMs = Number(storedAttempts.windowStartedAtMs || 0) || nowMs;
    const lockUntilMs = Number(storedAttempts.lockUntilMs || 0) || 0;
    const isWindowExpired = (nowMs - windowStartedAtMs) > attemptWindowMs;
    let failedAttempts = isWindowExpired ? 0 : Number(storedAttempts.failedAttempts || 0);

    if (lockUntilMs > nowMs) {
      return c.json({ error: 'Too many failed attempts. Try again later.' }, 429);
    }

    const adminEmail = `admin.${normalizedUsername}@${AUTH_EMAIL_DOMAIN}`;
    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password,
    });

    if (error || !data?.user?.id) {
      failedAttempts += 1;
      const nextState = {
        failedAttempts,
        windowStartedAtMs: isWindowExpired ? nowMs : windowStartedAtMs,
        lockUntilMs: failedAttempts >= maxAttempts ? nowMs + lockDurationMs : 0,
        lastAttemptAtMs: nowMs,
      };
      await kv.set(attemptsKey, nextState);
      return c.json({ error: 'Invalid admin credentials' }, 403);
    }

    const adminAccount = await kv.get(`admin:account:${data.user.id}`);
    if (!adminAccount || adminAccount.active === false) {
      await supabase.auth.signOut();
      failedAttempts += 1;
      const nextState = {
        failedAttempts,
        windowStartedAtMs: isWindowExpired ? nowMs : windowStartedAtMs,
        lockUntilMs: failedAttempts >= maxAttempts ? nowMs + lockDurationMs : 0,
        lastAttemptAtMs: nowMs,
      };
      await kv.set(attemptsKey, nextState);
      return c.json({ error: 'Admin account is inactive or not found' }, 403);
    }

    const persistedPermissions = sanitizeAdminPermissions(adminAccount.permissions);
    const effectivePermissions = Array.from(
      new Set<AdminPermission>([
        ...persistedPermissions,
        ...BASELINE_LIMITED_ADMIN_PERMISSIONS,
      ])
    );

    await kv.set(attemptsKey, {
      failedAttempts: 0,
      windowStartedAtMs: nowMs,
      lockUntilMs: 0,
      lastSuccessAtMs: nowMs,
    });

    const adminLoginLocation = await resolveBestRequestLocation(c);
    const updatedAdminAccount = {
      ...adminAccount,
      permissions: effectivePermissions,
      lastLoginAt: new Date().toISOString(),
      lastLoginIp: adminLoginLocation.ip,
      lastLoginCountry: adminLoginLocation.country,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`admin:account:${data.user.id}`, updatedAdminAccount);

    return c.json({
      success: true,
      admin: {
        userId: updatedAdminAccount.userId,
        username: updatedAdminAccount.username,
        displayName: updatedAdminAccount.displayName,
        active: updatedAdminAccount.active !== false,
        permissions: effectivePermissions,
        lastLoginAt: updatedAdminAccount.lastLoginAt,
        lastLoginCountry: updatedAdminAccount.lastLoginCountry,
      },
      session: data.session,
    });
  } catch (error) {
    console.error(`Admin signin error: ${error}`);
    return c.json({ error: 'Internal server error during admin signin' }, 500);
  }
});

// Get user profile (protected route)
app.get("/profile", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching profile: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token", code: 401 }, 401);
    }

    // Get user profile from KV store
    const profile = await kv.get(`user:${userId}`);
    
    if (!profile) {
      const supabase = getServiceClient();
      const { data: authUserData } = await supabase.auth.getUser(accessToken);
      const authUser = authUserData?.user;
      const authEmail = authUser?.email || '';
      const metadataName = String(authUser?.user_metadata?.name || '').trim();
      const metadataUsername = String(authUser?.user_metadata?.username || '').trim();

      // If profile doesn't exist in KV, create it from auth metadata
      const newProfile = {
        id: userId,
        email: authEmail,
        contactEmail: null,
        name: metadataName || metadataUsername || 'User',
        username: metadataUsername || (authEmail ? authEmail.split('@')[0] : ''),
        vipTier: 'Normal',
        accountDisabled: false,
        balance: 0,
        principalBalance: 0,
        welcomeBonusGranted: false,
        dailyTaskSetLimit: DEFAULT_DAILY_TASK_SET_LIMIT,
        extraTaskSets: 0,
        withdrawalLimit: 0,
        taskSetsCompletedToday: 0,
        totalTaskSetsCompleted: 0,
        tierSetProgress: 0,
        currentSetTasksCompleted: 0,
        currentSetDate: null,
        lastLoginAt: null,
        lastLoginIp: null,
        lastLoginCountry: null,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`user:${userId}`, newProfile);
      console.log('Created new profile for user:', userId);
      return c.json({
        success: true,
        profile: {
          ...newProfile,
          totalEarnings: 0,
        },
      });
    }

    const requestLocation = await resolveBestRequestLocation(c);
    const shouldBackfillLoginMetadata = !profile?.lastLoginAt
      || !profile?.lastLoginIp
      || String(profile?.lastLoginIp || '').trim().toLowerCase() === 'unknown'
      || !profile?.lastLoginCountry
      || String(profile?.lastLoginCountry || '').trim().toLowerCase() === 'unknown';

    let effectiveProfile = profile;
    if (shouldBackfillLoginMetadata) {
      effectiveProfile = {
        ...profile,
        lastLoginAt: profile?.lastLoginAt || new Date().toISOString(),
        lastLoginIp: requestLocation.ip || profile?.lastLoginIp || 'unknown',
        lastLoginCountry: requestLocation.country || profile?.lastLoginCountry || 'Unknown',
      };
      await kv.set(`user:${userId}`, effectiveProfile);
    }

    if (effectiveProfile?.accountDisabled) {
      return c.json({ error: 'Account is disabled. Contact support to reactivate your account.' }, 403);
    }

    const profits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };
    const totalEarned = Number(profits?.totalEarned || 0);
    const principalBalance = resolvePrincipalBalance(effectiveProfile, totalEarned);
    const totalEarnings = computeTotalEarnings(effectiveProfile, totalEarned);

    if (Number(effectiveProfile?.principalBalance ?? NaN) !== principalBalance) {
      effectiveProfile = {
        ...effectiveProfile,
        principalBalance,
      };
      await kv.set(`user:${userId}`, effectiveProfile);
    }

    console.log('Profile found for user:', userId);
    const { withdrawalPassword: _withdrawalPassword, ...safeProfile } = effectiveProfile;
    return c.json({
      success: true,
      profile: {
        ...safeProfile,
        principalBalance,
        totalEarnings,
      },
    });
  } catch (error) {
    console.error(`Error fetching profile: ${error}`);
    return c.json({ error: "Internal server error while fetching profile" }, 500);
  }
});

app.put("/profile/contact-email", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { contactEmail } = await c.req.json();
    const normalizedContactEmail = String(contactEmail || '').trim().toLowerCase();
    if (normalizedContactEmail && !isValidEmail(normalizedContactEmail)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    const profileKey = `user:${userId}`;
    const existingProfile = await kv.get(profileKey);
    if (!existingProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    const updatedProfile = {
      ...existingProfile,
      contactEmail: normalizedContactEmail || null,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(profileKey, updatedProfile);

    return c.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error(`Error updating contact email: ${error}`);
    return c.json({ error: "Internal server error while updating contact email" }, 500);
  }
});

// Get user metrics (protected route)
app.get("/metrics", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching metrics: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get metrics from KV store
    const metrics = await kv.get(`metrics:${userId}`);
    
    if (!metrics) {
      // Create default metrics if not found
      const defaultMetrics = {
        alertCompressionRatio: 85,
        ticketReductionRate: 62,
        mttrImprovement: 45,
        automationCoverage: 78,
      };
      await kv.set(`metrics:${userId}`, defaultMetrics);
      return c.json({ success: true, metrics: defaultMetrics });
    }

    return c.json({ success: true, metrics });
  } catch (error) {
    console.error(`Error fetching metrics: ${error}`);
    return c.json({ error: "Internal server error while fetching metrics" }, 500);
  }
});

// Update VIP tier is restricted to admin-only endpoints.
app.put("/vip-tier", async (c) => {
  return c.json({ error: 'Forbidden - Use admin VIP management endpoint' }, 403);
});

// Admin: list users and platform metrics
app.get("/admin/users", async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    if (!adminAccess.isSuperAdmin) {
      const hasUsersAccess = adminAccess.permissions.includes(ADMIN_PERMISSION_ALL)
        || adminAccess.permissions.includes('users.view')
        || adminAccess.permissions.includes('users.manage_status')
        || adminAccess.permissions.includes('users.adjust_balance')
        || adminAccess.permissions.includes('users.assign_premium')
        || adminAccess.permissions.includes('users.reset_tasks')
        || adminAccess.permissions.includes('users.manage_task_limits')
        || adminAccess.permissions.includes('users.unfreeze')
        || adminAccess.permissions.includes('users.update_vip');
      if (!hasUsersAccess) {
        return c.json({ error: 'Forbidden - Missing user management permission' }, 403);
      }
    }

    const scope = await getAdminScopeConfig(adminAccess);
    const pageParam = Number(c.req.query('page') || 1);
    const limitParam = Number(c.req.query('limit') || 100);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 250)
      : 100;

    const rawUsers = await kv.getByPrefix('user:');
    const users = (rawUsers ?? []).map((user: any) => ({
      id: user?.id ?? '',
      email: user?.email ?? '',
      name: user?.name ?? 'User',
      lastLoginAt: user?.lastLoginAt ?? null,
      lastLoginCountry: user?.lastLoginCountry ?? null,
      lastLoginIp: user?.lastLoginIp ?? null,
      vipTier: user?.vipTier ?? 'Normal',
      balance: Number(user?.balance ?? 0),
      accountDisabled: Boolean(user?.accountDisabled ?? false),
      productsSubmitted: Number(user?.productsSubmitted ?? 0),
      accountFrozen: Boolean(user?.accountFrozen ?? false),
      freezeAmount: Number(user?.freezeAmount ?? 0),
      dailyTaskSetLimit: Number(user?.dailyTaskSetLimit ?? DEFAULT_DAILY_TASK_SET_LIMIT),
      extraTaskSets: Number(user?.extraTaskSets ?? 0),
      withdrawalLimit: Number(user?.withdrawalLimit ?? 0),
      taskSetsCompletedToday: Number(user?.taskSetsCompletedToday ?? 0),
      currentSetTasksCompleted: Number(user?.currentSetTasksCompleted ?? 0),
      currentSetDate: user?.currentSetDate ?? null,
      parentUserId: user?.parentUserId ?? null,
      createdAt: user?.createdAt ?? new Date().toISOString(),
    }));

    const scopedUsers = users.filter((user: any) => isUserInAdminScope(scope, user));
    const sortedUsers = scopedUsers.sort((a: any, b: any) => {
      const bCreatedAt = new Date(b?.createdAt || 0).getTime();
      const aCreatedAt = new Date(a?.createdAt || 0).getTime();
      return bCreatedAt - aCreatedAt;
    });

    const totalUsers = sortedUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalUsers / limit));
    const offset = (page - 1) * limit;
    const pagedUsers = sortedUsers.slice(offset, offset + limit);
    const usersWithEarnings = await Promise.all(pagedUsers.map(async (user: any) => {
      const totalEarnings = await resolveUserTotalEarnings(user);
      return {
        ...user,
        totalEarnings,
        frozenNegativeAmount: resolveFrozenNegativeAmount(user),
      };
    }));

    const metrics = {
      totalUsers,
      totalRevenue: sortedUsers.reduce((sum: number, user: any) => sum + Math.max(0, Number(user.balance) || 0), 0),
      totalTransactions: sortedUsers.reduce((sum: number, user: any) => sum + (Number(user.productsSubmitted) || 0), 0),
      activeUsers: sortedUsers.filter((user: any) => !user.accountFrozen && !user.accountDisabled).length,
      frozenAccounts: sortedUsers.filter((user: any) => user.accountFrozen).length,
      totalCommissionsPaid: 0,
    };

    return c.json({
      success: true,
      users: usersWithEarnings,
      metrics,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    console.error(`Error fetching admin users: ${error}`);
    return c.json({ error: 'Internal server error while fetching admin users' }, 500);
  }
});

// Admin (super key only): cleanup test users in one action
app.post('/admin/users/cleanup-test-data', async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, { isSuperAdmin: true, userId: null }, 'users.cleanup_test_data', 3, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for test data cleanup. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const dryRun = body?.dryRun === undefined ? false : Boolean(body.dryRun);
    const deleteUsers = Boolean(body?.deleteUsers);

    const userRows = await getKvRowsByPrefix('user:');
    const matchedRows = userRows.filter((row: any) => isLikelyTestUser(row?.value));

    const summary: any = {
      scannedUsers: userRows.length,
      matchedUsers: matchedRows.length,
      processedUsers: 0,
      deletedUsers: 0,
      neutralizedUsers: 0,
      failedUsers: 0,
      dryRun,
      deleteUsers,
      sampleUserIds: [] as string[],
    };

    for (const row of matchedRows) {
      const user = row?.value || {};
      const userId = String(user?.id || '').trim();
      if (userId && summary.sampleUserIds.length < 50) {
        summary.sampleUserIds.push(userId);
      }

      if (dryRun) {
        continue;
      }

      try {
        if (deleteUsers) {
          await kv.del(row.key);
          await kv.del(`admin:adjustments:${userId}`).catch(() => undefined);
          summary.deletedUsers += 1;
        } else {
          const normalizedUser = buildNeutralizedTestUser(user);
          await kv.set(row.key, normalizedUser);
          await kv.del(`admin:adjustments:${userId}`).catch(() => undefined);
          summary.neutralizedUsers += 1;
        }
        summary.processedUsers += 1;
      } catch (error) {
        console.error(`Cleanup failed for user ${userId}: ${error}`);
        summary.failedUsers += 1;
      }
    }

    return c.json({
      success: true,
      mode: deleteUsers ? 'delete' : 'neutralize',
      summary,
    });
  } catch (error) {
    console.error(`Error cleaning test users: ${error}`);
    return c.json({ error: 'Internal server error while cleaning test users' }, 500);
  }
});

// Admin: unfreeze a user account
app.post("/admin/unfreeze", async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.unfreeze');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }
    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'users.unfreeze', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for unfreeze action. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, user)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const currentBalance = Number(user?.balance ?? 0);
    const freezeAmount = Number(user?.freezeAmount ?? 0);
    const premiumPreviousBalance = Number(user?.premiumAssignment?.previousBalance ?? NaN);
    const calculatedBalance = user?.accountFrozen
      ? currentBalance + freezeAmount
      : currentBalance;
    const nextBalance = Number.isFinite(premiumPreviousBalance)
      ? Math.max(calculatedBalance, premiumPreviousBalance)
      : calculatedBalance;

    const updatedUser = {
      ...user,
      accountFrozen: false,
      balance: nextBalance,
      freezeAmount: 0,
      unfrozenAt: new Date().toISOString(),
    };

    await kv.set(key, updatedUser);

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(`Error unfreezing account: ${error}`);
    return c.json({ error: 'Internal server error while unfreezing account' }, 500);
  }
});

// Admin: assign premium product to a user
app.post("/admin/premium", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, { isSuperAdmin: true, userId: null }, 'premium.assign', 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for premium assignment. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { userId, amount, position, productId } = await c.req.json();
    if (!userId || amount === undefined || position === undefined) {
      return c.json({ error: 'userId, amount, and position are required' }, 400);
    }

    const premiumAmount = Number(amount);
    const requestedPremiumPosition = Number(position);

    if (!Number.isFinite(premiumAmount) || premiumAmount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400);
    }

    if (!Number.isInteger(requestedPremiumPosition) || requestedPremiumPosition <= 0) {
      return c.json({ error: 'position must be a positive integer' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedProductId = String(productId || '').trim();
    const todayDate = new Date().toISOString().slice(0, 10);
    const currentTaskState = buildTaskState(user);
    const normalizedTaskState = currentTaskState.currentSetDate === todayDate
      ? currentTaskState
      : {
          ...currentTaskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };
    const tasksPerSet = normalizedTaskState.tasksPerSet;
    const currentProgress = normalizedTaskState.currentSetTasksCompleted;
    const effectivePremiumPosition = currentProgress >= tasksPerSet
      ? 1
      : Math.min(tasksPerSet, Math.max(currentProgress + 1, requestedPremiumPosition));
    const catalog = await getTaskProductCatalog();
    const assignedProduct = normalizedProductId
      ? catalog.find((item: any) => String(item?.id || '') === normalizedProductId)
      : null;

    if (normalizedProductId && !assignedProduct) {
      return c.json({ error: 'Selected premium product was not found in catalog' }, 400);
    }

    const currentBalance = Number(user?.balance ?? 0);
    const bundleDetails = buildPremiumBundleDetails(premiumAmount);
    const bundleTotal = Number(bundleDetails.bundleTotal || 0);
    const vipPremiumRate = getVipPremiumProfitRate(String(user?.vipTier || 'Normal'));
    const potentialPremiumProfit = roundCurrency(bundleTotal * vipPremiumRate);
    const balanceAfterAssignment = roundCurrency(currentBalance - bundleTotal);
    const projectedTopUpRequired = balanceAfterAssignment < 0 ? Math.abs(balanceAfterAssignment) : 0;
    const premiumOrderId = `PRM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const updatedUser = {
      ...user,
      premiumAssignment: {
        orderId: premiumOrderId,
        amount: bundleTotal,
        enteredAmount: premiumAmount,
        position: effectivePremiumPosition,
        productId: assignedProduct?.id || null,
        productName: assignedProduct?.name || null,
        productImage: assignedProduct?.image || null,
        vipRate: vipPremiumRate,
        multiplier: 1,
        potentialProfit: potentialPremiumProfit,
        bundleProductCount: bundleDetails.individualProductCount,
        bundleItems: bundleDetails.bundleItems,
        previousBalance: null,
        balanceAfterAssignment: null,
        topUpRequired: null,
        projectedBalanceAfterEncounter: balanceAfterAssignment,
        projectedTopUpRequired,
        encounteredAt: null,
        encounteredTaskNumber: null,
        assignedAt: new Date().toISOString(),
      },
      accountFrozen: Boolean(user?.accountFrozen ?? false),
      freezeAmount: Number(user?.freezeAmount ?? 0),
      balance: currentBalance,
    };

    await kv.set(key, updatedUser);

    return c.json({
      success: true,
      user: updatedUser,
      result: {
        boostedCommission: potentialPremiumProfit,
        potentialProfit: potentialPremiumProfit,
        frozen: false,
        willFreezeOnEncounter: projectedTopUpRequired > 0,
        orderId: premiumOrderId,
        bundleTotal,
        topUpRequired: projectedTopUpRequired,
        requestedPosition: requestedPremiumPosition,
        effectivePosition: effectivePremiumPosition,
      },
    });
  } catch (error) {
    console.error(`Error assigning premium product: ${error}`);
    return c.json({ error: 'Internal server error while assigning premium product' }, 500);
  }
});

// Admin: update a user's VIP tier
app.put("/admin/vip-tier", async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.update_vip');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const { userId, vipTier } = await c.req.json();
    if (!userId || !vipTier) {
      return c.json({ error: 'userId and vipTier are required' }, 400);
    }

    const allowedTiers = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    if (!allowedTiers.includes(vipTier)) {
      return c.json({ error: 'Invalid vipTier value' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, user)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const updatedUser = {
      ...user,
      vipTier,
      tierSetProgress: 0,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(key, updatedUser);

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(`Error updating admin VIP tier: ${error}`);
    return c.json({ error: 'Internal server error while updating VIP tier' }, 500);
  }
});

// Admin: list all premium assignments
app.get("/admin/premium/list", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const allUsers = await kv.getByPrefix('user:');
    const premiumAssignments = [];

    for (const user of allUsers) {
      if (user?.premiumAssignment) {
        premiumAssignments.push({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          assignment: user.premiumAssignment,
          currentBalance: user.balance,
          accountFrozen: user.accountFrozen,
          freezeAmount: user.freezeAmount,
        });
      }
    }

    return c.json({
      success: true,
      total: premiumAssignments.length,
      assignments: premiumAssignments,
    });
  } catch (error) {
    console.error(`Error listing premium assignments: ${error}`);
    return c.json({ error: 'Internal server error while listing premium assignments' }, 500);
  }
});

// Admin: revoke premium assignment from a user
app.post("/admin/premium/revoke", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!user?.premiumAssignment) {
      return c.json({ error: 'User has no active premium assignment' }, 400);
    }

    const oldAssignment = user.premiumAssignment;
    const updatedUser = {
      ...user,
      premiumAssignment: null,
      accountFrozen: false,
      freezeAmount: 0,
      premiumRevoked: {
        originalAmount: oldAssignment.amount,
        revokedAt: new Date().toISOString(),
      },
    };

    await kv.set(key, updatedUser);

    return c.json({
      success: true,
      message: `Premium assignment revoked for user ${userId}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error(`Error revoking premium assignment: ${error}`);
    return c.json({ error: 'Internal server error while revoking premium assignment' }, 500);
  }
});

// Admin: get premium analytics
app.get("/admin/premium/analytics", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const allUsers = await kv.getByPrefix('user:');
    let totalAssignments = 0;
    let totalPremiumValue = 0;
    let frozenAccounts = 0;
    const assignments = [];

    for (const user of allUsers) {
      if (user?.premiumAssignment) {
        totalAssignments++;
        totalPremiumValue += user.premiumAssignment.amount;
        assignments.push({
          userId: user.id,
          amount: user.premiumAssignment.amount,
          position: user.premiumAssignment.position,
          assignedAt: user.premiumAssignment.assignedAt,
          isFrozen: user.accountFrozen,
        });

        if (user.accountFrozen) {
          frozenAccounts++;
        }
      }
    }

    const avgValue = totalAssignments > 0 ? totalPremiumValue / totalAssignments : 0;

    return c.json({
      success: true,
      analytics: {
        totalAssignments,
        totalPremiumValue,
        averageValue: avgValue,
        frozenAccounts,
        unfrozenAccounts: totalAssignments - frozenAccounts,
        assignments: assignments.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()),
      },
    });
  } catch (error) {
    console.error(`Error fetching premium analytics: ${error}`);
    return c.json({ error: 'Internal server error while fetching premium analytics' }, 500);
  }
});

// Admin: list task product catalog
app.get('/admin/task-products', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const products = await getTaskProductCatalog();
    return c.json({ success: true, products });
  } catch (error) {
    console.error(`Error listing task products: ${error}`);
    return c.json({ error: 'Internal server error while listing task products' }, 500);
  }
});

// Admin: add one task product manually
app.post('/admin/task-products', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const body = await c.req.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const image = String(body?.image || '').trim();
    const isPremiumTemplate = Boolean(body?.isPremiumTemplate);
    const isActive = body?.isActive === undefined ? true : Boolean(body?.isActive);

    if (!name) {
      return c.json({ error: 'name is required' }, 400);
    }
    if (!isValidTaskProductImageUrl(image)) {
      return c.json({ error: 'A valid image URL (http/https) is required' }, 400);
    }

    const products = await getTaskProductCatalog();
    const timestamp = new Date().toISOString();

    const newProduct = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      image,
      isActive,
      isArchived: false,
      isPremiumTemplate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const updatedProducts = [newProduct, ...products];
    await saveTaskProductCatalog(updatedProducts, adminAccess.userId || 'super_admin');

    return c.json({ success: true, product: newProduct, products: updatedProducts });
  } catch (error) {
    console.error(`Error creating task product: ${error}`);
    return c.json({ error: 'Internal server error while creating task product' }, 500);
  }
});

// Admin: auto-generate task products (AI-style)
app.post('/admin/task-products/generate', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const body = await c.req.json().catch(() => ({}));
    const count = Math.max(1, Math.min(50, Number(body?.count || 10)));

    const generated = generateAiTaskProducts(count);
    const products = await getTaskProductCatalog();
    const updatedProducts = [...generated, ...products].slice(0, 500);
    await saveTaskProductCatalog(updatedProducts, adminAccess.userId || 'super_admin');

    return c.json({ success: true, generated, products: updatedProducts });
  } catch (error) {
    console.error(`Error generating task products: ${error}`);
    return c.json({ error: 'Internal server error while generating task products' }, 500);
  }
});

// Admin: update one task product
app.put('/admin/task-products/:productId', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const productId = String(c.req.param('productId') || '').trim();
    if (!productId) {
      return c.json({ error: 'productId is required' }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const products = await getTaskProductCatalog();
    const targetIndex = products.findIndex((item: any) => String(item?.id || '') === productId);
    if (targetIndex < 0) {
      return c.json({ error: 'Task product not found' }, 404);
    }

    const target = products[targetIndex];
    const candidateName = body?.name !== undefined ? String(body.name || '').trim() : String(target.name || '').trim();
    const candidateImage = body?.image !== undefined ? String(body.image || '').trim() : String(target.image || '').trim();

    if (!candidateName) {
      return c.json({ error: 'name cannot be empty' }, 400);
    }
    if (!isValidTaskProductImageUrl(candidateImage)) {
      return c.json({ error: 'A valid image URL (http/https) is required' }, 400);
    }

    const updated = {
      ...target,
      name: candidateName,
      image: candidateImage,
      isActive: body?.isActive !== undefined ? Boolean(body.isActive) : target.isActive,
      isPremiumTemplate: body?.isPremiumTemplate !== undefined ? Boolean(body.isPremiumTemplate) : target.isPremiumTemplate,
      updatedAt: new Date().toISOString(),
    };

    const updatedProducts = [...products];
    updatedProducts[targetIndex] = updated;
    await saveTaskProductCatalog(updatedProducts, adminAccess.userId || 'super_admin');

    return c.json({ success: true, product: updated, products: updatedProducts });
  } catch (error) {
    console.error(`Error updating task product: ${error}`);
    return c.json({ error: 'Internal server error while updating task product' }, 500);
  }
});

// Admin: delete one task product
app.delete('/admin/task-products/:productId', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const productId = String(c.req.param('productId') || '').trim();
    if (!productId) {
      return c.json({ error: 'productId is required' }, 400);
    }

    const products = await getTaskProductCatalog();
    const exists = products.some((item: any) => String(item?.id || '') === productId);
    if (!exists) {
      return c.json({ error: 'Task product not found' }, 404);
    }

    const updatedProducts = products.map((item: any) => {
      if (String(item?.id || '') !== productId) {
        return item;
      }
      return {
        ...item,
        isArchived: true,
        isActive: false,
        updatedAt: new Date().toISOString(),
      };
    });
    await saveTaskProductCatalog(updatedProducts, adminAccess.userId || 'super_admin');

    return c.json({ success: true, archivedProductId: productId, products: updatedProducts });
  } catch (error) {
    console.error(`Error deleting task product: ${error}`);
    return c.json({ error: 'Internal server error while deleting task product' }, 500);
  }
});

// Admin: restore archived task product
app.post('/admin/task-products/:productId/restore', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const productId = String(c.req.param('productId') || '').trim();
    if (!productId) {
      return c.json({ error: 'productId is required' }, 400);
    }

    const products = await getTaskProductCatalog();
    const exists = products.some((item: any) => String(item?.id || '') === productId);
    if (!exists) {
      return c.json({ error: 'Task product not found' }, 404);
    }

    const updatedProducts = products.map((item: any) => {
      if (String(item?.id || '') !== productId) {
        return item;
      }
      return {
        ...item,
        isArchived: false,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };
    });

    await saveTaskProductCatalog(updatedProducts, adminAccess.userId || 'super_admin');
    return c.json({ success: true, restoredProductId: productId, products: updatedProducts });
  } catch (error) {
    console.error(`Error restoring task product: ${error}`);
    return c.json({ error: 'Internal server error while restoring task product' }, 500);
  }
});

// Protected: get next task product generated from admin catalog and premium assignment rules
app.get('/tasks/next-product', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    if (userProfile?.accountDisabled) {
      return c.json({ error: 'Account is disabled. Contact support to reactivate your account.' }, 403);
    }

    if (userProfile?.accountFrozen) {
      return c.json({ error: 'Account is frozen. Contact customer service to continue.' }, 403);
    }

    const vipTier = String(userProfile?.vipTier || 'Normal');
    const minimumRequiredBalance = getMinimumRequiredBalanceForVip(vipTier);
    const currentBalance = roundCurrency(Number(userProfile?.balance ?? 0));
    if (currentBalance < minimumRequiredBalance) {
      return c.json({
        error: `Minimum balance of $${minimumRequiredBalance.toFixed(2)} is required for ${vipTier} task submission`,
        minimumRequiredBalance,
        currentBalance,
        vipTier,
      }, 403);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const taskState = buildTaskState(userProfile);
    const normalizedTaskState = taskState.currentSetDate === todayDate
      ? taskState
      : {
          ...taskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };

    const maxSetsForToday = normalizedTaskState.dailyTaskSetLimit + normalizedTaskState.extraTaskSets;
    if (normalizedTaskState.taskSetsCompletedToday >= maxSetsForToday) {
      return c.json({
        error: 'Daily task set limit reached. Contact admin for additional sets.',
        taskState: {
          ...normalizedTaskState,
          maxSetsForToday,
          remainingSets: 0,
        },
      }, 400);
    }

    if (normalizedTaskState.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet) {
      return c.json({
        error: 'Current task set is complete. Reset task set before starting more products.',
        taskState: {
          ...normalizedTaskState,
          maxSetsForToday,
          remainingSets: Math.max(0, maxSetsForToday - normalizedTaskState.taskSetsCompletedToday),
          setCompleted: true,
        },
      }, 409);
    }

    const nextTaskNumber = normalizedTaskState.currentSetTasksCompleted + 1;
    const product = await buildNextTaskProduct(userProfile, nextTaskNumber);

    return c.json({
      success: true,
      product,
      taskState: {
        ...normalizedTaskState,
        nextTaskNumber,
        maxSetsForToday,
        remainingSets: Math.max(0, maxSetsForToday - normalizedTaskState.taskSetsCompletedToday),
      },
    });
  } catch (error) {
    console.error(`Error generating next task product: ${error}`);
    return c.json({ error: 'Internal server error while generating next task product' }, 500);
  }
});

// Submit product with profit sharing (protected route)
app.post("/submit-product", async (c) => {
  let idempotencyStoreKey = '';
  let releaseFinancialLock: (() => Promise<void>) | null = null;
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while submitting product: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { productName, productValue } = await c.req.json();
    const normalizedName = String(productName || '').trim();
    const normalizedValue = Number(productValue || 0);

    if (!normalizedName || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      return c.json({ error: "Product name and positive value are required" }, 400);
    }

    const idempotencyKey = getIdempotencyKey(c) || `auto-submit-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    releaseFinancialLock = await acquireFinancialLock('user', String(userId));
    if (!releaseFinancialLock) {
      return c.json({ error: 'Financial operation is busy. Please retry shortly.' }, 409);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    if (userProfile?.accountDisabled) {
      return c.json({ error: 'Account is disabled. Contact support to reactivate your account.' }, 403);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const taskState = buildTaskState(userProfile);

    const normalizedTaskState = taskState.currentSetDate === todayDate
      ? taskState
      : {
          ...taskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };

    const maxSetsForToday = normalizedTaskState.dailyTaskSetLimit + normalizedTaskState.extraTaskSets;

    if (normalizedTaskState.taskSetsCompletedToday >= maxSetsForToday) {
      return c.json({
        error: 'Daily task set limit reached. Contact admin for additional sets.',
        taskState: {
          ...normalizedTaskState,
          maxSetsForToday,
          remainingSets: 0,
        },
      }, 400);
    }

    if (normalizedTaskState.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet) {
      return c.json({
        error: 'Current task set is complete. Reset task set before submitting more products.',
        taskState: {
          ...normalizedTaskState,
          maxSetsForToday,
          remainingSets: Math.max(0, maxSetsForToday - normalizedTaskState.taskSetsCompletedToday),
          setCompleted: true,
        },
      }, 409);
    }

    if (userProfile?.accountFrozen) {
      return c.json({ error: 'Account is frozen. Contact customer service to continue.' }, 403);
    }

    const vipTier = String(userProfile?.vipTier || 'Normal');
    const minimumRequiredBalance = getMinimumRequiredBalanceForVip(vipTier);
    const currentBalance = roundCurrency(Number(userProfile?.balance ?? 0));
    if (currentBalance < minimumRequiredBalance) {
      return c.json({
        error: `Minimum balance of $${minimumRequiredBalance.toFixed(2)} is required for ${vipTier} task submission`,
        minimumRequiredBalance,
        currentBalance,
        vipTier,
      }, 403);
    }

    const idempotencyFingerprint = JSON.stringify({
      userId,
      productName: normalizedName,
      productValue: normalizedValue,
      currentSetDate: normalizedTaskState.currentSetDate,
      currentSetTasksCompleted: normalizedTaskState.currentSetTasksCompleted,
    });
    idempotencyStoreKey = buildIdempotencyStoreKey('tasks.submit_product', String(userId), idempotencyKey);
    const idempotencyState = await beginIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint);
    if (idempotencyState.state === 'conflict') {
      return c.json({ error: 'Idempotency-Key conflict for different submit-product payload' }, 409);
    }
    if (idempotencyState.state === 'in_progress') {
      return c.json({ error: 'Duplicate submit-product request is already in progress' }, 409);
    }
    if (idempotencyState.state === 'replay') {
      return c.json(idempotencyState.responseBody, idempotencyState.responseStatus as any, {
        'Idempotent-Replay': 'true',
        'Idempotency-Key': idempotencyKey,
      });
    }

    const activePremiumAssignment = userProfile?.premiumAssignment || null;
    let effectivePremiumAssignment = activePremiumAssignment;
    let currentBalanceForProfit = roundCurrency(Number(userProfile?.balance ?? 0));
    const premiumPosition = Number(activePremiumAssignment?.position ?? 0);
    const nextTaskNumber = normalizedTaskState.currentSetTasksCompleted + 1;
    const shouldTriggerPremiumEncounter = Boolean(
      activePremiumAssignment
      && !activePremiumAssignment?.encounteredAt
      && Number.isInteger(premiumPosition)
      && premiumPosition > 0
      && nextTaskNumber === premiumPosition
    );

    if (shouldTriggerPremiumEncounter) {
      const bundleTotal = roundCurrency(Number(activePremiumAssignment?.amount ?? activePremiumAssignment?.enteredAmount ?? 0));
      const currentBalance = roundCurrency(Number(userProfile?.balance ?? 0));
      const balanceAfterEncounter = roundCurrency(currentBalance - bundleTotal);
      const topUpRequired = balanceAfterEncounter < 0 ? Math.abs(balanceAfterEncounter) : 0;
      const encounteredAt = new Date().toISOString();

      const updatedAssignment = {
        ...activePremiumAssignment,
        amount: bundleTotal,
        previousBalance: currentBalance,
        balanceAfterAssignment: balanceAfterEncounter,
        topUpRequired,
        encounteredAt,
        encounteredTaskNumber: nextTaskNumber,
      };

      effectivePremiumAssignment = updatedAssignment;

      if (balanceAfterEncounter < 0) {
        const frozenProfile = {
          ...userProfile,
          premiumAssignment: updatedAssignment,
          accountFrozen: true,
          freezeAmount: topUpRequired,
          balance: balanceAfterEncounter,
          updatedAt: encounteredAt,
        };

        await kv.set(`user:${userId}`, frozenProfile);
        await kv.set(`product:${userId}:${Date.now()}`, {
          id: `prd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId,
          productName: normalizedName,
          productImage: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400',
          productValue: normalizedValue,
          userEarned: 0,
          commissionsCascade: [],
          status: 'frozen',
          submittedAt: encounteredAt,
        });

        return c.json({
          error: 'Account is frozen. Premium product encountered and top-up is required to continue.',
          premiumEncounter: {
            orderId: updatedAssignment.orderId || null,
            position: premiumPosition,
            topUpRequired,
            amount: bundleTotal,
          },
          user: {
            accountFrozen: true,
            freezeAmount: topUpRequired,
            balance: balanceAfterEncounter,
            premiumAssignment: updatedAssignment,
          },
        }, 403);
      }

      currentBalanceForProfit = balanceAfterEncounter;
    }

    // Calculate profit distribution
    const profitAmount = normalizedValue * 0.8; // 80% to user

    // Update user balance
    const updatedProfile = {
      ...userProfile,
      balance: roundCurrency(currentBalanceForProfit + profitAmount),
      premiumAssignment: effectivePremiumAssignment,
      productsSubmitted: Number(userProfile.productsSubmitted || 0) + 1,
      dailyTaskSetLimit: normalizedTaskState.dailyTaskSetLimit,
      extraTaskSets: normalizedTaskState.extraTaskSets,
      taskSetsCompletedToday: normalizedTaskState.taskSetsCompletedToday,
      currentSetTasksCompleted: normalizedTaskState.currentSetTasksCompleted + 1,
      currentSetDate: todayDate,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`user:${userId}`, updatedProfile);

    // Update user profits record
    const userProfits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };
    userProfits.totalEarned = (userProfits.totalEarned || 0) + profitAmount;
    await kv.set(`profits:${userId}`, userProfits);

    // Multi-level commission cascade
    let currentParentId = userProfile.parentUserId;
      let commissionAmount = normalizedValue * 0.2; // Start with 20% for direct parent
    let level = 1;
    const commissionLog = [];

    while (currentParentId && level <= 10) { // Limit to 10 levels
      const parentProfile = await kv.get(`user:${currentParentId}`);
      if (!parentProfile) break;

      // Update parent balance
      parentProfile.balance = (parentProfile.balance || 0) + commissionAmount;
      
      // Track by source
      if (level === 1) {
        parentProfile.totalProfitFromChildren = (parentProfile.totalProfitFromChildren || 0) + commissionAmount;
      } else {
        parentProfile.totalProfitFromChildren = (parentProfile.totalProfitFromChildren || 0) + commissionAmount;
      }
      
      await kv.set(`user:${currentParentId}`, parentProfile);

      // Update parent profits record
      const parentProfits = await kv.get(`profits:${currentParentId}`) || {
        totalEarned: 0,
        fromDirectChildren: 0,
        fromIndirectReferrals: 0,
        byLevel: {},
      };
      
      if (level === 1) {
        parentProfits.fromDirectChildren = (parentProfits.fromDirectChildren || 0) + commissionAmount;
      } else {
        parentProfits.fromIndirectReferrals = (parentProfits.fromIndirectReferrals || 0) + commissionAmount;
      }
      
      parentProfits.totalEarned = (parentProfits.totalEarned || 0) + commissionAmount;
      parentProfits.byLevel = parentProfits.byLevel || {};
      parentProfits.byLevel[`level_${level}`] = (parentProfits.byLevel[`level_${level}`] || 0) + commissionAmount;
      
      await kv.set(`profits:${currentParentId}`, parentProfits);

      // Update referral relationship (for direct parent only)
      if (level === 1) {
        const referralKey = `referral:${currentParentId}:${userId}`;
        const referral = await kv.get(referralKey) || {};
        referral.totalSharedProfit = (referral.totalSharedProfit || 0) + commissionAmount;
        referral.lastProductAt = new Date().toISOString();
        await kv.set(referralKey, referral);
      }

      commissionLog.push({
        level,
        parentId: currentParentId,
        amount: commissionAmount,
      });

      // Get grandparent for next iteration
      const grandparent = parentProfile.parentUserId;
      
      // Reduce commission by 10% for next level (10% of current = cascading down)
      commissionAmount = commissionAmount * 0.1;
      
      currentParentId = grandparent;
      level++;
    }

    // Log product submission
    await kv.set(`product:${userId}:${Date.now()}`, {
      userId,
      productName: normalizedName,
      productValue: normalizedValue,
      userEarned: profitAmount,
      commissionsCascade: commissionLog,
      submittedAt: new Date().toISOString(),
    });

    const responseBody = {
      success: true,
      product: {
        name: normalizedName,
        value: normalizedValue,
        userEarned: profitAmount,
        commissionsCascade: commissionLog,
      },
      newBalance: updatedProfile.balance,
      taskState: {
        dailyTaskSetLimit: updatedProfile.dailyTaskSetLimit,
        extraTaskSets: updatedProfile.extraTaskSets,
        taskSetsCompletedToday: updatedProfile.taskSetsCompletedToday,
        currentSetTasksCompleted: updatedProfile.currentSetTasksCompleted,
        tasksPerSet: normalizedTaskState.tasksPerSet,
        currentSetDate: updatedProfile.currentSetDate,
        maxSetsForToday,
        remainingSets: Math.max(0, maxSetsForToday - updatedProfile.taskSetsCompletedToday),
      },
    };

    await completeIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint, 200, responseBody);
    return c.json(responseBody, 200, {
      'Idempotency-Key': idempotencyKey,
    });
  } catch (error) {
    if (idempotencyStoreKey) {
      await kv.del(idempotencyStoreKey).catch(() => undefined);
    }
    console.error(`Error submitting product: ${error}`);
    return c.json({ error: "Internal server error while submitting product" }, 500);
  } finally {
    if (releaseFinancialLock) {
      await releaseFinancialLock().catch(() => undefined);
    }
  }
});

app.post('/tasks/complete-product', async (c) => {
  let idempotencyStoreKey = '';
  let releaseFinancialLock: (() => Promise<void>) | null = null;
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const { productName, productValue } = await c.req.json();
    const normalizedName = String(productName || '').trim();
    const normalizedValue = Number(productValue || 0);

    if (!normalizedName || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      return c.json({ error: 'productName and productValue are required' }, 400);
    }

    const idempotencyKey = getIdempotencyKey(c) || `auto-complete-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    releaseFinancialLock = await acquireFinancialLock('user', String(userId));
    if (!releaseFinancialLock) {
      return c.json({ error: 'Financial operation is busy. Please retry shortly.' }, 409);
    }

    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    if (userProfile?.accountDisabled) {
      return c.json({ error: 'Account is disabled. Contact support to reactivate your account.' }, 403);
    }

    if (userProfile?.accountFrozen) {
      return c.json({ error: 'Account is frozen. Contact customer service to continue.' }, 403);
    }

    const vipTier = String(userProfile?.vipTier || 'Normal');
    const minimumRequiredBalance = getMinimumRequiredBalanceForVip(vipTier);
    const currentBalance = roundCurrency(Number(userProfile?.balance ?? 0));
    if (currentBalance < minimumRequiredBalance) {
      return c.json({
        error: `Minimum balance of $${minimumRequiredBalance.toFixed(2)} is required for ${vipTier} task submission`,
        minimumRequiredBalance,
        currentBalance,
        vipTier,
      }, 403);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const taskState = buildTaskState(userProfile);
    const normalizedTaskState = taskState.currentSetDate === todayDate
      ? taskState
      : {
          ...taskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };

    const maxSetsForToday = normalizedTaskState.dailyTaskSetLimit + normalizedTaskState.extraTaskSets;
    if (normalizedTaskState.taskSetsCompletedToday >= maxSetsForToday) {
      return c.json({
        error: 'Daily task set limit reached. Contact admin for additional sets.',
        taskState: {
          ...normalizedTaskState,
          maxSetsForToday,
          remainingSets: 0,
        },
      }, 400);
    }

    if (normalizedTaskState.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet) {
      return c.json({
        error: 'Current task set is complete. Reset task set before submitting more products.',
        taskState: {
          ...normalizedTaskState,
          maxSetsForToday,
          remainingSets: Math.max(0, maxSetsForToday - normalizedTaskState.taskSetsCompletedToday),
          setCompleted: true,
        },
      }, 409);
    }

    const idempotencyFingerprint = JSON.stringify({
      userId,
      productName: normalizedName,
      productValue: normalizedValue,
      currentSetDate: normalizedTaskState.currentSetDate,
      currentSetTasksCompleted: normalizedTaskState.currentSetTasksCompleted,
    });
    idempotencyStoreKey = buildIdempotencyStoreKey('tasks.complete_product', String(userId), idempotencyKey);
    const idempotencyState = await beginIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint);
    if (idempotencyState.state === 'conflict') {
      return c.json({ error: 'Idempotency-Key conflict for different complete-product payload' }, 409);
    }
    if (idempotencyState.state === 'in_progress') {
      return c.json({ error: 'Duplicate complete-product request is already in progress' }, 409);
    }
    if (idempotencyState.state === 'replay') {
      return c.json(idempotencyState.responseBody, idempotencyState.responseStatus as any, {
        'Idempotent-Replay': 'true',
        'Idempotency-Key': idempotencyKey,
      });
    }

    const activePremiumAssignment = userProfile?.premiumAssignment || null;
    let effectivePremiumAssignment = activePremiumAssignment;
    let currentBalanceForProfit = roundCurrency(Number(userProfile?.balance ?? 0));
    const premiumPosition = Number(activePremiumAssignment?.position ?? 0);
    const nextTaskNumber = normalizedTaskState.currentSetTasksCompleted + 1;
    const shouldTriggerPremiumEncounter = Boolean(
      activePremiumAssignment
      && !activePremiumAssignment?.encounteredAt
      && Number.isInteger(premiumPosition)
      && premiumPosition > 0
      && nextTaskNumber === premiumPosition
    );

    if (shouldTriggerPremiumEncounter) {
      const bundleTotal = roundCurrency(Number(activePremiumAssignment?.amount ?? activePremiumAssignment?.enteredAmount ?? 0));
      const currentBalance = roundCurrency(Number(userProfile?.balance ?? 0));
      const balanceAfterEncounter = roundCurrency(currentBalance - bundleTotal);
      const topUpRequired = balanceAfterEncounter < 0 ? Math.abs(balanceAfterEncounter) : 0;
      const encounteredAt = new Date().toISOString();

      const updatedAssignment = {
        ...activePremiumAssignment,
        amount: bundleTotal,
        previousBalance: currentBalance,
        balanceAfterAssignment: balanceAfterEncounter,
        topUpRequired,
        encounteredAt,
        encounteredTaskNumber: nextTaskNumber,
      };

      effectivePremiumAssignment = updatedAssignment;

      if (balanceAfterEncounter < 0) {
        const frozenProfile = {
          ...userProfile,
          premiumAssignment: updatedAssignment,
          accountFrozen: true,
          freezeAmount: topUpRequired,
          balance: balanceAfterEncounter,
          updatedAt: encounteredAt,
        };

        await kv.set(`user:${userId}`, frozenProfile);

        return c.json({
          error: 'Account is frozen. Premium product encountered and top-up is required to continue.',
          premiumEncounter: {
            orderId: updatedAssignment.orderId || null,
            position: premiumPosition,
            topUpRequired,
            amount: bundleTotal,
          },
          user: {
            accountFrozen: true,
            freezeAmount: topUpRequired,
            balance: balanceAfterEncounter,
            premiumAssignment: updatedAssignment,
          },
        }, 403);
      }

      currentBalanceForProfit = balanceAfterEncounter;
    }

    const appliedProfit = roundCurrency(normalizedValue * getVipTaskCommissionRate(String(userProfile?.vipTier || 'Normal')));

    const updatedProfile = {
      ...userProfile,
      balance: roundCurrency(currentBalanceForProfit + appliedProfit),
      premiumAssignment: effectivePremiumAssignment,
      productsSubmitted: Number(userProfile.productsSubmitted || 0) + 1,
      dailyTaskSetLimit: normalizedTaskState.dailyTaskSetLimit,
      extraTaskSets: normalizedTaskState.extraTaskSets,
      taskSetsCompletedToday: normalizedTaskState.taskSetsCompletedToday,
      currentSetTasksCompleted: normalizedTaskState.currentSetTasksCompleted + 1,
      currentSetDate: todayDate,
      lastCompletedTaskAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${userId}`, updatedProfile);

    const userProfits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };
    userProfits.totalEarned = roundCurrency(Number(userProfits.totalEarned || 0) + appliedProfit);
    await kv.set(`profits:${userId}`, userProfits);
    const totalEarnings = computeTotalEarnings(updatedProfile, Number(userProfits.totalEarned || 0));

    const submittedAt = new Date().toISOString();
    await kv.set(`product:${userId}:${Date.now()}`, {
      id: `prd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      productName: normalizedName,
      productImage: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400',
      productValue: normalizedValue,
      userEarned: appliedProfit,
      commissionsCascade: [],
      status: 'approved',
      submittedAt,
    });

    const currentSetDone = updatedProfile.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet;
    if (currentSetDone) {
      const existingAlerts = await kv.get(`admin:reset-alerts:${userId}`) || [];
      existingAlerts.push({
        id: `rst_${Date.now()}`,
        userId,
        userName: updatedProfile.name || 'User',
        vipTier: updatedProfile.vipTier || 'Normal',
        message: `Task set complete (${updatedProfile.currentSetTasksCompleted}/${normalizedTaskState.tasksPerSet}). Reset required.`,
        createdAt: new Date().toISOString(),
        status: 'new',
      });
      await kv.set(`admin:reset-alerts:${userId}`, existingAlerts.slice(-50));
    }

    const responseBody = {
      success: true,
      result: {
        productName: normalizedName,
        productValue: normalizedValue,
        profit: appliedProfit,
      },
      user: {
        ...updatedProfile,
        totalEarnings,
      },
      taskState: {
        dailyTaskSetLimit: updatedProfile.dailyTaskSetLimit,
        extraTaskSets: updatedProfile.extraTaskSets,
        taskSetsCompletedToday: updatedProfile.taskSetsCompletedToday,
        currentSetTasksCompleted: updatedProfile.currentSetTasksCompleted,
        tasksPerSet: normalizedTaskState.tasksPerSet,
        currentSetDate: updatedProfile.currentSetDate,
        maxSetsForToday,
        remainingSets: Math.max(0, maxSetsForToday - updatedProfile.taskSetsCompletedToday),
        setCompleted: currentSetDone,
      },
      resetRequired: currentSetDone,
    };

    await completeIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint, 200, responseBody);
    return c.json(responseBody, 200, {
      'Idempotency-Key': idempotencyKey,
    });
  } catch (error) {
    if (idempotencyStoreKey) {
      await kv.del(idempotencyStoreKey).catch(() => undefined);
    }
    console.error(`Error completing product task: ${error}`);
    return c.json({ error: 'Internal server error while completing product task' }, 500);
  } finally {
    if (releaseFinancialLock) {
      await releaseFinancialLock().catch(() => undefined);
    }
  }
});

// Reset current task set (protected route)
app.post('/tasks/reset-set', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const mode = String(body?.mode || 'complete_set');

    const profileKey = `user:${userId}`;
    const userProfile = await kv.get(profileKey);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const taskState = buildTaskState(userProfile);
    const normalizedTaskState = taskState.currentSetDate === todayDate
      ? taskState
      : {
          ...taskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };

    const maxSetsForToday = normalizedTaskState.dailyTaskSetLimit + normalizedTaskState.extraTaskSets;

    const isSetComplete = normalizedTaskState.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet;
    const canCountAnotherSet = normalizedTaskState.taskSetsCompletedToday < maxSetsForToday;
    const shouldCountCompletedSet = isSetComplete && canCountAnotherSet;

    if (mode === 'complete_set' && !isSetComplete) {
      return c.json({ error: 'Current task set is not complete yet' }, 400);
    }

    if (mode === 'complete_set' && !canCountAnotherSet) {
      return c.json({ error: 'Daily task set limit reached' }, 400);
    }

    if (shouldCountCompletedSet) {
      normalizedTaskState.taskSetsCompletedToday += 1;
    }

    const vipProgress = applyVipAutoUpgrade(userProfile, shouldCountCompletedSet ? 1 : 0);

    const shouldClearPremiumAssignmentOnReset = Boolean(userProfile?.accountFrozen);

    const updatedProfile = {
      ...userProfile,
      vipTier: vipProgress.vipTier,
      tierSetProgress: vipProgress.tierSetProgress,
      totalTaskSetsCompleted: vipProgress.totalTaskSetsCompleted,
      dailyTaskSetLimit: normalizedTaskState.dailyTaskSetLimit,
      extraTaskSets: normalizedTaskState.extraTaskSets,
      taskSetsCompletedToday: normalizedTaskState.taskSetsCompletedToday,
      currentSetTasksCompleted: 0,
      currentSetDate: todayDate,
      balance: roundCurrency(Number(userProfile?.balance || 0)),
      accountFrozen: false,
      freezeAmount: 0,
      premiumAssignment: shouldClearPremiumAssignmentOnReset ? null : userProfile?.premiumAssignment || null,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(profileKey, updatedProfile);

    return c.json({
      success: true,
      message: mode === 'complete_set' ? 'Task set completed and reset' : 'Task set reset',
      vipUpgrade: {
        upgraded: vipProgress.upgraded,
        upgrades: vipProgress.upgrades,
        currentTier: vipProgress.vipTier,
        tierSetProgress: vipProgress.tierSetProgress,
        requiredSetsForNextUpgrade: vipProgress.requiredSetsForNextUpgrade,
        remainingSetsForNextUpgrade: vipProgress.remainingSetsForNextUpgrade,
      },
      taskState: {
        dailyTaskSetLimit: updatedProfile.dailyTaskSetLimit,
        extraTaskSets: updatedProfile.extraTaskSets,
        taskSetsCompletedToday: updatedProfile.taskSetsCompletedToday,
        currentSetTasksCompleted: updatedProfile.currentSetTasksCompleted,
        tasksPerSet: getTasksPerSetByTier(updatedProfile.vipTier || 'Normal'),
        currentSetDate: updatedProfile.currentSetDate,
        maxSetsForToday,
        remainingSets: Math.max(0, maxSetsForToday - updatedProfile.taskSetsCompletedToday),
      },
    });
  } catch (error) {
    console.error(`Error resetting task set: ${error}`);
    return c.json({ error: 'Internal server error while resetting task set' }, 500);
  }
});

app.get('/records', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error || !userId) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Get submitted/frozen records
    const products = await kv.getByPrefix(`product:${userId}:`);
    const backendRecords = (products || [])
      .filter((item: any) => item)
      .map((item: any, index: number) => {
        const iso = String(item?.submittedAt || item?.createdAt || new Date().toISOString());
        const parsedDate = new Date(iso);
        const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        const timestamp = `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(safeDate.getDate()).padStart(2, '0')} ${String(safeDate.getHours()).padStart(2, '0')}:${String(safeDate.getMinutes()).padStart(2, '0')}:${String(safeDate.getSeconds()).padStart(2, '0')}`;
        const rawStatus = String(item?.status || 'approved').toLowerCase();
        const status = (rawStatus === 'pending' || rawStatus === 'frozen' || rawStatus === 'approved')
          ? rawStatus
          : 'approved';
        return {
          id: String(item?.id || `record_${index}_${safeDate.getTime()}`),
          timestamp,
          productName: String(item?.productName || item?.name || 'Product Task'),
          productImage: String(item?.productImage || item?.image || 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400'),
          totalAmount: Number(item?.productValue || item?.value || item?.totalAmount || 0),
          profit: roundCurrency(Number(item?.userEarned || item?.profit || 0)),
          status,
          submittedAt: safeDate.toISOString(),
        };
      });

    const sortedRecords = backendRecords.sort((a: any, b: any) => {
      const aTime = new Date(String(a?.submittedAt || a?.timestamp || 0)).getTime();
      const bTime = new Date(String(b?.submittedAt || b?.timestamp || 0)).getTime();
      return bTime - aTime;
    });

    return c.json({ success: true, records: sortedRecords });
  } catch (error) {
    console.error(`Error fetching records: ${error}`);
    return c.json({ error: 'Internal server error while fetching records' }, 500);
  }
});

// Get multi-level earnings breakdown (protected route)
app.get("/earnings-multilevel", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching multi-level earnings: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get profits record
    const profits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };

    // Count direct children
    const children = [];
    const allReferrals = await kv.getByPrefix(`referral:${userId}:`);
    for (const ref of allReferrals || []) {
      const match = ref?.childId;
      if (match) children.push(ref);
    }

    return c.json({
      success: true,
      earnings: {
        balance: userProfile.balance || 0,
        totalEarned: profits.totalEarned || 0,
        fromDirectChildren: profits.fromDirectChildren || 0,
        fromIndirectReferrals: profits.fromIndirectReferrals || 0,
        childCount: children.length,
        byLevel: profits.byLevel || {},
      },
    });
  } catch (error) {
    console.error(`Error fetching multi-level earnings: ${error}`);
    return c.json({ error: "Internal server error while fetching earnings" }, 500);
  }
});

// Get user earnings and balance (protected route)
app.get("/earnings", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching earnings: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const profile = await kv.get(`user:${userId}`);
    const profits = await kv.get(`profits:${userId}`);
    const referrals = await kv.getByPrefix(`referral:${userId}:`);

    const childCount = profile?.childCount || 0;
    const totalFromChildren = referrals?.reduce((sum: number, ref: any) => sum + (ref?.totalSharedProfit || 0), 0) || 0;

    return c.json({
      success: true,
      earnings: {
        balance: profile?.balance || 0,
        totalEarned: profits?.totalEarned || 0,
        fromDirectChildren: profits?.fromDirectChildren || 0,
        fromIndirectReferrals: profits?.fromIndirectReferrals || 0,
        childCount,
        totalFromChildren,
        parentUserId: profile?.parentUserId || null,
      },
    });
  } catch (error) {
    console.error(`Error fetching earnings: ${error}`);
    return c.json({ error: "Internal server error while fetching earnings" }, 500);
  }
});

// Get user referrals (protected route)
app.get("/referrals", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching referrals: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const referrals = await kv.getByPrefix(`referral:${userId}:`);

    const children = (referrals ?? []).map((ref: any) => ({
      childId: ref?.childId,
      childName: ref?.childName,
      childEmail: ref?.childEmail,
      totalSharedProfit: ref?.totalSharedProfit || 0,
      lastProductAt: ref?.lastProductAt || null,
      createdAt: ref?.createdAt,
    }));

    return c.json({
      success: true,
      referrals: children,
      totalChildren: children.length,
    });
  } catch (error) {
    console.error(`Error fetching referrals: ${error}`);
    return c.json({ error: "Internal server error while fetching referrals" }, 500);
  }
});

// Request withdrawal (protected route)
app.post("/request-withdrawal", async (c) => {
  let idempotencyStoreKey = '';
  let releaseFinancialLock: (() => Promise<void>) | null = null;
  let operationId = '';
  let reservedUserId = '';
  let balanceBeforeReserve: number | null = null;
  let createdWithdrawalId = '';
  let queuedPending = false;
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while requesting withdrawal: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const withdrawalRateLimit = await enforcePublicRateLimit(
      c,
      'finance.request_withdrawal',
      6,
      10 * 60 * 1000,
      `${userId}:${getRequesterIp(c)}`,
    );
    if (!withdrawalRateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for withdrawal requests. Try again in ${withdrawalRateLimit.retryAfterSec}s.` }, 429);
    }

    const { amount, withdrawalPassword } = await c.req.json();
    const requestedAmount = Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return c.json({ error: "Withdrawal amount must be positive" }, 400);
    }

    const idempotencyKey = getIdempotencyKey(c);
    if (!idempotencyKey) {
      return c.json({ error: 'Idempotency-Key header is required' }, 400);
    }

    releaseFinancialLock = await acquireFinancialLock('user', String(userId));
    if (!releaseFinancialLock) {
      return c.json({ error: 'Financial operation is busy. Please retry shortly.' }, 409);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    if (userProfile?.accountDisabled) {
      return c.json({ error: 'Account is disabled. Contact support to reactivate your account.' }, 403);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const taskState = buildTaskState(userProfile);
    const normalizedTaskState = taskState.currentSetDate === todayDate
      ? taskState
      : {
          ...taskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };

    const completedSetsToday = normalizedTaskState.taskSetsCompletedToday
      + (normalizedTaskState.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet ? 1 : 0);
    const requiredSetsForWithdrawal = normalizedTaskState.dailyTaskSetLimit;

    if (completedSetsToday < requiredSetsForWithdrawal) {
      return c.json({
        error: `Complete ${requiredSetsForWithdrawal} task set(s) before requesting withdrawal`,
        taskRequirement: {
          requiredSets: requiredSetsForWithdrawal,
          completedSets: completedSetsToday,
          tasksPerSet: normalizedTaskState.tasksPerSet,
          currentSetTasksCompleted: normalizedTaskState.currentSetTasksCompleted,
        },
      }, 403);
    }

    const passwordCheck = await verifyWithdrawalPassword(
      String(withdrawalPassword || ''),
      String(userProfile.withdrawalPassword || ''),
    );

    if (!passwordCheck.valid) {
      return c.json({ error: "Invalid withdrawal password" }, 401);
    }

    if (passwordCheck.upgradedHash) {
      userProfile.withdrawalPassword = passwordCheck.upgradedHash;
      await kv.set(`user:${userId}`, userProfile);
    }

    const approvedWithdrawalLimit = Number(userProfile?.withdrawalLimit ?? 0);
    if (approvedWithdrawalLimit > 0 && requestedAmount > approvedWithdrawalLimit) {
      return c.json({ error: `Amount exceeds approved withdrawal limit of $${approvedWithdrawalLimit.toFixed(2)}` }, 400);
    }

    // Check sufficient balance
    const balance = roundCurrency(Number(userProfile.balance || 0));
    if (requestedAmount > balance) {
      return c.json({ error: `Insufficient balance. Available: $${balance.toFixed(2)}` }, 400);
    }

    const idempotencyFingerprint = JSON.stringify({
      userId,
      requestedAmount,
      currentSetDate: normalizedTaskState.currentSetDate,
      taskSetsCompletedToday: normalizedTaskState.taskSetsCompletedToday,
    });
    idempotencyStoreKey = buildIdempotencyStoreKey('withdrawal.request', String(userId), idempotencyKey);
    const idempotencyState = await beginIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint);
    if (idempotencyState.state === 'conflict') {
      return c.json({ error: 'Idempotency-Key conflict for different withdrawal payload' }, 409);
    }
    if (idempotencyState.state === 'in_progress') {
      return c.json({ error: 'Duplicate withdrawal request is already in progress' }, 409);
    }
    if (idempotencyState.state === 'replay') {
      return c.json(idempotencyState.responseBody, idempotencyState.responseStatus as any, {
        'Idempotent-Replay': 'true',
        'Idempotency-Key': idempotencyKey,
      });
    }

    operationId = await createFinancialOperation('withdrawal.request', String(userId), {
      requestedAmount,
      idempotencyKey,
    });

    const nowIso = new Date().toISOString();
    const reservedBalance = roundCurrency(balance - requestedAmount);
    reservedUserId = String(userId);
    balanceBeforeReserve = balance;
    userProfile.balance = reservedBalance;
    userProfile.updatedAt = nowIso;
    await kv.set(`user:${userId}`, userProfile);
    await appendFinancialOperationStep(operationId, 'funds_reserved', {
      userId,
      before: balance,
      after: reservedBalance,
    });

    // Create withdrawal request
    const withdrawalId = `${userId}-${Date.now()}`;
    createdWithdrawalId = withdrawalId;
    const withdrawalRequest = {
      id: withdrawalId,
      userId,
      userEmail: userProfile.email,
      userName: userProfile.name,
      amount: requestedAmount,
      status: 'pending',
      fundsReserved: true,
      balanceBeforeReserve: balance,
      balanceAfterReserve: reservedBalance,
      requestedAt: nowIso,
      approvedAt: null,
      deniedAt: null,
      denialReason: null,
    };

    // Store withdrawal request
    await kv.set(buildWithdrawalStoreKey(withdrawalId), withdrawalRequest);
    await appendUserWithdrawalIndex(String(userId), withdrawalId);
    await appendFinancialOperationStep(operationId, 'withdrawal_record_created', {
      withdrawalId,
    });

    // Add to pending queue
    await appendUniqueQueueId('withdrawals:pending', withdrawalId);
    queuedPending = true;
    await appendFinancialOperationStep(operationId, 'pending_queue_updated', {
      withdrawalId,
    });

    // Send email notification
    if (userProfile.email && userProfile.emailNotifications !== false) {
      const template = emailTemplates.withdrawalRequested(userProfile.name, requestedAmount);
      await sendEmail(userProfile.email, template.subject, template.html);
    }

    const responseBody = {
      success: true,
      withdrawal: withdrawalRequest,
      message: 'Withdrawal request submitted. Admin approval required.',
    };

    await completeIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint, 200, responseBody);
    await finalizeFinancialOperation(operationId, 'completed', {
      withdrawalId,
      reservedAmount: requestedAmount,
    });
    return c.json(responseBody, 200, {
      'Idempotency-Key': idempotencyKey,
    });
  } catch (error) {
    if (idempotencyStoreKey) {
      await kv.del(idempotencyStoreKey).catch(() => undefined);
    }

    if (createdWithdrawalId) {
      await kv.del(buildWithdrawalStoreKey(createdWithdrawalId)).catch(() => undefined);
      if (reservedUserId) {
        await removeUserWithdrawalIndex(reservedUserId, createdWithdrawalId).catch(() => undefined);
      }
    }
    if (queuedPending && createdWithdrawalId) {
      await removeQueueId('withdrawals:pending', createdWithdrawalId).catch(() => undefined);
    }
    if (reservedUserId && balanceBeforeReserve !== null) {
      const currentUser = await kv.get(`user:${reservedUserId}`);
      if (currentUser) {
        currentUser.balance = balanceBeforeReserve;
        currentUser.updatedAt = new Date().toISOString();
        await kv.set(`user:${reservedUserId}`, currentUser).catch(() => undefined);
      }
    }
    if (operationId) {
      await appendFinancialOperationStep(operationId, 'rollback_applied', {
        createdWithdrawalId: createdWithdrawalId || null,
        queuedPending,
        reservedUserId: reservedUserId || null,
      }).catch(() => undefined);
      await finalizeFinancialOperation(operationId, 'failed', {
        error: String(error),
      }).catch(() => undefined);
    }

    logServerEvent('error', 'withdrawal.request.failed', { error: String(error) });
    return c.json({ error: "Internal server error while requesting withdrawal" }, 500);
  } finally {
    if (releaseFinancialLock) {
      await releaseFinancialLock().catch(() => undefined);
    }
  }
});

// Get withdrawal history (protected route)
app.get("/withdrawal-history", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching withdrawal history: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const userWithdrawals = (await listWithdrawalsByUserId(String(userId)))
      .filter((w: any) => w?.userId === userId)
      .sort((a: any, b: any) => 
        new Date(b?.requestedAt || 0).getTime() - new Date(a?.requestedAt || 0).getTime()
      );

    return c.json({
      success: true,
      withdrawals: userWithdrawals,
      totalRequested: userWithdrawals.length,
      totalApproved: userWithdrawals.filter((w: any) => w?.status === 'approved').length,
      totalPending: userWithdrawals.filter((w: any) => w?.status === 'pending').length,
    });
  } catch (error) {
    logServerEvent('error', 'withdrawal.history.failed', { error: String(error) });
    return c.json({ error: "Internal server error while fetching withdrawal history" }, 500);
  }
});

// Admin: view pending withdrawal requests
app.get("/admin/withdrawals", async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'withdrawals.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const scope = await getAdminScopeConfig(adminAccess);

    const pendingIds = await kv.get('withdrawals:pending') || [];
    const withdrawals = [];

    for (const id of pendingIds) {
      const w = await kv.get(`withdrawal:${id}`);
      const owner = w ? await kv.get(`user:${w.userId}`) : null;
      if (w && w.status === 'pending' && isUserInAdminScope(scope, owner)) {
        withdrawals.push(w);
      }
    }

    const totalAmount = withdrawals.reduce((sum: number, w: any) => sum + (w?.amount || 0), 0);

    return c.json({
      success: true,
      withdrawals,
      totalPending: withdrawals.length,
      totalAmount,
    });
  } catch (error) {
    console.error(`Error fetching admin withdrawals: ${error}`);
    return c.json({ error: "Internal server error while fetching withdrawals" }, 500);
  }
});

// Admin: approve withdrawal request
app.post("/admin/approve-withdrawal", async (c) => {
  let idempotencyStoreKey = '';
  let releaseFinancialLock: (() => Promise<void>) | null = null;
  try {
    const adminAccess = await requireAdminPermission(c, 'withdrawals.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'withdrawals.approve', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for withdrawal approval. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { withdrawalId } = await c.req.json();
    if (!withdrawalId) {
      return c.json({ error: 'withdrawalId is required' }, 400);
    }

    const idempotencyKey = getIdempotencyKey(c);
    if (!idempotencyKey) {
      return c.json({ error: 'Idempotency-Key header is required' }, 400);
    }

    const withdrawal = await kv.get(buildWithdrawalStoreKey(withdrawalId));
    if (!withdrawal) {
      return c.json({ error: 'Withdrawal request not found' }, 404);
    }

    releaseFinancialLock = await acquireFinancialLock('user', String(withdrawal.userId));
    if (!releaseFinancialLock) {
      return c.json({ error: 'Financial operation is busy. Please retry shortly.' }, 409);
    }

    const owner = await kv.get(`user:${withdrawal.userId}`);
    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, owner)) {
      return c.json({ error: 'Forbidden - Withdrawal is outside your admin scope' }, 403);
    }

    if (withdrawal.status !== 'pending') {
      return c.json({ error: `Cannot approve withdrawal with status: ${withdrawal.status}` }, 400);
    }

    const idempotencyFingerprint = JSON.stringify({
      action: 'approve',
      withdrawalId: String(withdrawalId),
      amount: Number(withdrawal.amount || 0),
    });
    idempotencyStoreKey = buildIdempotencyStoreKey(
      'withdrawal.approve',
      String(adminAccess.userId || 'super_admin'),
      idempotencyKey,
    );
    const idempotencyState = await beginIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint);
    if (idempotencyState.state === 'conflict') {
      return c.json({ error: 'Idempotency-Key conflict for different withdrawal approval payload' }, 409);
    }
    if (idempotencyState.state === 'in_progress') {
      return c.json({ error: 'Duplicate approve-withdrawal request is already in progress' }, 409);
    }
    if (idempotencyState.state === 'replay') {
      return c.json(idempotencyState.responseBody, idempotencyState.responseStatus as any, {
        'Idempotent-Replay': 'true',
        'Idempotency-Key': idempotencyKey,
      });
    }

    const withdrawalAmount = roundCurrency(Number(withdrawal.amount || 0));

    // Update user balance only if funds were not reserved at request time.
    const userProfile = await kv.get(`user:${withdrawal.userId}`);
    if (userProfile) {
      const currentBalance = roundCurrency(Number(userProfile.balance || 0));
      if (!withdrawal.fundsReserved) {
        if (withdrawalAmount > currentBalance) {
          return c.json({ error: 'Cannot approve withdrawal due to insufficient available balance' }, 409);
        }
        userProfile.balance = roundCurrency(currentBalance - withdrawalAmount);
      }
      await kv.set(`user:${withdrawal.userId}`, userProfile);
    }

    // Update withdrawal request
    withdrawal.status = 'approved';
    withdrawal.approvedAt = new Date().toISOString();
    withdrawal.fundsReserved = Boolean(withdrawal.fundsReserved);
    await kv.set(buildWithdrawalStoreKey(withdrawalId), withdrawal);

    // Remove from pending queue
    await removeQueueId('withdrawals:pending', withdrawalId);

    // Add to approved queue
    await appendUniqueQueueId('withdrawals:approved', withdrawalId);

    // Send email notification
    if (withdrawal.userEmail && userProfile?.emailNotifications !== false) {
      const template = emailTemplates.withdrawalApproved(withdrawal.userName, withdrawal.amount);
      await sendEmail(withdrawal.userEmail, template.subject, template.html);
    }

    const responseBody = {
      success: true,
      withdrawal,
      message: `Withdrawal of $${withdrawal.amount.toFixed(2)} approved for ${withdrawal.userName}`,
    };

    await completeIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint, 200, responseBody);
    return c.json(responseBody, 200, {
      'Idempotency-Key': idempotencyKey,
    });
  } catch (error) {
    if (idempotencyStoreKey) {
      await kv.del(idempotencyStoreKey).catch(() => undefined);
    }
    logServerEvent('error', 'withdrawal.approve.failed', { error: String(error) });
    return c.json({ error: "Internal server error while approving withdrawal" }, 500);
  } finally {
    if (releaseFinancialLock) {
      await releaseFinancialLock().catch(() => undefined);
    }
  }
});

// Admin: deny withdrawal request
app.post("/admin/deny-withdrawal", async (c) => {
  let idempotencyStoreKey = '';
  let releaseFinancialLock: (() => Promise<void>) | null = null;
  try {
    const adminAccess = await requireAdminPermission(c, 'withdrawals.manage');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'withdrawals.deny', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for withdrawal denial. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { withdrawalId, denialReason } = await c.req.json();
    if (!withdrawalId) {
      return c.json({ error: 'withdrawalId is required' }, 400);
    }

    const idempotencyKey = getIdempotencyKey(c);
    if (!idempotencyKey) {
      return c.json({ error: 'Idempotency-Key header is required' }, 400);
    }

    const withdrawal = await kv.get(buildWithdrawalStoreKey(withdrawalId));
    if (!withdrawal) {
      return c.json({ error: 'Withdrawal request not found' }, 404);
    }

    releaseFinancialLock = await acquireFinancialLock('user', String(withdrawal.userId));
    if (!releaseFinancialLock) {
      return c.json({ error: 'Financial operation is busy. Please retry shortly.' }, 409);
    }

    const owner = await kv.get(`user:${withdrawal.userId}`);
    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, owner)) {
      return c.json({ error: 'Forbidden - Withdrawal is outside your admin scope' }, 403);
    }

    if (withdrawal.status !== 'pending') {
      return c.json({ error: `Cannot deny withdrawal with status: ${withdrawal.status}` }, 400);
    }

    const idempotencyFingerprint = JSON.stringify({
      action: 'deny',
      withdrawalId: String(withdrawalId),
      denialReason: String(denialReason || '').trim(),
    });
    idempotencyStoreKey = buildIdempotencyStoreKey(
      'withdrawal.deny',
      String(adminAccess.userId || 'super_admin'),
      idempotencyKey,
    );
    const idempotencyState = await beginIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint);
    if (idempotencyState.state === 'conflict') {
      return c.json({ error: 'Idempotency-Key conflict for different withdrawal denial payload' }, 409);
    }
    if (idempotencyState.state === 'in_progress') {
      return c.json({ error: 'Duplicate deny-withdrawal request is already in progress' }, 409);
    }
    if (idempotencyState.state === 'replay') {
      return c.json(idempotencyState.responseBody, idempotencyState.responseStatus as any, {
        'Idempotent-Replay': 'true',
        'Idempotency-Key': idempotencyKey,
      });
    }

    const userProfile = await kv.get(`user:${withdrawal.userId}`);
    if (userProfile && withdrawal.fundsReserved) {
      userProfile.balance = roundCurrency(Number(userProfile.balance || 0) + roundCurrency(Number(withdrawal.amount || 0)));
      userProfile.updatedAt = new Date().toISOString();
      await kv.set(`user:${withdrawal.userId}`, userProfile);
    }

    // Update withdrawal request
    withdrawal.status = 'denied';
    withdrawal.deniedAt = new Date().toISOString();
    withdrawal.denialReason = denialReason || 'Not specified';
    await kv.set(buildWithdrawalStoreKey(withdrawalId), withdrawal);

    // Remove from pending queue
    await removeQueueId('withdrawals:pending', withdrawalId);

    // Add to denied queue
    await appendUniqueQueueId('withdrawals:denied', withdrawalId);

    // Send email notification
    if (withdrawal.userEmail && userProfile?.emailNotifications !== false) {
      const template = emailTemplates.withdrawalDenied(withdrawal.userName, withdrawal.amount, withdrawal.denialReason);
      await sendEmail(withdrawal.userEmail, template.subject, template.html);
    }

    const responseBody = {
      success: true,
      withdrawal,
      message: `Withdrawal request denied for ${withdrawal.userName}`,
    };

    await completeIdempotentOperation(idempotencyStoreKey, idempotencyFingerprint, 200, responseBody);
    return c.json(responseBody, 200, {
      'Idempotency-Key': idempotencyKey,
    });
  } catch (error) {
    if (idempotencyStoreKey) {
      await kv.del(idempotencyStoreKey).catch(() => undefined);
    }
    logServerEvent('error', 'withdrawal.deny.failed', { error: String(error) });
    return c.json({ error: "Internal server error while denying withdrawal" }, 500);
  } finally {
    if (releaseFinancialLock) {
      await releaseFinancialLock().catch(() => undefined);
    }
  }
});

// Admin: adjust user account balance (bonus, reward, topup, adjustment)
app.post('/admin/users/adjust-balance', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.adjust_balance');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'users.adjust_balance', 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for balance adjustment. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const { userId, amount, category, note } = await c.req.json();
    const adjustmentAmount = Number(amount);
    const adjustmentCategory = String(category || 'adjustment').toLowerCase();
    const normalizedNote = String(note || '').trim();

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    if (!Number.isFinite(adjustmentAmount) || adjustmentAmount === 0) {
      return c.json({ error: 'amount must be a non-zero number' }, 400);
    }

    if (!['bonus', 'reward', 'topup', 'adjustment'].includes(adjustmentCategory)) {
      return c.json({ error: 'category must be one of: bonus, reward, topup, adjustment' }, 400);
    }

    const profileKey = `user:${userId}`;
    const userProfile = await kv.get(profileKey);
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, userProfile)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const previousBalance = Number(userProfile.balance || 0);
    const nextBalance = previousBalance + adjustmentAmount;
    const timestamp = new Date().toISOString();
    const profitsRecord = await kv.get(`profits:${userId}`) || { totalEarned: 0 };
    const totalEarned = Number(profitsRecord?.totalEarned || 0);
    const basePrincipal = resolvePrincipalBalance(userProfile, totalEarned);
    const nextPrincipalBalance = adjustmentCategory === 'topup' && adjustmentAmount > 0
      ? roundCurrency(basePrincipal + adjustmentAmount)
      : basePrincipal;

    const updatedProfile = {
      ...userProfile,
      balance: nextBalance,
      principalBalance: nextPrincipalBalance,
      updatedAt: timestamp,
    };

    await kv.set(profileKey, updatedProfile);

    const adjustmentLog = await kv.get(`admin:adjustments:${userId}`) || [];
    adjustmentLog.push({
      id: `${userId}-${Date.now()}`,
      amount: adjustmentAmount,
      category: adjustmentCategory,
      note: normalizedNote || null,
      previousBalance,
      newBalance: nextBalance,
      createdAt: timestamp,
      performedBy: adminAccess.userId || 'super_admin',
    });
    await kv.set(`admin:adjustments:${userId}`, adjustmentLog.slice(-200));
    await appendAdminAuditLog(adminAccess, 'user.balance_adjusted', {
      targetUserId: String(userId),
      targetIdentifier: String(userProfile?.email || userProfile?.name || userId),
      meta: {
        amount: adjustmentAmount,
        category: adjustmentCategory,
      },
    });

    return c.json({
      success: true,
      user: updatedProfile,
      adjustment: {
        amount: adjustmentAmount,
        category: adjustmentCategory,
        previousBalance,
        newBalance: nextBalance,
      },
    });
  } catch (error) {
    console.error(`Error adjusting user balance: ${error}`);
    return c.json({ error: 'Internal server error while adjusting user balance' }, 500);
  }
});

// Admin: disable/enable user account
app.put('/admin/users/account-status', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.manage_status');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'users.manage_status', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for account status updates. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const userId = String(body?.userId || '').trim();
    const disabled = Boolean(body?.disabled);

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, user)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const updatedUser = {
      ...user,
      accountDisabled: disabled,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(key, updatedUser);
    await appendAdminAuditLog(adminAccess, 'user.account_status_updated', {
      targetUserId: String(userId),
      targetIdentifier: String(user?.email || user?.name || userId),
      meta: {
        disabled,
      },
    });

    return c.json({
      success: true,
      user: updatedUser,
      status: disabled ? 'disabled' : 'active',
    });
  } catch (error) {
    console.error(`Error updating user account status: ${error}`);
    return c.json({ error: 'Internal server error while updating user account status' }, 500);
  }
});

// Admin: delete user account and related records (super admin only)
app.delete('/admin/users/:userId', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const userId = String(c.req.param('userId') || '').trim();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const userKey = `user:${userId}`;
    const user = await kv.get(userKey);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const supabase = getServiceClient();
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError && !String(authDeleteError.message || '').toLowerCase().includes('not found')) {
      return c.json({ error: 'Failed to delete user auth account' }, 400);
    }

    await kv.del(userKey).catch(() => undefined);
    await kv.del(`profits:${userId}`).catch(() => undefined);
    await kv.del(`metrics:${userId}`).catch(() => undefined);
    await kv.del(`admin:adjustments:${userId}`).catch(() => undefined);
    await kv.del(`deposit:requests:user:${userId}`).catch(() => undefined);

    const inviteRows = await getKvRowsByPrefix('invitecode:');
    for (const row of inviteRows) {
      if (String(row?.value?.userId || '') === userId) {
        await kv.del(row.key).catch(() => undefined);
      }
    }

    const referralRows = await getKvRowsByPrefix('referral:');
    for (const row of referralRows) {
      const parentId = String(row?.value?.parentId || '');
      const childId = String(row?.value?.childId || '');
      if (parentId === userId || childId === userId) {
        await kv.del(row.key).catch(() => undefined);
      }
    }

    const userRecordRows = await getKvRowsByPrefix(`record:${userId}:`);
    for (const row of userRecordRows) {
      await kv.del(row.key).catch(() => undefined);
    }

    const withdrawalRows = await getKvRowsByPrefix('withdrawal:');
    const deletedWithdrawalIds: string[] = [];
    for (const row of withdrawalRows) {
      if (String(row?.value?.userId || '') === userId) {
        const withdrawalId = String(row?.value?.id || '').trim();
        if (withdrawalId) {
          deletedWithdrawalIds.push(withdrawalId);
        }
        await kv.del(row.key).catch(() => undefined);
      }
    }

    if (deletedWithdrawalIds.length > 0) {
      const pending = (await kv.get('withdrawals:pending') || []).filter((id: string) => !deletedWithdrawalIds.includes(String(id)));
      const approved = (await kv.get('withdrawals:approved') || []).filter((id: string) => !deletedWithdrawalIds.includes(String(id)));
      const denied = (await kv.get('withdrawals:denied') || []).filter((id: string) => !deletedWithdrawalIds.includes(String(id)));
      await kv.set('withdrawals:pending', pending);
      await kv.set('withdrawals:approved', approved);
      await kv.set('withdrawals:denied', denied);
    }

    return c.json({
      success: true,
      deleted: true,
      userId,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    console.error(`Error deleting user account: ${error}`);
    return c.json({ error: 'Internal server error while deleting user account' }, 500);
  }
});

// Admin: assign premium product to one user (quick action)
app.post('/admin/users/assign-premium', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.assign_premium');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'premium.assign', 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for premium assignment. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const userId = body?.userId;
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const normalizedProductId = String(body?.productId || '').trim();

    if (body?.amount === undefined || body?.amount === null || body?.amount === '') {
      return c.json({ error: 'amount is required for premium assignment' }, 400);
    }
    if (body?.position === undefined || body?.position === null || body?.position === '') {
      return c.json({ error: 'position is required for premium assignment' }, 400);
    }
    const amount = Number(body.amount);
    const requestedPosition = Number(body.position);

    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400);
    }

    if (!Number.isInteger(requestedPosition) || requestedPosition <= 0) {
      return c.json({ error: 'position must be a positive integer' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const catalog = await getTaskProductCatalog();
    const assignedProduct = normalizedProductId
      ? catalog.find((item: any) => String(item?.id || '') === normalizedProductId)
      : null;

    if (normalizedProductId && !assignedProduct) {
      return c.json({ error: 'Selected premium product was not found in catalog' }, 400);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, user)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const currentTaskState = buildTaskState(user);
    const normalizedTaskState = currentTaskState.currentSetDate === todayDate
      ? currentTaskState
      : {
          ...currentTaskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };
    const tasksPerSet = normalizedTaskState.tasksPerSet;
    const currentProgress = normalizedTaskState.currentSetTasksCompleted;
    const effectivePosition = currentProgress >= tasksPerSet
      ? 1
      : Math.min(tasksPerSet, Math.max(currentProgress + 1, requestedPosition));

    const currentBalance = Number(user?.balance ?? 0);
    const bundleDetails = buildPremiumBundleDetails(amount);
    const bundleTotal = Number(bundleDetails.bundleTotal || 0);
    const vipPremiumRate = getVipPremiumProfitRate(String(user?.vipTier || 'Normal'));
    const potentialPremiumProfit = roundCurrency(bundleTotal * vipPremiumRate);
    const balanceAfterAssignment = roundCurrency(currentBalance - bundleTotal);
    const projectedTopUpRequired = balanceAfterAssignment < 0 ? Math.abs(balanceAfterAssignment) : 0;
    const premiumOrderId = `PRM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const updatedUser = {
      ...user,
      premiumAssignment: {
        orderId: premiumOrderId,
        amount: bundleTotal,
        enteredAmount: amount,
        position: effectivePosition,
        productId: assignedProduct?.id || null,
        productName: assignedProduct?.name || null,
        productImage: assignedProduct?.image || null,
        vipRate: vipPremiumRate,
        multiplier: 1,
        potentialProfit: potentialPremiumProfit,
        bundleProductCount: bundleDetails.individualProductCount,
        bundleItems: bundleDetails.bundleItems,
        previousBalance: null,
        balanceAfterAssignment: null,
        topUpRequired: null,
        projectedBalanceAfterEncounter: balanceAfterAssignment,
        projectedTopUpRequired,
        encounteredAt: null,
        encounteredTaskNumber: null,
        assignedAt: new Date().toISOString(),
      },
      accountFrozen: Boolean(user?.accountFrozen ?? false),
      freezeAmount: Number(user?.freezeAmount ?? 0),
      balance: currentBalance,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(key, updatedUser);

    return c.json({
      success: true,
      user: updatedUser,
      result: {
        boostedCommission: potentialPremiumProfit,
        potentialProfit: potentialPremiumProfit,
        frozen: false,
        willFreezeOnEncounter: projectedTopUpRequired > 0,
        orderId: premiumOrderId,
        bundleTotal,
        topUpRequired: projectedTopUpRequired,
        requestedPosition,
        effectivePosition,
      },
    });
  } catch (error) {
    console.error(`Error assigning premium to user: ${error}`);
    return c.json({ error: 'Internal server error while assigning premium' }, 500);
  }
});

// Admin: reset user task set (manual or complete_set)
app.post('/admin/users/reset-task-set', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.reset_tasks');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const { userId, mode } = await c.req.json();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const profileKey = `user:${userId}`;
    const userProfile = await kv.get(profileKey);
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, userProfile)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const resetMode = String(mode || 'manual');
    const todayDate = new Date().toISOString().slice(0, 10);
    const taskState = buildTaskState(userProfile);
    const normalizedTaskState = taskState.currentSetDate === todayDate
      ? taskState
      : {
          ...taskState,
          taskSetsCompletedToday: 0,
          currentSetTasksCompleted: 0,
          currentSetDate: todayDate,
        };

    const maxSetsForToday = normalizedTaskState.dailyTaskSetLimit + normalizedTaskState.extraTaskSets;
    const isSetComplete = normalizedTaskState.currentSetTasksCompleted >= normalizedTaskState.tasksPerSet;
    const canCountAnotherSet = normalizedTaskState.taskSetsCompletedToday < maxSetsForToday;
    const shouldCountCompletedSet = isSetComplete && canCountAnotherSet;

    if (resetMode === 'complete_set' && !isSetComplete) {
      return c.json({ error: 'Current task set is not complete yet' }, 400);
    }
    if (resetMode === 'complete_set' && !canCountAnotherSet) {
      return c.json({ error: 'Daily task set limit reached' }, 400);
    }

    if (shouldCountCompletedSet) {
      normalizedTaskState.taskSetsCompletedToday += 1;
    }

    const vipProgress = applyVipAutoUpgrade(userProfile, shouldCountCompletedSet ? 1 : 0);

    const shouldClearPremiumAssignmentOnReset = Boolean(userProfile?.accountFrozen);

    const updatedProfile = {
      ...userProfile,
      vipTier: vipProgress.vipTier,
      tierSetProgress: vipProgress.tierSetProgress,
      totalTaskSetsCompleted: vipProgress.totalTaskSetsCompleted,
      dailyTaskSetLimit: normalizedTaskState.dailyTaskSetLimit,
      extraTaskSets: normalizedTaskState.extraTaskSets,
      taskSetsCompletedToday: normalizedTaskState.taskSetsCompletedToday,
      currentSetTasksCompleted: 0,
      currentSetDate: todayDate,
      balance: roundCurrency(Number(userProfile?.balance || 0)),
      accountFrozen: false,
      freezeAmount: 0,
      premiumAssignment: shouldClearPremiumAssignmentOnReset ? null : userProfile?.premiumAssignment || null,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(profileKey, updatedProfile);

    return c.json({
      success: true,
      user: updatedProfile,
      vipUpgrade: {
        upgraded: vipProgress.upgraded,
        upgrades: vipProgress.upgrades,
        currentTier: vipProgress.vipTier,
        tierSetProgress: vipProgress.tierSetProgress,
        requiredSetsForNextUpgrade: vipProgress.requiredSetsForNextUpgrade,
        remainingSetsForNextUpgrade: vipProgress.remainingSetsForNextUpgrade,
      },
      taskState: {
        dailyTaskSetLimit: updatedProfile.dailyTaskSetLimit,
        extraTaskSets: updatedProfile.extraTaskSets,
        taskSetsCompletedToday: updatedProfile.taskSetsCompletedToday,
        currentSetTasksCompleted: updatedProfile.currentSetTasksCompleted,
        tasksPerSet: getTasksPerSetByTier(updatedProfile.vipTier || 'Normal'),
        currentSetDate: updatedProfile.currentSetDate,
        maxSetsForToday,
        remainingSets: Math.max(0, maxSetsForToday - updatedProfile.taskSetsCompletedToday),
      },
    });
  } catch (error) {
    console.error(`Error resetting user task set: ${error}`);
    return c.json({ error: 'Internal server error while resetting user task set' }, 500);
  }
});

// Admin: update user task limits (daily sets + extra sets)
app.put('/admin/users/task-limits', async (c) => {
  try {
    const adminAccess = await requireAdminPermission(c, 'users.manage_task_limits');
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const { userId, dailyTaskSetLimit, extraTaskSets, withdrawalLimit } = await c.req.json();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const baseLimit = Number(dailyTaskSetLimit);
    const extraSets = Number(extraTaskSets ?? 0);

    if (!Number.isInteger(baseLimit) || baseLimit <= 0) {
      return c.json({ error: 'dailyTaskSetLimit must be a positive integer' }, 400);
    }

    if (!Number.isInteger(extraSets) || extraSets < 0) {
      return c.json({ error: 'extraTaskSets must be a non-negative integer' }, 400);
    }

    const parsedWithdrawalLimit = Number(withdrawalLimit ?? 0);
    if (!Number.isFinite(parsedWithdrawalLimit) || parsedWithdrawalLimit < 0) {
      return c.json({ error: 'withdrawalLimit must be a non-negative number' }, 400);
    }

    const profileKey = `user:${userId}`;
    const userProfile = await kv.get(profileKey);
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    if (!isUserInAdminScope(scope, userProfile)) {
      return c.json({ error: 'Forbidden - User is outside your admin scope' }, 403);
    }

    const updatedProfile = {
      ...userProfile,
      dailyTaskSetLimit: baseLimit,
      extraTaskSets: extraSets,
      withdrawalLimit: roundCurrency(parsedWithdrawalLimit),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(profileKey, updatedProfile);

    return c.json({
      success: true,
      user: updatedProfile,
      taskLimits: {
        dailyTaskSetLimit: baseLimit,
        extraTaskSets: extraSets,
        withdrawalLimit: roundCurrency(parsedWithdrawalLimit),
        maxSetsPerDay: baseLimit + extraSets,
      },
    });
  } catch (error) {
    console.error(`Error updating user task limits: ${error}`);
    return c.json({ error: 'Internal server error while updating task limits' }, 500);
  }
});

// Admin: create limited admin accounts (super admin only)
app.post('/admin/accounts', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const { username, name, password, permissions } = await c.req.json();

    const normalizedUsername = normalizeUsername(String(username || ''));
    const displayName = String(name || username || '').trim();
    if (!normalizedUsername || normalizedUsername.length < 3) {
      return c.json({ error: 'username must contain at least 3 letters or numbers' }, 400);
    }
    if (!displayName) {
      return c.json({ error: 'name is required' }, 400);
    }
    if (!password || String(password).length < 6) {
      return c.json({ error: 'password must be at least 6 characters' }, 400);
    }

    const adminPermissions = sanitizeAdminPermissions(permissions);
    if (adminPermissions.length === 0) {
      return c.json({ error: 'At least one valid permission is required' }, 400);
    }

    const adminEmail = `admin.${normalizedUsername}@${AUTH_EMAIL_DOMAIN}`;
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: displayName,
        username: normalizedUsername,
        role: 'limited_admin',
      },
    });

    if (error || !data?.user?.id) {
      return c.json({ error: 'Failed to create admin user' }, 400);
    }

    const adminUserId = data.user.id;
    const record = {
      userId: adminUserId,
      username: normalizedUsername,
      displayName,
      authEmail: adminEmail,
      role: 'limited_admin',
      active: true,
      permissions: adminPermissions,
      revokedAt: null,
      createdBy: 'super_admin',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`admin:account:${adminUserId}`, record);
    await appendAdminAuditLog({ isSuperAdmin: true, userId: null }, 'admin.account_created', {
      targetUserId: adminUserId,
      targetIdentifier: adminEmail,
      meta: {
        username: normalizedUsername,
        permissions: adminPermissions,
      },
    });

    return c.json({ success: true, admin: record });
  } catch (error) {
    console.error(`Error creating admin account: ${error}`);
    return c.json({ error: 'Internal server error while creating admin account' }, 500);
  }
});

// Admin: list limited admin accounts (super admin only)
app.get('/admin/validate-super-key', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    return c.json({
      success: true,
      message: 'Super admin key is valid',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error validating super admin key: ${error}`);
    return c.json({ error: 'Internal server error while validating super admin key' }, 500);
  }
});

// Admin: list limited admin accounts (super admin only)
app.get('/admin/accounts', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const rows = await kv.getByPrefix('admin:account:');
    const allUsers = await kv.getByPrefix('user:');

    const usersWithEarnings = await Promise.all((allUsers || []).map(async (user: any) => {
      const totalEarnings = await resolveUserTotalEarnings(user);
      return {
        ...user,
        totalEarnings,
        frozenNegativeAmount: resolveFrozenNegativeAmount(user),
      };
    }));

    const admins = (rows || []).map((row: any) => {
      const scope = getAdminScopeFromAccount(row);
      const scopedUsers = usersWithEarnings.filter((user: any) => isUserInAdminScope(scope, user));
      const usersCreated = scopedUsers.length;
      const totalEarningsFromUsers = roundCurrency(
        scopedUsers.reduce((sum: number, user: any) => sum + Number(user?.totalEarnings || 0), 0),
      );
      const negativeTotal = roundCurrency(
        scopedUsers.reduce((sum: number, user: any) => {
          const balance = Number(user?.balance ?? 0);
          return sum + (balance < 0 ? Math.abs(balance) : 0);
        }, 0),
      );
      const frozenNegativeTotal = roundCurrency(
        scopedUsers.reduce((sum: number, user: any) => sum + Number(user?.frozenNegativeAmount || 0), 0),
      );
      const revoked = Boolean(row?.revokedAt);

      return {
        userId: row?.userId,
        username: row?.username,
        displayName: row?.displayName,
        authEmail: row?.authEmail,
        active: row?.active !== false,
        status: revoked ? 'revoked' : (row?.active === false ? 'disabled' : 'active'),
        permissions: sanitizeAdminPermissions(row?.permissions),
        usersCreated,
        totalEarningsFromUsers,
        negativeTotal,
        frozenNegativeTotal,
        createdAt: row?.createdAt,
        updatedAt: row?.updatedAt || null,
        revokedAt: row?.revokedAt || null,
      };
    });

    const accountability = {
      totalLimitedAdmins: admins.length,
      activeLimitedAdmins: admins.filter((admin: any) => admin.status === 'active').length,
      disabledLimitedAdmins: admins.filter((admin: any) => admin.status === 'disabled').length,
      revokedLimitedAdmins: admins.filter((admin: any) => admin.status === 'revoked').length,
      totalUsersCreated: admins.reduce((sum: number, admin: any) => sum + Number(admin?.usersCreated || 0), 0),
      totalEarningsFromManagedUsers: roundCurrency(
        admins.reduce((sum: number, admin: any) => sum + Number(admin?.totalEarningsFromUsers || 0), 0),
      ),
      totalNegativeExposure: roundCurrency(
        admins.reduce((sum: number, admin: any) => sum + Number(admin?.negativeTotal || 0), 0),
      ),
      totalFrozenNegativeExposure: roundCurrency(
        admins.reduce((sum: number, admin: any) => sum + Number(admin?.frozenNegativeTotal || 0), 0),
      ),
    };

    return c.json({ success: true, admins, accountability });
  } catch (error) {
    console.error(`Error listing admin accounts: ${error}`);
    return c.json({ error: 'Internal server error while listing admin accounts' }, 500);
  }
});

app.get('/admin/audit-log', async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const limitParam = Number(c.req.query('limit') || 100);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 250) : 100;
    const existing = await kv.get(ADMIN_AUDIT_LOG_KEY);
    const logs = Array.isArray(existing) ? existing.slice(0, limit) : [];

    return c.json({ success: true, logs });
  } catch (error) {
    console.error(`Error loading admin audit log: ${error}`);
    return c.json({ error: 'Internal server error while loading audit log' }, 500);
  }
});

// Admin: update limited admin account permissions/status (super admin only)
app.put('/admin/accounts/:adminUserId', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const adminUserId = c.req.param('adminUserId');
    if (!adminUserId) {
      return c.json({ error: 'adminUserId is required' }, 400);
    }

    const existing = await kv.get(`admin:account:${adminUserId}`);
    if (!existing) {
      return c.json({ error: 'Admin account not found' }, 404);
    }

    const { permissions, active, displayName } = await c.req.json();
    const nextPermissions = permissions === undefined
      ? sanitizeAdminPermissions(existing.permissions)
      : sanitizeAdminPermissions(permissions);

    if (nextPermissions.length === 0) {
      return c.json({ error: 'At least one valid permission is required' }, 400);
    }

    const nextActive = active === undefined ? existing.active !== false : Boolean(active);
    const updated = {
      ...existing,
      permissions: nextPermissions,
      active: nextActive,
      revokedAt: nextActive ? null : existing?.revokedAt || null,
      displayName: displayName ? String(displayName).trim() : existing.displayName,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`admin:account:${adminUserId}`, updated);
    await appendAdminAuditLog({ isSuperAdmin: true, userId: null }, 'admin.account_updated', {
      targetUserId: adminUserId,
      targetIdentifier: String(updated?.authEmail || updated?.username || adminUserId),
      meta: {
        active: updated.active,
        permissions: updated.permissions,
      },
    });
    return c.json({ success: true, admin: updated });
  } catch (error) {
    console.error(`Error updating admin account: ${error}`);
    return c.json({ error: 'Internal server error while updating admin account' }, 500);
  }
});

// Admin: revoke limited admin account access (super admin only)
app.post('/admin/accounts/:adminUserId/revoke', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const adminUserId = c.req.param('adminUserId');
    if (!adminUserId) {
      return c.json({ error: 'adminUserId is required' }, 400);
    }

    const existing = await kv.get(`admin:account:${adminUserId}`);
    if (!existing) {
      return c.json({ error: 'Admin account not found' }, 404);
    }

    const updated = {
      ...existing,
      active: false,
      permissions: BASELINE_LIMITED_ADMIN_PERMISSIONS,
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`admin:account:${adminUserId}`, updated);
    await appendAdminAuditLog({ isSuperAdmin: true, userId: null }, 'admin.account_revoked', {
      targetUserId: adminUserId,
      targetIdentifier: String(updated?.authEmail || updated?.username || adminUserId),
    });
    return c.json({ success: true, admin: updated });
  } catch (error) {
    console.error(`Error revoking admin account: ${error}`);
    return c.json({ error: 'Internal server error while revoking admin account' }, 500);
  }
});

// Admin: delete limited admin account (super admin only)
app.delete('/admin/accounts/:adminUserId', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const adminUserId = c.req.param('adminUserId');
    if (!adminUserId) {
      return c.json({ error: 'adminUserId is required' }, 400);
    }

    const existing = await kv.get(`admin:account:${adminUserId}`);
    if (!existing) {
      return c.json({ error: 'Admin account not found' }, 404);
    }

    const supabase = getServiceClient();
    const { error: deleteError } = await supabase.auth.admin.deleteUser(adminUserId);
    if (deleteError && !String(deleteError.message || '').toLowerCase().includes('not found')) {
      return c.json({ error: 'Failed to delete admin auth user' }, 400);
    }

    await kv.del(`admin:account:${adminUserId}`);
    await appendAdminAuditLog({ isSuperAdmin: true, userId: null }, 'admin.account_deleted', {
      targetUserId: adminUserId,
      targetIdentifier: String(existing?.authEmail || existing?.username || adminUserId),
    });
    return c.json({ success: true, deleted: true, adminUserId });
  } catch (error) {
    console.error(`Error deleting admin account: ${error}`);
    return c.json({ error: 'Internal server error while deleting admin account' }, 500);
  }
});

// Admin: aggregated critical alerts (withdrawals, support queue, frozen accounts, referrals)
app.get("/admin/alerts", async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    if (!adminAccess.isSuperAdmin) {
      const canViewAlerts = adminAccess.permissions.includes(ADMIN_PERMISSION_ALL)
        || adminAccess.permissions.includes('users.view')
        || adminAccess.permissions.includes('support.manage')
        || adminAccess.permissions.includes('withdrawals.manage');
      if (!canViewAlerts) {
        return c.json({ error: 'Forbidden - Missing alert visibility permission' }, 403);
      }
    }

    const scope = await getAdminScopeConfig(adminAccess);

    const alerts: Array<{
      id: string;
      type: 'withdrawal_pending' | 'withdrawal_approved' | 'withdrawal_denied' | 'support_ticket' | 'frozen_account' | 'new_referral' | 'premium_assignment';
      severity: 'critical' | 'high' | 'medium' | 'info';
      title: string;
      message: string;
      createdAt: string;
      status: 'new' | 'action_required' | 'resolved';
      meta?: Record<string, any>;
    }> = [];

    const nowIso = new Date().toISOString();

    const pendingWithdrawalIds = await kv.get('withdrawals:pending') || [];
    for (const withdrawalId of pendingWithdrawalIds) {
      const withdrawal = await kv.get(`withdrawal:${withdrawalId}`);
      if (!withdrawal || withdrawal.status !== 'pending') continue;

      const withdrawalOwner = await kv.get(`user:${withdrawal.userId}`);
      if (!isUserInAdminScope(scope, withdrawalOwner)) {
        continue;
      }

      alerts.push({
        id: `withdrawal_pending:${withdrawalId}`,
        type: 'withdrawal_pending',
        severity: Number(withdrawal.amount || 0) >= 10000 ? 'critical' : 'high',
        title: 'Pending withdrawal approval',
        message: `${withdrawal.userName || 'User'} requested $${Number(withdrawal.amount || 0).toFixed(2)}`,
        createdAt: withdrawal.requestedAt || nowIso,
        status: 'action_required',
        meta: {
          withdrawalId,
          amount: Number(withdrawal.amount || 0),
          userId: withdrawal.userId || null,
          userName: withdrawal.userName || null,
        },
      });
    }

    const supportQueue = await kv.get('tickets:queue') || [];
    for (const ticketId of supportQueue) {
      const ticket = await kv.get(`ticket:${ticketId}`);
      if (!ticket) continue;

      const ticketOwner = await kv.get(`user:${ticket.userId}`);
      if (!isUserInAdminScope(scope, ticketOwner)) {
        continue;
      }

      const ticketStatus = String(ticket.status || 'open').toLowerCase();
      if (ticketStatus === 'resolved' || ticketStatus === 'closed') continue;

      const priority = String(ticket.priority || 'medium').toLowerCase();
      const severity: 'critical' | 'high' | 'medium' | 'info' =
        priority === 'urgent' ? 'critical' : priority === 'high' ? 'high' : 'medium';

      alerts.push({
        id: `support_ticket:${ticketId}`,
        type: 'support_ticket',
        severity,
        title: 'Customer service ticket needs attention',
        message: `${ticket.userName || 'User'}: ${ticket.subject || ticket.category || 'Support request'}`,
        createdAt: ticket.updatedAt || ticket.createdAt || nowIso,
        status: 'action_required',
        meta: {
          ticketId,
          userId: ticket.userId || null,
          userName: ticket.userName || null,
          priority: priority,
          category: ticket.category || null,
        },
      });
    }

    const users = await kv.getByPrefix('user:');
    const scopedUsers = (users || []).filter((user: any) => isUserInAdminScope(scope, user));

    const frozenUsers = scopedUsers.filter((user: any) => Boolean(user?.accountFrozen));
    for (const frozenUser of frozenUsers.slice(0, 20)) {
      alerts.push({
        id: `frozen_account:${frozenUser.id}`,
        type: 'frozen_account',
        severity: 'critical',
        title: 'Frozen account requires intervention',
        message: `${frozenUser.name || 'User'} is frozen with freeze amount $${Number(frozenUser.freezeAmount || 0).toFixed(2)}`,
        createdAt: frozenUser.updatedAt || frozenUser.createdAt || nowIso,
        status: 'action_required',
        meta: {
          userId: frozenUser.id,
          userName: frozenUser.name || null,
          freezeAmount: Number(frozenUser.freezeAmount || 0),
        },
      });
    }

    const premiumUsers = scopedUsers
      .filter((user: any) => Boolean(user?.premiumAssignment))
      .sort((a: any, b: any) => new Date(b?.premiumAssignment?.assignedAt || b?.updatedAt || nowIso).getTime() - new Date(a?.premiumAssignment?.assignedAt || a?.updatedAt || nowIso).getTime())
      .slice(0, 20);

    for (const premiumUser of premiumUsers) {
      const premiumAssignment = premiumUser?.premiumAssignment || {};
      const isActive = !Boolean(premiumUser?.accountFrozen);
      alerts.push({
        id: `premium_assignment:${premiumUser.id}`,
        type: 'premium_assignment',
        severity: isActive ? 'info' : 'high',
        title: 'Premium order assigned',
        message: `${premiumUser.name || 'User'} premium order ${premiumAssignment?.orderId || 'N/A'} is ${isActive ? 'active' : 'inactive (frozen)'}`,
        createdAt: premiumAssignment?.assignedAt || premiumUser?.updatedAt || premiumUser?.createdAt || nowIso,
        status: isActive ? 'new' : 'action_required',
        meta: {
          userId: premiumUser.id,
          userName: premiumUser.name || null,
          orderId: premiumAssignment?.orderId || null,
          amount: Number(premiumAssignment?.amount || 0),
          active: isActive,
        },
      });
    }

    const referralUsers = scopedUsers
      .filter((user: any) => Boolean(user?.parentUserId))
      .sort((a: any, b: any) => new Date(b?.createdAt || nowIso).getTime() - new Date(a?.createdAt || nowIso).getTime())
      .slice(0, 20);

    for (const referralUser of referralUsers) {
      alerts.push({
        id: `new_referral:${referralUser.id}`,
        type: 'new_referral',
        severity: 'info',
        title: 'New referred user signup',
        message: `${referralUser.name || 'User'} joined your referred users`,
        createdAt: referralUser.createdAt || nowIso,
        status: 'action_required',
        meta: {
          userId: referralUser.id,
          userName: referralUser.name || null,
          parentUserId: referralUser.parentUserId || null,
        },
      });
    }

    const approvedIds = await kv.get('withdrawals:approved') || [];
    for (const withdrawalId of approvedIds.slice(-5)) {
      const withdrawal = await kv.get(`withdrawal:${withdrawalId}`);
      if (!withdrawal) continue;
      alerts.push({
        id: `withdrawal_approved:${withdrawalId}`,
        type: 'withdrawal_approved',
        severity: 'info',
        title: 'Withdrawal approved',
        message: `${withdrawal.userName || 'User'} approved for $${Number(withdrawal.amount || 0).toFixed(2)}`,
        createdAt: withdrawal.approvedAt || nowIso,
        status: 'resolved',
        meta: { withdrawalId },
      });
    }

    const deniedIds = await kv.get('withdrawals:denied') || [];
    for (const withdrawalId of deniedIds.slice(-5)) {
      const withdrawal = await kv.get(`withdrawal:${withdrawalId}`);
      if (!withdrawal) continue;
      alerts.push({
        id: `withdrawal_denied:${withdrawalId}`,
        type: 'withdrawal_denied',
        severity: 'medium',
        title: 'Withdrawal denied',
        message: `${withdrawal.userName || 'User'} denied: ${withdrawal.denialReason || 'No reason provided'}`,
        createdAt: withdrawal.deniedAt || nowIso,
        status: 'resolved',
        meta: { withdrawalId },
      });
    }

    const sortedAlerts = alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const summary = {
      total: sortedAlerts.length,
      actionRequired: sortedAlerts.filter((alert) => alert.status === 'action_required').length,
      pendingWithdrawals: sortedAlerts.filter((alert) => alert.type === 'withdrawal_pending').length,
      openSupportTickets: sortedAlerts.filter((alert) => alert.type === 'support_ticket').length,
      frozenAccounts: sortedAlerts.filter((alert) => alert.type === 'frozen_account').length,
      critical: sortedAlerts.filter((alert) => alert.severity === 'critical').length,
      high: sortedAlerts.filter((alert) => alert.severity === 'high').length,
    };

    return c.json({
      success: true,
      summary,
      alerts: sortedAlerts.slice(0, 50),
    });
  } catch (error) {
    console.error(`Error fetching admin alerts: ${error}`);
    return c.json({ error: 'Internal server error while fetching admin alerts' }, 500);
  }
});

// Analytics: Get earnings breakdown with trends
app.get("/analytics/earnings", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    const profits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };

    // Get all products for earnings trend (last 12 months)
    const products = await kv.getByPrefix(`product:${userId}:`);
    const monthlyEarnings: { [key: string]: number } = {};
    
    for (const product of products || []) {
      if (product?.submittedAt) {
        const date = new Date(product.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + (product.userEarned || 0);
      }
    }

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyEarnings).sort();
    const trendData = sortedMonths.map(month => ({
      month,
      earned: monthlyEarnings[month],
    }));

    return c.json({
      success: true,
      analytics: {
        balance: userProfile.balance || 0,
        totalEarned: profits.totalEarned || 0,
        fromDirectChildren: profits.fromDirectChildren || 0,
        fromIndirectReferrals: profits.fromIndirectReferrals || 0,
        averageMonthlyEarnings: trendData.length > 0 
          ? profits.totalEarned / trendData.length 
          : 0,
        trend: trendData,
        levelBreakdown: profits.byLevel || {},
      },
    });
  } catch (error) {
    console.error(`Error fetching earnings analytics: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Analytics: Get network growth metrics
app.get("/analytics/network", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get direct referrals
    const directReferrals = await kv.getByPrefix(`referral:${userId}:`);
    const directChildrenCount = directReferrals?.length || 0;

    // Calculate network depth and total commissions from each level
    let totalNetworkSize = directChildrenCount;
    const networkByLevel: { [key: string]: number } = {};
    networkByLevel['level_1'] = directChildrenCount;

    // Get all referrals created by user (for indirect children)
    let indirectCount = 0;
    for (const referral of directReferrals || []) {
      const grandchildrenRefs = await kv.getByPrefix(`referral:${referral.childId}:`);
      indirectCount += grandchildrenRefs?.length || 0;
    }

    totalNetworkSize += indirectCount;
    networkByLevel['level_2'] = indirectCount;

    return c.json({
      success: true,
      network: {
        directChildren: directChildrenCount,
        indirectReferrals: indirectCount,
        totalNetworkSize,
        networkByLevel,
        activePercentage: totalNetworkSize > 0 ? ((directChildrenCount + indirectCount) / totalNetworkSize * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error(`Error fetching network analytics: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Analytics: Get top referrers leaderboard
app.get("/analytics/leaderboard", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    
    const leaderboard = (allUsers || [])
      .filter((u): u is any => u && u.totalProfitFromChildren !== undefined)
      .map((user) => ({
        userId: user.id,
        name: user.name,
        totalProfitFromChildren: user.totalProfitFromChildren || 0,
        childCount: user.childCount || 0,
        vipTier: user.vipTier || 'Normal',
      }))
      .sort((a, b) => b.totalProfitFromChildren - a.totalProfitFromChildren)
      .slice(0, 50); // Top 50

    // Find user's position
    const userRank = leaderboard.findIndex(u => u.userId === userId) + 1;

    return c.json({
      success: true,
      leaderboard,
      userRank: userRank > 0 ? userRank : null,
    });
  } catch (error) {
    console.error(`Error fetching leaderboard: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Analytics: Get monthly earnings report
app.get("/analytics/monthly-report", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get all products for this user
    const products = await kv.getByPrefix(`product:${userId}:`);
    
    // Group by month
    const monthlyData: { [key: string]: { products: number; earned: number; fromChildren: number } } = {};
    
    for (const product of products || []) {
      if (product?.submittedAt) {
        const date = new Date(product.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { products: 0, earned: 0, fromChildren: 0 };
        }
        
        monthlyData[monthKey].products += 1;
        monthlyData[monthKey].earned += product.userEarned || 0;
        if (product.commissionsCascade) {
          const childCommissions = product.commissionsCascade.filter((c: any) => c.level === 1);
          monthlyData[monthKey].fromChildren += childCommissions.reduce((sum: number, c: any) => sum + c.amount, 0);
        }
      }
    }

    const report = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return c.json({
      success: true,
      monthlyReport: report,
      currentMonth: report[report.length - 1] || null,
    });
  } catch (error) {
    console.error(`Error fetching monthly report: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Bonus Payouts: Get available bonuses and claim status
app.get("/bonus-payouts", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: "User not found" }, 404);

    const claimedBonuses = await kv.get(`bonuses:claimed:${userId}`) || [];
    const userProducts = await kv.getByPrefix(`product:${userId}:`);
    const referrals = await kv.getByPrefix(`referral:${userId}:`);
    
    // Count indirect referrals
    let indirectCount = 0;
    for (const ref of referrals || []) {
      const refChildren = await kv.getByPrefix(`referral:${ref.id}:`);
      indirectCount += refChildren?.length || 0;
    }

    const bonusStructure = [
      { id: "tier_bronze", name: "Bronze Member", requirement: "Reach Bronze VIP", amount: 50, category: "tier", checkFn: () => user.vipTier === "Bronze" },
      { id: "tier_silver", name: "Silver Member", requirement: "Reach Silver VIP", amount: 150, category: "tier", checkFn: () => user.vipTier === "Silver" },
      { id: "tier_gold", name: "Gold Member", requirement: "Reach Gold VIP", amount: 300, category: "tier", checkFn: () => user.vipTier === "Gold" },
      { id: "tier_platinum", name: "Platinum Member", requirement: "Reach Platinum VIP", amount: 500, category: "tier", checkFn: () => user.vipTier === "Platinum" },
      { id: "referral_5", name: "Team Builder", requirement: "Invite 5 direct referrals", amount: 25, category: "network", checkFn: () => (referrals?.length || 0) >= 5 },
      { id: "referral_10", name: "Network Grower", requirement: "Invite 10 direct referrals", amount: 50, category: "network", checkFn: () => (referrals?.length || 0) >= 10 },
      { id: "referral_25", name: "Team Leader", requirement: "Invite 25 direct referrals", amount: 100, category: "network", checkFn: () => (referrals?.length || 0) >= 25 },
      { id: "referral_50", name: "Network Director", requirement: "Invite 50 direct referrals", amount: 200, category: "network", checkFn: () => (referrals?.length || 0) >= 50 },
      { id: "products_10", name: "Product Seller", requirement: "Submit 10 products", amount: 25, category: "sales", checkFn: () => (userProducts?.length || 0) >= 10 },
      { id: "products_50", name: "Top Seller", requirement: "Submit 50 products", amount: 100, category: "sales", checkFn: () => (userProducts?.length || 0) >= 50 },
      { id: "products_100", name: "Super Seller", requirement: "Submit 100 products", amount: 250, category: "sales", checkFn: () => (userProducts?.length || 0) >= 100 },
      { id: "volume_1k", name: "Thousand Dollar Club", requirement: "Earn $1,000 monthly", amount: 100, category: "volume", checkFn: () => (user.balance || 0) >= 1000 },
      { id: "volume_5k", name: "Five Thousand Club", requirement: "Earn $5,000 total", amount: 500, category: "volume", checkFn: () => (user.totalEarned || 0) >= 5000 },
      { id: "volume_10k", name: "Ten Thousand Club", requirement: "Earn $10,000 total", amount: 1000, category: "volume", checkFn: () => (user.totalEarned || 0) >= 10000 },
      { id: "network_depth", name: "Multi-Level Earner", requirement: "Build referrals 2+ levels deep", amount: 200, category: "depth", checkFn: () => indirectCount >= 5 },
    ];

    const availableBonuses = bonusStructure.map((bonus) => {
      const isClaimed = claimedBonuses.some((b: any) => b.id === bonus.id);
      const isEligible = bonus.checkFn();
      
      return {
        id: bonus.id,
        name: bonus.name,
        requirement: bonus.requirement,
        amount: bonus.amount,
        category: bonus.category,
        claimed: isClaimed,
        eligible: isEligible && !isClaimed,
        status: isClaimed ? "claimed" : isEligible ? "ready" : "locked",
      };
    });

    const stats = {
      totalClaimable: availableBonuses.filter(b => b.eligible).length,
      totalClaimed: claimedBonuses.length,
      totalEarned: claimedBonuses.reduce((sum: number, b: any) => sum + b.amount, 0),
      nextBonus: availableBonuses.find(b => b.status === "locked"),
    };

    return c.json({ success: true, bonuses: availableBonuses, stats });
  } catch (error) {
    console.error(`Error fetching bonuses: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Bonus Payouts: Claim a bonus
app.post("/bonus-payouts/claim", async (c) => {
  let releaseFinancialLock: (() => Promise<void>) | null = null;
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const { bonusId } = await c.req.json();
    releaseFinancialLock = await acquireFinancialLock('user', String(userId));
    if (!releaseFinancialLock) {
      return c.json({ error: 'Financial operation is busy. Please retry shortly.' }, 409);
    }

    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: "User not found" }, 404);

    // Fetch claimed bonuses (re-read inside lock to prevent TOCTOU race)
    const claimedBonuses = await kv.get(`bonuses:claimed:${userId}`) || [];
    if (claimedBonuses.some((b: any) => b.id === bonusId)) {
      return c.json({ error: "Bonus already claimed" }, 400);
    }

    // Define bonus structure
    const bonusMap: any = {
      tier_bronze: { name: "Bronze Member", amount: 50 },
      tier_silver: { name: "Silver Member", amount: 150 },
      tier_gold: { name: "Gold Member", amount: 300 },
      tier_platinum: { name: "Platinum Member", amount: 500 },
      referral_5: { name: "Team Builder", amount: 25 },
      referral_10: { name: "Network Grower", amount: 50 },
      referral_25: { name: "Team Leader", amount: 100 },
      referral_50: { name: "Network Director", amount: 200 },
      products_10: { name: "Product Seller", amount: 25 },
      products_50: { name: "Top Seller", amount: 100 },
      products_100: { name: "Super Seller", amount: 250 },
      volume_1k: { name: "Thousand Dollar Club", amount: 100 },
      volume_5k: { name: "Five Thousand Club", amount: 500 },
      volume_10k: { name: "Ten Thousand Club", amount: 1000 },
      network_depth: { name: "Multi-Level Earner", amount: 200 },
    };

    const bonus = bonusMap[bonusId];
    if (!bonus) return c.json({ error: "Bonus not found" }, 404);

    // Add bonus amount to balance
    user.balance = (user.balance || 0) + bonus.amount;
    user.totalEarned = (user.totalEarned || 0) + bonus.amount;

    // Mark bonus as claimed
    const claimedEntry = {
      id: bonusId,
      name: bonus.name,
      amount: bonus.amount,
      claimedAt: new Date().toISOString(),
    };

    claimedBonuses.push(claimedEntry);

    // Update user and save claim
    await kv.set(`user:${userId}`, user);
    await kv.set(`bonuses:claimed:${userId}`, claimedBonuses);

    // Log bonus claim
    const claimLog = await kv.get(`bonuses:log:${userId}`) || [];
    claimLog.push({
      bonusId,
      bonusName: bonus.name,
      amount: bonus.amount,
      claimedAt: new Date().toISOString(),
      newBalance: user.balance,
    });
    await kv.set(`bonuses:log:${userId}`, claimLog);

    return c.json({
      success: true,
      message: `Bonus "${bonus.name}" claimed! +$${bonus.amount}`,
      newBalance: user.balance,
      totalEarned: user.totalEarned,
    });
  } catch (error) {
    console.error(`Error claiming bonus: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  } finally {
    if (releaseFinancialLock) await releaseFinancialLock();
  }
});

// Bonus Payouts: Get claim history
app.get("/bonus-payouts/history", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const claimLog = await kv.get(`bonuses:log:${userId}`) || [];

    const stats = {
      totalBonusesEarned: claimLog.length,
      totalBonusAmount: claimLog.reduce((sum: number, b: any) => sum + (b.amount || 0), 0),
      averageBonusAmount: claimLog.length > 0 ? Math.round(claimLog.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) / claimLog.length) : 0,
      lastClaimed: claimLog.length > 0 ? claimLog[claimLog.length - 1].claimedAt : null,
    };

    return c.json({
      success: true,
      history: claimLog.sort((a: any, b: any) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()),
      stats,
    });
  } catch (error) {
    console.error(`Error fetching bonus history: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// =============================================
// CUSTOMER SERVICE SYSTEM
// =============================================

// Support Tickets: Create new ticket
app.post("/support-tickets", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const { subject, category, message, priority } = await c.req.json();
    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: "User not found" }, 404);

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ticket = {
      id: ticketId,
      userId,
      userName: user.name,
      userEmail: user.email,
      subject,
      category,
      message,
      priority: priority || "normal",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    };

    // Save ticket
    await kv.set(`ticket:${ticketId}`, ticket);

    // Add to user's ticket list
    const userTickets = await kv.get(`tickets:user:${userId}`) || [];
    userTickets.push(ticketId);
    await kv.set(`tickets:user:${userId}`, userTickets);

    // Add to queue for support team
    const ticketQueue = await kv.get(`tickets:queue`) || [];
    ticketQueue.push(ticketId);
    await kv.set(`tickets:queue`, ticketQueue);

    return c.json({
      success: true,
      ticket,
      message: "Support ticket created successfully",
    });
  } catch (error) {
    console.error(`Error creating ticket: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Support Tickets: Get user's tickets
app.get("/support-tickets", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const userTicketIds = await kv.get(`tickets:user:${userId}`) || [];
    const tickets = [];

    for (const ticketId of userTicketIds) {
      const ticket = await kv.get(`ticket:${ticketId}`);
      if (ticket) tickets.push(ticket);
    }

    const stats = {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status === "open").length,
      inProgress: tickets.filter((t: any) => t.status === "in-progress").length,
      resolved: tickets.filter((t: any) => t.status === "resolved").length,
    };

    return c.json({
      success: true,
      tickets: tickets.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      stats,
    });
  } catch (error) {
    console.error(`Error fetching tickets: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Support Tickets: Get ticket details
app.get("/support-tickets/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const ticketId = c.req.param('id');
    const ticket = await kv.get(`ticket:${ticketId}`);
    if (!ticket) return c.json({ error: "Ticket not found" }, 404);

    // Check ownership or admin
    if (ticket.userId !== userId) {
      return c.json({ error: "Unauthorized - not your ticket" }, 403);
    }

    return c.json({ success: true, ticket });
  } catch (error) {
    console.error(`Error fetching ticket: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Support Tickets: Reply to ticket
app.post("/support-tickets/:id/reply", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const ticketId = c.req.param('id');
    const { message } = await c.req.json();
    const user = await kv.get(`user:${userId}`);

    const ticket = await kv.get(`ticket:${ticketId}`);
    if (!ticket) return c.json({ error: "Ticket not found" }, 404);

    if (ticket.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const reply = {
      id: `reply_${Date.now()}`,
      userId,
      userName: user.name,
      message,
      createdAt: new Date().toISOString(),
    };

    ticket.replies.push(reply);
    if (ticket.status === 'resolved') {
      ticket.status = 'open';
    }
    ticket.updatedAt = new Date().toISOString();

    await kv.set(`ticket:${ticketId}`, ticket);

    return c.json({
      success: true,
      ticket,
      message: "Reply added successfully",
    });
  } catch (error) {
    console.error(`Error adding reply: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Admin: update support ticket status
app.put('/admin/support-tickets/:id/status', async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    if (!adminAccess.isSuperAdmin) {
      const hasSupportAccess = adminAccess.permissions.includes(ADMIN_PERMISSION_ALL)
        || adminAccess.permissions.includes('support.manage');
      if (!hasSupportAccess) {
        return c.json({ error: 'Forbidden - Missing permission: support.manage' }, 403);
      }
    }

    const ticketId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const rawStatus = String(body?.status || '').trim().toLowerCase();
    const status = rawStatus === 'in_progress' ? 'in-progress' : rawStatus;

    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return c.json({ error: 'Invalid status. Use open, in-progress, or resolved.' }, 400);
    }

    const ticket = await kv.get(`ticket:${ticketId}`);
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    const ticketOwner = await kv.get(`user:${ticket.userId}`);
    if (!isUserInAdminScope(scope, ticketOwner)) {
      return c.json({ error: 'Forbidden - Ticket is outside your admin scope' }, 403);
    }

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    await kv.set(`ticket:${ticketId}`, ticket);

    return c.json({
      success: true,
      ticket,
      message: 'Ticket status updated successfully',
    });
  } catch (error) {
    console.error(`Error updating support ticket status: ${error}`);
    return c.json({ error: 'Internal server error while updating support ticket status' }, 500);
  }
});

// Admin: list support tickets (all active admins can review customer service queue)
app.get('/admin/support-tickets', async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    if (!adminAccess.isSuperAdmin) {
      const hasSupportAccess = adminAccess.permissions.includes(ADMIN_PERMISSION_ALL)
        || adminAccess.permissions.includes('support.manage');
      if (!hasSupportAccess) {
        return c.json({ error: 'Forbidden - Missing permission: support.manage' }, 403);
      }
    }

    const scope = await getAdminScopeConfig(adminAccess);

    const ticketRows = await kv.getByPrefix('ticket:');
    const tickets: any[] = [];

    for (const ticket of ticketRows || []) {
      if (!ticket?.id || !ticket?.userId) continue;

      const ticketOwner = await kv.get(`user:${ticket.userId}`);
      if (!isUserInAdminScope(scope, ticketOwner)) continue;

      tickets.push(ticket);
    }

    return c.json({
      success: true,
      tickets: tickets.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
      total: tickets.length,
    });
  } catch (error) {
    console.error(`Error fetching admin support tickets: ${error}`);
    return c.json({ error: 'Internal server error while fetching admin support tickets' }, 500);
  }
});

// Admin: reply to support ticket
app.post('/admin/support-tickets/:id/reply', async (c) => {
  try {
    const adminAccess = await requireSupportAccess(c);
    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const rateLimit = await enforceAdminRateLimit(c, adminAccess, 'support.reply', 60, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return c.json({ error: `Rate limit exceeded for support replies. Try again in ${rateLimit.retryAfterSec}s.` }, 429);
    }

    const ticketId = c.req.param('id');
    const { message, status } = await c.req.json();
    const replyMessage = String(message || '').trim();
    if (!replyMessage) {
      return c.json({ error: 'message is required' }, 400);
    }

    const ticket = await kv.get(`ticket:${ticketId}`);
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const scope = await getAdminScopeConfig(adminAccess);
    const ticketOwner = await kv.get(`user:${ticket.userId}`);
    if (!isUserInAdminScope(scope, ticketOwner)) {
      return c.json({ error: 'Forbidden - Ticket is outside your admin scope' }, 403);
    }

    let adminName = 'Super Admin';
    if (!adminAccess.isSuperAdmin && adminAccess.userId) {
      const adminAccount = await kv.get(`admin:account:${adminAccess.userId}`);
      adminName = adminAccount?.displayName || adminAccount?.username || 'Support Admin';
    }

    const reply = {
      id: `reply_admin_${Date.now()}`,
      userId: adminAccess.userId || 'super_admin',
      userName: adminName,
      message: replyMessage,
      createdAt: new Date().toISOString(),
      role: 'admin',
    };

    ticket.replies = Array.isArray(ticket.replies) ? ticket.replies : [];
    ticket.replies.push(reply);
    ticket.status = status || (ticket.status === 'resolved' ? 'resolved' : 'in-progress');
    ticket.updatedAt = new Date().toISOString();

    await kv.set(`ticket:${ticketId}`, ticket);

    return c.json({
      success: true,
      ticket,
      reply,
      message: 'Admin reply sent successfully',
    });
  } catch (error) {
    console.error(`Error replying as admin: ${error}`);
    return c.json({ error: 'Internal server error while replying to support ticket' }, 500);
  }
});

// Admin: reconcile financial withdrawal state and stale operation records (super admin only)
app.post('/admin/finance/reconcile-withdrawals', async (c) => {
  try {
    const superCheck = await requireSuperAdmin(c);
    if (!superCheck.ok) {
      return superCheck.response;
    }

    const body = await c.req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const staleMinutes = Number.isFinite(Number(body?.staleMinutes))
      ? Math.max(5, Number(body.staleMinutes))
      : 30;
    const staleThresholdMs = Date.now() - (staleMinutes * 60 * 1000);

    const withdrawals = await kv.getByPrefix('withdrawal:') || [];
    const withdrawalById = new Map<string, any>();
    for (const withdrawal of withdrawals) {
      const id = String(withdrawal?.id || '').trim();
      if (!id) continue;
      withdrawalById.set(id, withdrawal);
    }

    const pendingRaw = await kv.get('withdrawals:pending') || [];
    const approvedRaw = await kv.get('withdrawals:approved') || [];
    const deniedRaw = await kv.get('withdrawals:denied') || [];

    const pending = uniqueStringArray(pendingRaw);
    const approved = uniqueStringArray(approvedRaw);
    const denied = uniqueStringArray(deniedRaw);

    const expectedPending = Array.from(withdrawalById.values())
      .filter((item: any) => String(item?.status || '') === 'pending')
      .map((item: any) => String(item.id));
    const expectedApproved = Array.from(withdrawalById.values())
      .filter((item: any) => String(item?.status || '') === 'approved')
      .map((item: any) => String(item.id));
    const expectedDenied = Array.from(withdrawalById.values())
      .filter((item: any) => String(item?.status || '') === 'denied')
      .map((item: any) => String(item.id));

    const pendingSet = new Set(pending);
    const approvedSet = new Set(approved);
    const deniedSet = new Set(denied);

    const nextPending = uniqueStringArray(expectedPending).filter((id) => !approvedSet.has(id) && !deniedSet.has(id));
    const nextApproved = uniqueStringArray(expectedApproved).filter((id) => !deniedSet.has(id));
    const nextDenied = uniqueStringArray(expectedDenied);

    const queueChanges = {
      pending: {
        before: pending,
        after: nextPending,
        removed: pending.filter((id) => !nextPending.includes(id)),
        added: nextPending.filter((id) => !pending.includes(id)),
      },
      approved: {
        before: approved,
        after: nextApproved,
        removed: approved.filter((id) => !nextApproved.includes(id)),
        added: nextApproved.filter((id) => !approved.includes(id)),
      },
      denied: {
        before: denied,
        after: nextDenied,
        removed: denied.filter((id) => !nextDenied.includes(id)),
        added: nextDenied.filter((id) => !denied.includes(id)),
      },
    };

    if (!dryRun) {
      await kv.set('withdrawals:pending', nextPending);
      await kv.set('withdrawals:approved', nextApproved);
      await kv.set('withdrawals:denied', nextDenied);
    }

    const operations = await kv.getByPrefix('finance:operation:') || [];
    const staleInProgress = (operations || []).filter((operation: any) => {
      if (String(operation?.status || '') !== 'in_progress') return false;
      const startedAtMs = new Date(String(operation?.createdAt || operation?.updatedAt || '')).getTime();
      return Number.isFinite(startedAtMs) && startedAtMs > 0 && startedAtMs < staleThresholdMs;
    });

    const markedStaleOperationIds: string[] = [];
    if (!dryRun) {
      for (const operation of staleInProgress) {
        const operationId = String(operation?.id || '').trim();
        if (!operationId) continue;
        await finalizeFinancialOperation(operationId, 'failed', {
          reason: `Marked stale after ${staleMinutes} minutes by reconciliation task`,
          autoRecovered: false,
        });
        markedStaleOperationIds.push(operationId);
      }
    }

    return c.json({
      success: true,
      dryRun,
      staleMinutes,
      withdrawalTotals: {
        total: withdrawalById.size,
        pending: expectedPending.length,
        approved: expectedApproved.length,
        denied: expectedDenied.length,
      },
      queueChanges,
      staleOperations: {
        detected: staleInProgress.map((operation: any) => String(operation?.id || '')).filter(Boolean),
        markedFailed: markedStaleOperationIds,
      },
    });
  } catch (error) {
    logServerEvent('error', 'withdrawal.reconcile.failed', { error: String(error) });
    return c.json({ error: 'Internal server error while reconciling withdrawal state' }, 500);
  }
});

// Live Chat: Send message
app.post("/chat/messages", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const { conversationId, message } = await c.req.json();
    const user = await kv.get(`user:${userId}`);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const msg = {
      id: messageId,
      conversationId,
      userId,
      userName: user.name,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Save message
    await kv.set(`message:${messageId}`, msg);

    // Add to conversation
    const convMessages = await kv.get(`chat:messages:${conversationId}`) || [];
    convMessages.push(messageId);
    await kv.set(`chat:messages:${conversationId}`, convMessages);

    return c.json({ success: true, message: msg });
  } catch (error) {
    console.error(`Error sending message: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Live Chat: Get conversations
app.get("/chat/conversations", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const convIds = await kv.get(`chat:conversations:${userId}`) || [];
    const conversations = [];

    for (const convId of convIds) {
      const conv = await kv.get(`chat:conversation:${convId}`);
      if (conv) {
        // Get last message
        const messageIds = await kv.get(`chat:messages:${convId}`) || [];
        const lastMsgId = messageIds[messageIds.length - 1];
        const lastMsg = lastMsgId ? await kv.get(`message:${lastMsgId}`) : null;

        conversations.push({
          ...conv,
          lastMessage: lastMsg,
          messageCount: messageIds.length,
        });
      }
    }

    return c.json({
      success: true,
      conversations: conversations.sort((a: any, b: any) => 
        new Date(b.lastMessage?.createdAt || b.createdAt).getTime() - 
        new Date(a.lastMessage?.createdAt || a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error(`Error fetching conversations: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Live Chat: Get messages in conversation
app.get("/chat/messages", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const conversationId = c.req.query('conversationId');
    const messageIds = await kv.get(`chat:messages:${conversationId}`) || [];
    const messages = [];

    for (const msgId of messageIds) {
      const msg = await kv.get(`message:${msgId}`);
      if (msg) messages.push(msg);
    }

    return c.json({
      success: true,
      messages: messages.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error(`Error fetching messages: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// FAQ: Get all FAQs
app.get("/faq", async (c) => {
  try {
    const faqs = await kv.get(`faq:all`) || [];
    
    // If no FAQs, return default ones
    if (faqs.length === 0) {
      const defaultFAQs = [
        {
          id: "faq_1",
          category: "Getting Started",
          question: "How do I start earning with this platform?",
          answer: "Create an account, invite people using your referral code, and submit products to earn commissions. You'll earn from your direct referrals and their network.",
          views: 120,
        },
        {
          id: "faq_2",
          category: "Withdrawals",
          question: "How long does a withdrawal take?",
          answer: "Withdrawals are processed within 3-5 business days after admin approval. Processing speed depends on your chosen payment method.",
          views: 89,
        },
        {
          id: "faq_3",
          category: "Commissions",
          question: "How does the commission structure work?",
          answer: "You earn a percentage of profits from products submitted by you and your referrals. Commission rates vary by VIP tier. You also earn 10% commissions cascading down 10 levels.",
          views: 156,
        },
        {
          id: "faq_4",
          category: "VIP Tiers",
          question: "What are VIP tiers and how do I upgrade?",
          answer: "VIP tiers unlock higher commission rates and exclusive bonuses. Upgrade by increasing your lifetime earnings: Bronze ($500), Silver ($2k), Gold ($5k), Platinum ($10k).",
          views: 98,
        },
        {
          id: "faq_5",
          category: "Referrals",
          question: "How do I find and manage my referrals?",
          answer: "Your referral code is in your profile. Share it with friends or on social media. Manage all your referrals in the Referral Manager section with detailed analytics.",
          views: 145,
        },
        {
          id: "faq_6",
          category: "Bonuses",
          question: "How do I earn bonus rewards?",
          answer: "Bonuses unlock automatically as you achieve milestones like VIP tier upgrades, network growth, product submissions, and earning thresholds. Claim them in Bonus Payouts.",
          views: 76,
        },
        {
          id: "faq_7",
          category: "Products",
          question: "What types of products can I submit?",
          answer: "You can submit any legitimate product or service. Each submission earns you a base profit that increases with your VIP tier. Products are subject to approval.",
          views: 103,
        },
        {
          id: "faq_8",
          category: "Support",
          question: "How do I contact support?",
          answer: "You can create a support ticket, use live chat during business hours, or browse our FAQ. Support team typically responds within 24 hours.",
          views: 67,
        },
      ];

      await kv.set(`faq:all`, defaultFAQs);
      return c.json({ success: true, faqs: defaultFAQs });
    }

    return c.json({ success: true, faqs });
  } catch (error) {
    console.error(`Error fetching FAQs: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// FAQ: Search FAQs
app.get("/faq/search", async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || '';
    const category = c.req.query('category');

    const faqs = await kv.get(`faq:all`) || [];

    let results = faqs.filter((faq: any) => {
      const matchQuery = faq.question.toLowerCase().includes(query) || 
                        faq.answer.toLowerCase().includes(query) ||
                        faq.category.toLowerCase().includes(query);
      const matchCategory = !category || faq.category.toLowerCase() === category.toLowerCase();
      return matchQuery && matchCategory;
    });

    // Sort by views (most helpful first)
    results = results.sort((a: any, b: any) => (b.views || 0) - (a.views || 0));

    return c.json({ success: true, results });
  } catch (error) {
    console.error(`Error searching FAQs: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Route compatibility fallback
// Supports legacy prefixed URLs by internally forwarding to canonical routes.
app.all("*", async (c) => {
  const forwarded = c.req.header('x-route-compat-forwarded') === '1';
  const path = c.req.path || '/';

  if (forwarded) {
    return c.json({ error: "Not Found" }, 404);
  }

  // Normalize path by removing a leading function-name segment if present.
  const pathSegments = path.split('/').filter(Boolean);
  const hasFunctionSegment = pathSegments.length > 0 && pathSegments[0].startsWith('make-server-');
  const normalizedPath = hasFunctionSegment
    ? `/${pathSegments.slice(1).join('/')}`
    : path;

  // Compatibility rewrite direction: legacy -> canonical
  const legacyPrefix = '/make-server-44a642d3';
  const canonicalPath = normalizedPath.startsWith(`${legacyPrefix}/`)
    ? normalizedPath.slice(legacyPrefix.length)
    : normalizedPath;

  const safeCanonicalPath = canonicalPath === '/' || canonicalPath === '' ? '' : canonicalPath;

  const url = new URL(c.req.url);
  const rewrittenPath = `${safeCanonicalPath || '/'}`;
  const rewrittenUrl = `${url.origin}${rewrittenPath}${url.search}`;

  const headers = new Headers(c.req.raw.headers);
  headers.set('x-route-compat-forwarded', '1');

  const method = c.req.method;
  const init: RequestInit = {
    method,
    headers,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = c.req.raw.body;
  }

  return app.fetch(new Request(rewrittenUrl, init));
});

// Add explicit CORS preflight handler for all routes
app.options('/*', (c) => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization, Idempotency-Key, X-Idempotency-Key');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  return new Response('', { status: 204, headers });
});

Deno.serve(app.fetch);