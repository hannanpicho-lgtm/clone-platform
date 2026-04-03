import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { getCurrentTenantBranding } from '../branding/tenantBranding';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Menu,
  Bell,
  User,
  RefreshCw,
  Rocket,
  Snowflake,
  Home,
  BarChart3,
  FileText,
  Settings,
  MessageCircle,
  Wallet
} from 'lucide-react';
import { ProductsView, ProductData } from './ProductsView';
import { ProductReviewPage } from './ProductReviewPage';
import { VIPTiersCarousel } from './VIPTiersCarousel';
import { EarningsDashboard } from './EarningsDashboard';
import { ReferralManager } from './ReferralManager';
import { WithdrawalForm } from './WithdrawalForm';
import { EmailPreferences } from './EmailPreferences';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ReferrersLeaderboard } from './ReferrersLeaderboard';
import { BonusPayouts } from './BonusPayouts';
import { SupportTickets } from './SupportTickets';
import { LiveChat } from './LiveChat';
import { FAQ } from './FAQ';

/**
 * ========================================
 * PREMIUM PRODUCT FREEZE/UNFREEZE LOGIC
 * ========================================
 * 
 * SCENARIO EXAMPLE:
 * - User balance before freeze: $3,000
 * - Premium product assigned: $10,000
 * - Premium profit (10x commission): $150
 * 
 * WHEN FREEZING:
 * 1. Calculate deficit: $10,000 - $3,000 = $7,000
 * 2. Set balance to: -$7,000 (shows user they owe money)
 * 3. Store originalBalance: $3,000
 * 4. Store freezeAmount: $10,000 (the FULL premium product amount)
 * 5. Store premiumProfit: $150
 * 6. Display to user: "Top-up Required: $10,000"
 * 
 * WHEN UNFREEZING (after user tops up $10,000):
 * 1. New Balance = originalBalance + freezeAmount + premiumProfit
 * 2. New Balance = $3,000 + $10,000 + $150 = $13,150
 * 3. Update product record from "pending" to "approved"
 * 4. Add premium profit to today's profit
 * 
 * RESULT: User keeps their original $3,000, adds the $10,000 top-up, 
 *         and earns $150 premium profit = Total: $13,150
 * ========================================
 */
import { AboutUsPage } from './AboutUsPage';
import { MemberIDPage } from './MemberIDPage';
import { CertificatePage } from './CertificatePage';
import { ActivityPage } from './ActivityPage';
import { RecordsPage, RecordItem } from './RecordsPage';
import { ProductSubmissionLoader } from './ProductSubmissionLoader';
import { CustomerServiceChat } from './CustomerServiceChat';
import { UnfreezeSuccessModal } from './UnfreezeSuccessModal';
import { AccountFreezeModal } from './AccountFreezeModal';

interface UserProfile {
  id: string;
  email: string;
  contactEmail?: string | null;
  invitationCode?: string;
  avatarUrl?: string | null;
  name: string;
  vipTier: string;
  createdAt: string;
  balance?: number;
  principalBalance?: number;
  totalEarnings?: number;
  accountFrozen?: boolean;
  freezeAmount?: number;
  withdrawalLimit?: number;
  productsSubmitted?: number;
  creditScore?: number;
  dailyTaskSetLimit?: number;
  extraTaskSets?: number;
  taskSetsCompletedToday?: number;
  currentSetTasksCompleted?: number;
  todayProfit?: number;
  todayProfitDate?: string | null;
  premiumAssignment?: {
    orderId?: string;
    amount?: number;
    enteredAmount?: number;
    position?: number;
    vipRate?: number;
    multiplier?: number;
    potentialProfit?: number;
    bundleProductCount?: number;
    bundleItems?: Array<{
      name: string;
      type: 'premium' | 'individual';
      amount: number;
    }>;
    previousBalance?: number;
    balanceAfterAssignment?: number;
    topUpRequired?: number;
    assignedAt?: string;
    encounteredAt?: string | null;
    encounteredTaskNumber?: number | null;
  } | null;
  lastLoginAt?: string | null;
  lastLoginCountry?: string | null;
  lastLoginIp?: string | null;
}

interface Metrics {
  alertCompressionRatio: number;
  ticketReductionRate: number;
  mttrImprovement: number;
  automationCoverage: number;
}

interface DepositConfig {
  bank: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    routingNumber: string;
    instructions: string;
  };
  crypto: {
    defaultAsset?: string;
    network: string;
    walletAddress: string;
    instructions: string;
    assets?: Array<{
      asset: string;
      network: string;
      networks?: string[];
      walletAddress: string;
      instructions?: string;
    }>;
  };
  minimumAmount: number;
}

const DEFAULT_DEPOSIT_CRYPTO_ASSETS: Array<{
  asset: string;
  network: string;
  networks: string[];
  walletAddress: string;
  instructions: string;
}> = [
  {
    asset: 'BTC',
    network: 'Bitcoin',
    networks: ['Bitcoin'],
    walletAddress: '',
    instructions: 'Send BTC on Bitcoin network only.',
  },
  {
    asset: 'ETH',
    network: 'ERC20',
    networks: ['ERC20'],
    walletAddress: '',
    instructions: 'Send ETH on ERC20 network only.',
  },
  {
    asset: 'USDC',
    network: 'ERC20',
    networks: ['ERC20', 'TRC20', 'BEP20'],
    walletAddress: '',
    instructions: 'Select the intended USDC network before sending.',
  },
  {
    asset: 'USDT',
    network: 'TRC20',
    networks: ['TRC20', 'ERC20', 'BEP20'],
    walletAddress: '',
    instructions: 'Select the intended USDT network before sending.',
  },
];

const getDepositCryptoAssets = (config: DepositConfig | null) => {
  const configuredAssets = Array.isArray(config?.crypto?.assets) ? config!.crypto.assets : [];
  const mergedByAsset = new Map<string, {
    asset: string;
    network: string;
    networks: string[];
    walletAddress: string;
    instructions?: string;
  }>();

  DEFAULT_DEPOSIT_CRYPTO_ASSETS.forEach((item) => {
    mergedByAsset.set(item.asset.toUpperCase(), {
      asset: item.asset,
      network: item.network,
      networks: item.networks,
      walletAddress: item.walletAddress,
      instructions: item.instructions,
    });
  });

  configuredAssets.forEach((item) => {
    const key = String(item?.asset || '').toUpperCase();
    if (!key) {
      return;
    }
    const fallback = mergedByAsset.get(key);
    const networkFromItem = String(item?.network || fallback?.network || config?.crypto?.network || '').trim();
    const networks = Array.isArray(item?.networks) && item.networks.length > 0
      ? item.networks
      : (fallback?.networks && fallback.networks.length > 0 ? fallback.networks : (networkFromItem ? [networkFromItem] : []));

    mergedByAsset.set(key, {
      asset: key,
      network: networkFromItem || (networks[0] || ''),
      networks,
      walletAddress: String(item?.walletAddress || fallback?.walletAddress || config?.crypto?.walletAddress || '').trim(),
      instructions: item?.instructions || fallback?.instructions || config?.crypto?.instructions || undefined,
    });
  });

  return Array.from(mergedByAsset.values());
};

interface DashboardProps {
  accessToken: string;
  onLogout: () => void;
}

export function Dashboard({ accessToken, onLogout }: DashboardProps) {
  const branding = getCurrentTenantBranding();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const menuScrollRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [balance, setBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [productsSubmitted, setProductsSubmitted] = useState(0);
  const [showReviewPage, setShowReviewPage] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ProductData | null>(null);
  const [todaysProfit, setTodaysProfit] = useState(0); // Today's profit starts at 0
  const [showVIPCarousel, setShowVIPCarousel] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showMemberID, setShowMemberID] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  // All product records for records page (merged assigned + backend)
  const [productRecords, setProductRecords] = useState<RecordItem[]>([]);
  // Assigned products for current set (simulate/generate for now)
  const [assignedProducts, setAssignedProducts] = useState<ProductData[]>([]);
  const [showSubmissionLoader, setShowSubmissionLoader] = useState(false);
  const [submissionData, setSubmissionData] = useState<{
    productName: string;
    profit: number;
    rating: number;
    todaysTotal: number;
  } | null>(null);
  
  // Testing: VIP tier override (for testing different tiers)
  const [testVIPTier, setTestVIPTier] = useState<string | null>(null);
  
  // Unfreeze success modal
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [unfreezeBalance, setUnfreezeBalance] = useState(0);
  
  // Account frozen state
  const [accountFrozen, setAccountFrozen] = useState(false);
  const [freezeAmount, setFreezeAmount] = useState(0);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezePremiumAmount, setFreezePremiumAmount] = useState(0);
  const [originalBalanceBeforeFreeze, setOriginalBalanceBeforeFreeze] = useState(0);
  const [premiumProfitBeforeFreeze, setPremiumProfitBeforeFreeze] = useState(0);
  const [activePremiumAssignment, setActivePremiumAssignment] = useState<UserProfile['premiumAssignment'] | null>(null);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  
  // New profit sharing features
  const [showEarnings, setShowEarnings] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showEmailPreferences, setShowEmailPreferences] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBonusPayouts, setShowBonusPayouts] = useState(false);
  const [showSupportTickets, setShowSupportTickets] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // For refreshing earnings/referrals
  const [manualRefreshToken, setManualRefreshToken] = useState(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Withdrawal password modal state
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  const [uiNotice, setUiNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Forced password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  
  // Settings state
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    username: 'Demo User',
    contactEmail: '',
    loginPassword: '',
    confirmLoginPassword: '',
    withdrawalPassword: '',
    confirmWithdrawalPassword: '',
  });
  
  // Banking details state
  const [bankingDetails, setBankingDetails] = useState({
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
  });
  
  // Crypto wallet state
  const [cryptoWallet, setCryptoWallet] = useState({
    walletType: 'Bitcoin', // Bitcoin, Ethereum, USDC, Litecoin, etc.
    walletAddress: '',
  });
  
  const [showBankingForm, setShowBankingForm] = useState(false);
  const [showCryptoForm, setShowCryptoForm] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'bank' | 'crypto'>('bank');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositReference, setDepositReference] = useState('');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [depositSourceWalletAddress, setDepositSourceWalletAddress] = useState('');
  const [depositCryptoAsset, setDepositCryptoAsset] = useState('BTC');
  const [depositCryptoNetwork, setDepositCryptoNetwork] = useState('Bitcoin');
  const [depositNote, setDepositNote] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [depositConfig, setDepositConfig] = useState<DepositConfig | null>(null);
  const [taskActionNotice, setTaskActionNotice] = useState<string | null>(null);

  const isTaskSubmissionLimitMessage = (message: string) => {
    const normalized = String(message || '').toLowerCase();
    return (
      normalized.includes('daily task set limit reached')
      || normalized.includes('current task set is complete')
      || normalized.includes('reset task set')
      || normalized.includes('additional sets')
    );
  };

  const handleSubmitProduct = (productId: string, commission: number) => {
    setBalance(prev => prev + commission);
    setTotalEarnings(prev => prev + commission);
    setProductsSubmitted(prev => prev + 1);
    setTodaysProfit(prev => prev + commission);
  };
  useEffect(() => {
    if (!showMenu) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      if (menuScrollRef.current) {
        menuScrollRef.current.scrollTop = 0;
      }
    });

    return () => {
      document.body.style.overflow = '';
    };
  }, [showMenu]);

  const handleStartProduct = async (fallbackProduct: ProductData) => {
    try {
      const { projectId } = await import('~/utils/supabase/info');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/tasks/next-product`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.product) {
        if (response.status === 400 || response.status === 409 || response.status === 403) {
          const message = String(data?.error || 'Unable to start task right now.');
          setTaskActionNotice(message);
          return;
        }
        setTaskActionNotice('Unable to load the next task from server. Task order is locked by admin position rules. Please retry.');
        return;
      }

      setTaskActionNotice(null);

      const serverProduct = data.product;
      setCurrentProduct({
        name: String(serverProduct?.name || fallbackProduct.name),
        image: String(serverProduct?.image || fallbackProduct.image),
        totalAmount: Number(serverProduct?.totalAmount || fallbackProduct.totalAmount || 0),
        profit: Number(serverProduct?.profit || fallbackProduct.profit || 0),
        creationTime: String(serverProduct?.creationTime || fallbackProduct.creationTime),
        ratingNo: String(serverProduct?.ratingNo || fallbackProduct.ratingNo),
      });
      setShowReviewPage(true);
    } catch {
      setTaskActionNotice('Network issue while loading the next task. Task order is preserved; please try again.');
    }
  };

  const handleReviewSubmit = async (rating: number, review: string, reviewType: string) => {
    if (!currentProduct) return;

    const { projectId } = await import('~/utils/supabase/info');
    const completionResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/tasks/complete-product`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName: currentProduct.name,
        productValue: currentProduct.totalAmount,
        profit: currentProduct.profit,
        productImage: currentProduct.image,
        ratingNo: currentProduct.ratingNo,
      }),
    });

    const completionData = await completionResponse.json().catch(() => ({}));
    if (!completionResponse.ok) {
      const message = String(completionData?.error || 'Unable to submit task right now. Please try again.');
      const frozenUser = completionData?.user || {};
      const isFreezeEncounter = completionResponse.status === 403 && Boolean(
        frozenUser?.accountFrozen
        || completionData?.premiumEncounter
      );

      if (isFreezeEncounter) {
        const nextBalance = Number(frozenUser?.balance ?? balance);
        const nextFreezeAmount = Number(
          frozenUser?.freezeAmount
          ?? completionData?.premiumEncounter?.topUpRequired
          ?? freezeAmount
          ?? 0
        );
        const nextPremiumAssignment = frozenUser?.premiumAssignment ?? activePremiumAssignment ?? null;

        setBalance(nextBalance);
        setAccountFrozen(true);
        setFreezeAmount(nextFreezeAmount);
        setActivePremiumAssignment(nextPremiumAssignment);
        setTaskActionNotice(message);

        setProfile((prev) => prev ? {
          ...prev,
          balance: nextBalance,
          accountFrozen: true,
          freezeAmount: nextFreezeAmount,
          premiumAssignment: nextPremiumAssignment,
        } : prev);

        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setProductRecords((prev) => [{
          id: `record-frozen-${Date.now()}`,
          timestamp,
          productName: currentProduct.name,
          productImage: currentProduct.image,
          totalAmount: currentProduct.totalAmount,
          profit: 0,
          status: 'frozen',
        }, ...prev]);

        setShowSubmissionLoader(false);
        setSubmissionData(null);
        setShowReviewPage(false);
        setCurrentProduct(null);
        setActiveNav('analytics');
        return;
      }

      if (isTaskSubmissionLimitMessage(message)) {
        setTaskActionNotice(message);
      } else {
        setUiNotice({ type: 'error', text: message });
      }
      return;
    }

    setTaskActionNotice(null);

    const updatedUser = completionData?.user || {};
    const appliedProfit = Number(completionData?.result?.profit ?? currentProduct.profit ?? 0);
    setBalance(Number(updatedUser?.balance ?? balance + appliedProfit));
    setTotalEarnings((prev) => Number(updatedUser?.totalEarnings ?? prev + appliedProfit));
    setProductsSubmitted(Number(updatedUser?.productsSubmitted ?? productsSubmitted + 1));
    setTodaysProfit(prev => prev + appliedProfit);
    setProfile((prev) => prev ? {
      ...prev,
      balance: Number(updatedUser?.balance ?? prev.balance ?? 0),
      productsSubmitted: Number(updatedUser?.productsSubmitted ?? prev.productsSubmitted ?? 0),
      creditScore: Number.isFinite(Number(updatedUser?.creditScore)) ? Number(updatedUser?.creditScore) : Number(prev.creditScore ?? 100),
      dailyTaskSetLimit: Number(updatedUser?.dailyTaskSetLimit ?? prev.dailyTaskSetLimit ?? 1),
      extraTaskSets: Number(updatedUser?.extraTaskSets ?? prev.extraTaskSets ?? 0),
      taskSetsCompletedToday: Number(updatedUser?.taskSetsCompletedToday ?? prev.taskSetsCompletedToday ?? 0),
      currentSetTasksCompleted: Number(updatedUser?.currentSetTasksCompleted ?? prev.currentSetTasksCompleted ?? 0),
      currentSetDate: updatedUser?.currentSetDate ?? prev.currentSetDate ?? null,
      accountFrozen: Boolean(updatedUser?.accountFrozen ?? prev.accountFrozen ?? false),
      freezeAmount: Number(updatedUser?.freezeAmount ?? prev.freezeAmount ?? 0),
    } : prev);

    // Regular product submission
    // Create timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Add record
    const newRecord: RecordItem = {
      id: `record-${Date.now()}`,
      timestamp: timestamp,
      productName: currentProduct.name,
      productImage: currentProduct.image,
      totalAmount: currentProduct.totalAmount,
      profit: currentProduct.profit,
      status: 'approved',
    };
    
    setProductRecords(prev => [newRecord, ...prev]); // Add to beginning
    
    // Set submission data and show loader instead of alert
    setSubmissionData({
      productName: currentProduct.name,
      profit: appliedProfit,
      rating: rating,
      todaysTotal: todaysProfit + appliedProfit,
    });
    setShowSubmissionLoader(true);
    
    // Close review page
    setShowReviewPage(false);
  };
  
  const handleLoaderComplete = () => {
    setShowSubmissionLoader(false);
    setSubmissionData(null);
    setCurrentProduct(null);
  };

  const handlePremiumSubmit = (mergedValue: number, profit: number, bundleCount: number) => {
    // FREEZE LOGIC:
    // Example: Premium = $10,000, Current Balance = $3,000
    // Deficit = $10,000 - $3,000 = $7,000
    // New Balance = -$7,000 (showing deficit)
    // Top-up Required = $10,000 (full premium amount)
    // After Unfreeze: $3,000 (original) + $10,000 (top-up) = $13,000
    
    const originalBalance = balance; // Store original balance (e.g., $3,000)
    const deficit = mergedValue - balance; // Calculate deficit (e.g., $7,000)
    
    // Store original balance and profit before freezing
    setOriginalBalanceBeforeFreeze(originalBalance);
    setPremiumProfitBeforeFreeze(profit); // Store potential premium profit for display
    
    // Set balance to negative (showing the deficit)
    setBalance(-deficit);
    
    // Freeze the account
    setAccountFrozen(true);
    setFreezeAmount(mergedValue); // Store the PREMIUM AMOUNT (e.g., $10,000)
    setFreezePremiumAmount(mergedValue); // Store for modal display
    
    // Create timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Add record for premium merged product (shows as pending/frozen)
    const newRecord: RecordItem = {
      id: `record-${Date.now()}`,
      timestamp: timestamp,
      productName: `🌟 Premium Bundle (${bundleCount} Products) (FROZEN)`,
      productImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
      totalAmount: mergedValue,
      profit: 0, // No profit until unfrozen
      status: 'pending',
    };
    
    setProductRecords(prev => [newRecord, ...prev]);
    
    // Show beautiful freeze modal
    setTimeout(() => {
      setShowFreezeModal(true);
    }, 100);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordChangeForm.newPassword.trim()) {
      setPasswordChangeError('Password is required');
      return;
    }

    if (passwordChangeForm.newPassword.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters');
      return;
    }

    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      setPasswordChangeError('Passwords do not match');
      return;
    }

    try {
      setPasswordChangeLoading(true);
      setPasswordChangeError('');

      const { projectId } = await import('~/utils/supabase/info');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/change-password-on-login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: passwordChangeForm.newPassword }),
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to change password');
      }

      // Password changed successfully
      setShowPasswordChangeModal(false);
      setPasswordChangeForm({ newPassword: '', confirmPassword: '' });
      setUiNotice({ type: 'success', text: '✅ Password changed successfully! You can now access your account.' });
      
      // Reload profile to update must_change_password flag
      setTimeout(() => {
        setUiNotice(null);
      }, 3000);

    } catch (error: any) {
      setPasswordChangeError(String(error?.message || 'Failed to change password'));
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  useEffect(() => {
    if (manualRefreshToken === 0) {
      setIsLoading(true);
    } else {
      setIsManualRefreshing(true);
    }

    const fetchData = async () => {
        try {
          const { projectId } = await import('~/utils/supabase/info');

          const [profileResponse, metricsResponse] = await Promise.all([
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/metrics`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }),
          ]);

          const profilePayload = await profileResponse.json().catch(() => ({}));
          const metricsPayload = await metricsResponse.json().catch(() => ({}));

          if (!profileResponse.ok) {
            throw new Error(String(profilePayload?.error || 'Failed to load profile'));
          }

          if (!metricsResponse.ok) {
            throw new Error(String(metricsPayload?.error || 'Failed to load metrics'));
          }

          const loadedProfile = (profilePayload?.profile || profilePayload?.user || profilePayload || {}) as any;
          const loadedMetrics = (metricsPayload?.metrics || metricsPayload || {}) as any;

          setProfile(loadedProfile as UserProfile);
          setMetrics({
            alertCompressionRatio: Number(loadedMetrics?.alertCompressionRatio ?? 0),
            ticketReductionRate: Number(loadedMetrics?.ticketReductionRate ?? 0),
            mttrImprovement: Number(loadedMetrics?.mttrImprovement ?? 0),
            automationCoverage: Number(loadedMetrics?.automationCoverage ?? 0),
          });

          setBalance(Number(loadedProfile?.balance ?? 0));
          const todayDate = new Date().toISOString().slice(0, 10);
          const loadedTodayProfit = String(loadedProfile?.todayProfitDate || '') === todayDate
            ? Number(loadedProfile?.todayProfit ?? 0)
            : 0;
          setTodaysProfit(loadedTodayProfit);
          setTotalEarnings(Number(loadedProfile?.totalEarnings ?? loadedProfile?.balance ?? 0));
          setProductsSubmitted(Number(loadedProfile?.productsSubmitted ?? 0));
          setAccountFrozen(Boolean(loadedProfile?.accountFrozen ?? false));
          setFreezeAmount(Number(loadedProfile?.freezeAmount ?? 0));
          setActivePremiumAssignment(loadedProfile?.premiumAssignment ?? null);

          // Hydrate payment details from profile
          if (loadedProfile?.bankingDetails?.accountName) {
            setBankingDetails({
              accountName: String(loadedProfile.bankingDetails.accountName || ''),
              accountNumber: String(loadedProfile.bankingDetails.accountNumber || ''),
              routingNumber: String(loadedProfile.bankingDetails.routingNumber || ''),
              bankName: String(loadedProfile.bankingDetails.bankName || ''),
            });
          }
          if (loadedProfile?.cryptoWallet?.walletAddress) {
            setCryptoWallet({
              walletType: String(loadedProfile.cryptoWallet.walletType || 'Bitcoin'),
              walletAddress: String(loadedProfile.cryptoWallet.walletAddress || ''),
            });
          }

          // Check if user must change password (e.g., after credential reset by admin)
          if (Boolean(loadedProfile?.must_change_password ?? false)) {
            setShowPasswordChangeModal(true);
            setPasswordChangeForm({ newPassword: '', confirmPassword: '' });
            setPasswordChangeError('');
          }
          
          setError('');
        } catch (err: any) {
          const message = String(err?.message || 'Please try again in a moment.');
          setError(message);
        }

        // Fetch backend records only (approved/frozen submissions)
        try {
          const { projectId } = await import('~/utils/supabase/info');
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/records`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          const recordsData = await response.json().catch(() => ({}));
          const backendRecords = Array.isArray(recordsData?.records)
            ? recordsData.records.map((record: any) => ({
                id: String(record?.id || `record-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
                timestamp: String(record?.timestamp || ''),
                productName: String(record?.productName || 'Product Task'),
                productImage: String(record?.productImage || 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400'),
                totalAmount: Number(record?.totalAmount || 0),
                profit: Number(record?.profit || 0),
                status: (['approved', 'pending', 'frozen'].includes(String(record?.status || '').toLowerCase())
                  ? String(record?.status || '').toLowerCase()
                  : 'approved') as 'approved' | 'pending' | 'frozen',
              }))
            : [];
          setProductRecords(backendRecords);
          setAssignedProducts([]);
        } catch {
          setProductRecords([]);
          setAssignedProducts([]);
        }
    };
    fetchData().finally(() => {
      if (manualRefreshToken === 0) {
        setIsLoading(false);
      }
      setIsManualRefreshing(false);
    });
  }, [accessToken, manualRefreshToken]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setManualRefreshToken((prev) => prev + 1);
    }, 45000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (depositMethod !== 'crypto') {
      return;
    }

    const assets = getDepositCryptoAssets(depositConfig);
    const selectedAsset = assets.find((item) => String(item?.asset || '').toUpperCase() === String(depositCryptoAsset || '').toUpperCase())
      || assets[0]
      || null;

    if (!selectedAsset) {
      return;
    }

    const networks = Array.isArray(selectedAsset.networks) && selectedAsset.networks.length > 0
      ? selectedAsset.networks
      : [selectedAsset.network].filter(Boolean) as string[];

    if (networks.length > 0 && !networks.includes(depositCryptoNetwork)) {
      setDepositCryptoNetwork(networks[0]);
    }
  }, [depositMethod, depositConfig, depositCryptoAsset, depositCryptoNetwork]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !metrics) {
    // If demo mode is enabled, show demo data
    if (demoMode) {
      const demoProfile: UserProfile = {
        id: 'demo-123',
        email: 'demo@tanknewmedia.com',
        invitationCode: 'DEMO1',
        name: 'Demo User',
        vipTier: 'Silver',
        creditScore: 100,
        createdAt: new Date().toISOString(),
      };
      const demoMetrics: Metrics = {
        alertCompressionRatio: 73,
        ticketReductionRate: 62,
        mttrImprovement: 23,
        automationCoverage: 78,
      };
      
      // Temporarily set demo data
      if (!profile) setProfile(demoProfile);
      if (!metrics) setMetrics(demoMetrics);
      
      // Continue to render dashboard below
      return null; // Will render dashboard below
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Data is temporarily unavailable</h2>
            <p className="text-gray-600">{error || 'Please try again in a moment.'}</p>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setDemoMode(true)} variant="default" className="w-full">
                Continue
              </Button>
              <Button onClick={onLogout} variant="outline" className="w-full">
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use demo data if in demo mode
  const displayProfile = demoMode && !profile ? {
    id: 'demo-123',
    email: 'demo@tanknewmedia.com',
    invitationCode: 'DEMO1',
    name: 'Demo User',
    vipTier: 'Silver',
    creditScore: 100,
    createdAt: new Date().toISOString(),
  } : profile!;

  const displayMetrics = demoMode && !metrics ? {
    alertCompressionRatio: 73,
    ticketReductionRate: 62,
    mttrImprovement: 23,
    automationCoverage: 78,
  } : metrics!;

  const formatUsdFigure = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const hasDecimals = Math.abs(safeValue % 1) > 0;
    return `${safeValue.toLocaleString(undefined, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })} USD`;
  };

  const totalAccountBalanceValue = Number(balance || 0);
  const premiumProjectedProfitValue = Number(
    (activePremiumAssignment as any)?.potentialProfit
    ?? premiumProfitBeforeFreeze
    ?? 0,
  );
  const currentBalanceBeforePremiumRaw = Number(
    (displayProfile as any)?.premiumAssignment?.previousBalance
    ?? (displayProfile as any)?.principalBalance
    ?? totalAccountBalanceValue,
  );
  const currentBalanceBeforePremiumValue = Math.max(0, currentBalanceBeforePremiumRaw);
  const upholdAmountMagnitudeValue = Number(
    accountFrozen
      ? Math.max(
          Number(freezeAmount || 0),
          Number((activePremiumAssignment as any)?.topUpRequired || 0),
          Math.abs(Math.min(totalAccountBalanceValue, 0)),
        )
      : 0,
  );
  const upholdAmountValue = accountFrozen ? -Math.abs(upholdAmountMagnitudeValue) : 0;
  const projectedTotalAccountBalanceValue = Number(
    accountFrozen
      ? currentBalanceBeforePremiumValue + upholdAmountMagnitudeValue + premiumProjectedProfitValue
      : totalAccountBalanceValue,
  );
  const todaysCommissionValue = Number(
    accountFrozen
      ? Number(todaysProfit || 0) + premiumProjectedProfitValue
      : Number(todaysProfit || 0),
  );
  const creditScoreValue = Math.max(0, Math.min(100, Number((displayProfile as any)?.creditScore ?? 100)));
  const creditScoreOffset = 2 * Math.PI * 40 * (1 - creditScoreValue / 100);

  const openFaqSection = () => {
    setShowFAQ(true);
    setActiveNav('home');
    setTimeout(() => {
      const faqSection = document.getElementById('faq-knowledge-section');
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const submitDepositRequest = async () => {
    const amount = Number(depositAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setUiNotice({ type: 'error', text: 'Please enter a valid deposit amount.' });
      return;
    }

    if (depositConfig && amount < Number(depositConfig.minimumAmount || 0)) {
      setUiNotice({ type: 'error', text: `Minimum deposit amount is $${Number(depositConfig.minimumAmount).toFixed(2)}.` });
      return;
    }

    const cryptoAssets = getDepositCryptoAssets(depositConfig);
    const selectedCryptoAssetConfig = cryptoAssets.find((item) => String(item?.asset || '').toUpperCase() === String(depositCryptoAsset || '').toUpperCase())
      || cryptoAssets[0]
      || null;
    const selectedCryptoNetworks = Array.isArray(selectedCryptoAssetConfig?.networks) && selectedCryptoAssetConfig.networks.length > 0
      ? selectedCryptoAssetConfig.networks
      : [selectedCryptoAssetConfig?.network].filter(Boolean) as string[];
    const cryptoNetworkToSubmit = selectedCryptoNetworks.includes(depositCryptoNetwork)
      ? depositCryptoNetwork
      : (selectedCryptoNetworks[0] || selectedCryptoAssetConfig?.network || depositConfig?.crypto?.network || null);

    if (depositMethod === 'crypto') {
      const sourceWalletAddress = String(depositSourceWalletAddress || cryptoWallet.walletAddress || '').trim();
      if (!sourceWalletAddress) {
        setUiNotice({ type: 'error', text: 'Please enter your wallet address for crypto deposit.' });
        return;
      }

      if (!(selectedCryptoAssetConfig?.walletAddress || depositConfig?.crypto?.walletAddress)) {
        setUiNotice({ type: 'error', text: 'Crypto destination wallet is not configured. Please contact support.' });
        return;
      }
    }

    try {
      setIsSubmittingDeposit(true);
      const { projectId } = await import('~/utils/supabase/info');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/deposits/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: depositMethod,
          amount,
          reference: depositMethod === 'crypto' ? depositTxHash : depositReference,
          transactionHash: depositMethod === 'crypto' ? (depositTxHash.trim() || null) : null,
          sourceWalletAddress: depositMethod === 'crypto'
            ? (depositSourceWalletAddress || cryptoWallet.walletAddress || null)
            : null,
          destinationWalletAddress: depositMethod === 'crypto'
            ? (selectedCryptoAssetConfig?.walletAddress || depositConfig?.crypto?.walletAddress || null)
            : null,
          cryptoAsset: depositMethod === 'crypto'
            ? (selectedCryptoAssetConfig?.asset || depositCryptoAsset || null)
            : null,
          cryptoNetwork: depositMethod === 'crypto'
            ? cryptoNetworkToSubmit
            : null,
          note: depositNote,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUiNotice({ type: 'error', text: `${data?.error || 'Unable to submit deposit request.'}` });
        return;
      }

      setUiNotice({ type: 'success', text: 'Deposit request submitted. Customer Service/Admin will review it shortly.' });
      setDepositAmount('');
      setDepositReference('');
      setDepositTxHash('');
      setDepositSourceWalletAddress('');
      setDepositNote('');
      setShowDepositModal(false);
    } catch {
      setUiNotice({ type: 'error', text: 'Unable to submit deposit request right now.' });
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const avatarSrc = displayProfile.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(displayProfile.name || 'user')}`;
  const profileInitial = (displayProfile.name || 'U').trim().charAt(0).toUpperCase();
  const availableCryptoAssets = getDepositCryptoAssets(depositConfig);
  const selectedCryptoAssetConfig = availableCryptoAssets.find((item) => String(item?.asset || '').toUpperCase() === String(depositCryptoAsset || '').toUpperCase())
    || availableCryptoAssets[0]
    || null;
  const availableCryptoNetworks = Array.isArray(selectedCryptoAssetConfig?.networks) && selectedCryptoAssetConfig.networks.length > 0
    ? selectedCryptoAssetConfig.networks
    : [selectedCryptoAssetConfig?.network].filter(Boolean) as string[];
  const displayCryptoNetwork = availableCryptoNetworks.includes(depositCryptoNetwork)
    ? depositCryptoNetwork
    : (availableCryptoNetworks[0] || selectedCryptoAssetConfig?.network || depositConfig?.crypto?.network || cryptoWallet.walletType);

  return (
    <div className="min-h-screen bg-gray-50">
      {uiNotice && (
        <div className="fixed top-4 right-4 z-[80] max-w-md w-[calc(100%-2rem)]">
          <div className={`rounded-lg border px-4 py-3 shadow-lg ${uiNotice.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{uiNotice.text}</p>
              <button
                type="button"
                className="text-xs opacity-70 hover:opacity-100"
                onClick={() => setUiNotice(null)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-[88vw] max-w-[380px] bg-gradient-to-br from-[#0f1629] via-[#162040] to-[#0f1629] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with User Info */}
            <div className="relative bg-gradient-to-br from-blue-600/30 to-indigo-700/30 px-5 pt-6 pb-5 border-b border-white/5" style={{ paddingTop: 'max(env(safe-area-inset-top), 1.25rem)' }}>
              {/* Close Button */}
              <button 
                onClick={() => setShowMenu(false)} 
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all duration-200 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* User Avatar and Info */}
              <div className="flex items-start space-x-3 mb-5 pr-11">
                <div className="w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center ring-3 ring-white/10">
                  {!avatarError ? (
                    <img
                      src={avatarSrc}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span className="text-blue-900 font-bold text-lg">{profileInitial}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base leading-tight break-words">{displayProfile.name}</h3>
                  <div className="mt-2 bg-white/5 rounded-xl p-2.5 space-y-1.5 border border-white/5">
                    <p className="text-blue-200/80 text-xs">
                      <span className="font-semibold text-blue-100/90">Member ID:</span>{' '}
                      <span className="font-mono tracking-wide">{displayProfile.id.substring(0, 6).toUpperCase()}</span>
                    </p>
                    <p className="text-blue-200/80 text-xs">
                      <span className="font-semibold text-blue-100/90">Invite Code:</span>{' '}
                      <span className="font-mono tracking-wide">{displayProfile.invitationCode || 'Not assigned'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats and Credit Score */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3.5 border border-white/5">
                <div className="flex justify-between items-start">
                  {/* Left side - Stats */}
                  <div className="space-y-2.5 flex-1">
                    <div>
                      <p className="text-blue-300/70 text-[10px] uppercase tracking-[0.12em] font-medium">Today's Commission</p>
                      <p className="text-emerald-300 font-bold tabular-nums text-[1.08rem] leading-none">${todaysProfit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-blue-300/70 text-[10px] uppercase tracking-[0.12em] font-medium">Total Account Balance</p>
                      <p className="text-white font-bold tabular-nums text-[1.08rem] leading-none">${balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-blue-300/70 text-[10px] uppercase tracking-[0.12em] font-medium">Current Balance</p>
                      <p className="text-white font-bold tabular-nums text-[1.08rem] leading-none">${Math.max(0, currentBalanceBeforePremiumValue).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Right side - Credit Score Circle */}
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#1e3a8a"
                        strokeWidth="8"
                        fill="none"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#22c55e"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={creditScoreOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-bold text-xl">{Math.round(creditScoreValue)}%</span>
                      <span className="text-blue-200 text-xs">Credit</span>
                      <span className="text-blue-200 text-xs">Score</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items - Light Background */}
            <div ref={menuScrollRef} className="flex-1 overflow-y-auto bg-gray-50/95 px-4 py-4 space-y-5">
              {/* Sticky Quick Actions */}
              <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm pb-3 border-b border-gray-100">
                <h4 className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-2">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setActiveNav('analytics');
                    }}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-2 border border-gray-100 active:scale-[0.97]"
                  >
                    <span className="text-lg">📤</span>
                    <span className="text-gray-900 font-semibold text-sm">Upload</span>
                  </button>
                  <button 
                    onClick={() => setShowWithdrawalModal(true)}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-2 border border-gray-100 active:scale-[0.97]"
                  >
                    <span className="text-lg">💵</span>
                    <span className="text-gray-900 font-semibold text-sm">Cash Out</span>
                  </button>
                </div>
              </div>

              {/* Quick Access Grid */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowMemberID(true);
                  }}
                  className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left active:scale-[0.97] border border-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🆔</span>
                    <span className="text-gray-900 font-medium text-sm">Member ID</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowActivity(true);
                  }}
                  className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left active:scale-[0.97] border border-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🎟️</span>
                    <span className="text-gray-900 font-medium text-sm">Event</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowAboutUs(true);
                  }}
                  className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left active:scale-[0.97] border border-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">ℹ️</span>
                    <span className="text-gray-900 font-medium text-sm">About Us</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowCertificate(true);
                  }}
                  className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left active:scale-[0.97] border border-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📜</span>
                    <span className="text-gray-900 font-medium text-sm">Cert</span>
                  </div>
                </button>
              </div>

              {/* Profit Sharing Section */}
              <div>
                <h4 className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-2">💰 Profit Sharing</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowEarnings(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-emerald-100 active:scale-[0.97]"
                  >
                    <span className="text-xl">💵</span>
                    <span className="text-gray-900 font-medium">My Earnings</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowReferrals(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-violet-100 active:scale-[0.97]"
                  >
                    <span className="text-xl">👥</span>
                    <span className="text-gray-900 font-medium">My Referrals</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowWithdrawal(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-rose-100 active:scale-[0.97]"
                  >
                    <span className="text-xl">💸</span>
                    <span className="text-gray-900 font-medium">Request Withdrawal</span>
                  </button>

                </div>
              </div>

              {/* Profile Section */}
              <div>
                <h4 className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-2">Profile</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setActiveNav('settings');
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">✏️</span>
                    <span className="text-gray-900 font-medium">Edit Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setActiveNav('settings');
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">💳</span>
                    <span className="text-gray-900 font-medium">Financial Information</span>
                  </button>
                </div>
              </div>

              {/* Others Section */}
              <div>
                <h4 className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-2">Others</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      openFaqSection();
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">❓</span>
                    <span className="text-gray-900 font-medium">FAQ & Knowledge Base</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowLiveChat(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">💬</span>
                    <span className="text-gray-900 font-medium">Live Chat Support</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowSupportTickets(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">🎫</span>
                    <span className="text-gray-900 font-medium">Support Tickets</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowChat(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">📞</span>
                    <span className="text-gray-900 font-medium">Contact Us</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowBonusPayouts(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">🎁</span>
                    <span className="text-gray-900 font-medium">Bonus Payouts</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowAnalytics(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">📊</span>
                    <span className="text-gray-900 font-medium">Analytics Dashboard</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowLeaderboard(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">🏆</span>
                    <span className="text-gray-900 font-medium">Top Referrers</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowEmailPreferences(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">📧</span>
                    <span className="text-gray-900 font-medium">Email Preferences</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowNotifications(true);
                    }}
                    className="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-left flex items-center space-x-3 border border-gray-50 active:scale-[0.97]"
                  >
                    <span className="text-xl">🔔</span>
                    <span className="text-gray-900 font-medium">Notification</span>
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <button className="flex items-center space-x-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                  <span className="text-sm">🌐 Translate</span>
                </button>
                <button className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                  <span className="text-sm font-medium">EN</span>
                </button>
              </div>

              {/* Sign Out */}
              <button 
                onClick={onLogout}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}>
          <div 
            className="absolute right-4 top-16 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900 mb-3">Notifications</h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Welcome to {branding.appName}!</p>
                <p className="text-xs text-gray-600 mt-1">Your account has been activated</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">VIP Status Updated</p>
                <p className="text-xs text-gray-600 mt-1">You are now a {displayProfile.vipTier} member</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">New Features Available</p>
                <p className="text-xs text-gray-600 mt-1">Check out the latest updates</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dark Header */}
      <header className="bg-gradient-to-r from-[#0f1629] to-[#1a1d2e] text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95" 
            onClick={() => setShowMenu(!showMenu)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-wider">{branding.logoText}</h1>
          <div className="flex items-center space-x-2">
            <button
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95"
              onClick={() => setManualRefreshToken((prev) => prev + 1)}
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
              disabled={isManualRefreshing}
            >
              <RefreshCw className={`h-5 w-5 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              className="p-1 hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95"
              onClick={() => setShowMenu(true)}
              aria-label="Open profile"
            >
              <div className="relative w-9 h-9 rounded-full border-2 border-white/40 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center ring-2 ring-white/10">
                {!avatarError ? (
                  <img
                    src={avatarSrc}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </div>
            </button>
            <button 
              className="p-2 relative hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95" 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-6 w-6" />
              <span className="absolute top-1.5 right-1.5 bg-red-500 rounded-full w-2 h-2 ring-2 ring-[#1a1d2e]"></span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Hero Section with Background Image */}
      {activeNav === 'home' && (
        <div className="relative h-56 overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
          </div>
          <motion.div 
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.08"/>
                </pattern>
              </defs>
              <rect width="1000" height="400" fill="url(#grid)" />
            </svg>
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50"></div>
          <div className="absolute top-4 left-0 right-0 overflow-hidden">
            <motion.div 
              className="hidden sm:inline-flex items-center space-x-4 glass text-white px-5 py-2.5 rounded-full whitespace-nowrap border border-white/10"
              initial={{ x: '100%' }}
              animate={{ x: '-100%' }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
              <Bell className="h-4 w-4 text-cyan-300 flex-shrink-0" />
              <span className="text-sm font-medium">{branding.tickerText}</span>
              <Bell className="h-4 w-4 text-cyan-300 flex-shrink-0" />
              <span className="text-sm font-medium">{branding.tickerText}</span>
            </motion.div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={activeNav === 'home' ? 'px-4 pb-24 -mt-16 relative z-10' : 'pb-24'}>
        {activeNav === 'analytics' && (
          <ProductsView
            vipTier={testVIPTier || displayProfile.vipTier}
            balance={balance}
            productsSubmitted={productsSubmitted}
            currentSetTasksCompleted={Number(displayProfile.currentSetTasksCompleted ?? 0)}
            taskSetsCompletedToday={Number(displayProfile.taskSetsCompletedToday ?? 0)}
            dailyTaskSetLimit={Number(displayProfile.dailyTaskSetLimit ?? 1)}
            extraTaskSets={Number(displayProfile.extraTaskSets ?? 0)}
            onSubmitProduct={handleSubmitProduct}
            onStartProduct={handleStartProduct}
            todaysProfit={todaysProfit}
            accountFrozen={accountFrozen}
            freezeAmount={freezeAmount}
            activePremiumAssignment={activePremiumAssignment}
            onContactSupport={() => setShowChat(true)}
            actionNotice={taskActionNotice}
            onClearActionNotice={() => setTaskActionNotice(null)}
          />
        )}
        
        {activeNav === 'home' && (
          <>
            {/* Open and Extensible Card */}
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                  Open and extensible
                </h2>
                <p className="text-sm text-gray-500 text-center leading-relaxed">
                  {branding.homeCardBody}
                </p>
              </CardContent>
            </Card>

            {/* Home Financial Summary */}
            <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-br from-[#0c5b8e] to-[#064a73] text-white shadow-xl">
              <CardContent className="p-0">
                {accountFrozen && (
                  <div className="border-b border-white/35 bg-[#0a4f7b] px-6 py-4 text-center">
                    <p className="mx-auto inline-flex items-center rounded-full border border-red-300/60 bg-red-500/20 px-3 py-1 text-xs font-bold tracking-wide text-red-100">
                      ACCOUNT TEMPORARILY FROZEN
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-wide text-white/95">
                      Your account is temporarily frozen due to a premium product. Complete the required action to unlock and receive your profit.
                    </p>
                  </div>
                )}

                <div className="px-6 py-6">
                  <div className="mb-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Financial Summary</p>
                    <h3 className="mt-2 text-[1.7rem] sm:text-3xl font-black tracking-wide leading-tight">Clear Account Snapshot</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <Rocket className="h-8 w-8 text-emerald-200" />
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Today&apos;s Commission</p>
                      </div>
                      <p className="mt-2 text-[1.75rem] sm:text-3xl font-black tabular-nums leading-none text-emerald-100">{formatUsdFigure(todaysCommissionValue)}</p>
                      <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-white/80">Includes today&apos;s realized earnings.</p>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-8 w-8 text-white/95" />
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Total Account Balance</p>
                      </div>
                      <p className="mt-2 text-[1.75rem] sm:text-3xl font-black tabular-nums leading-none text-white">{formatUsdFigure(projectedTotalAccountBalanceValue)}</p>
                      <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-white/80">Current balance plus premium release projection.</p>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-8 w-8 text-white/95" />
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Current Balance</p>
                      </div>
                      <p className="mt-2 text-[1.75rem] sm:text-3xl font-black tabular-nums leading-none text-white">{formatUsdFigure(currentBalanceBeforePremiumValue)}</p>
                      <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-white/80">Base balance before premium settlement adjustments.</p>
                    </div>

                    <div className="rounded-2xl border border-red-300/40 bg-red-500/20 p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <Snowflake className="h-8 w-8 text-red-100" />
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-red-100">Uphold Amount</p>
                      </div>
                      <p className="mt-2 text-[1.75rem] sm:text-3xl font-black tabular-nums leading-none text-red-100">{formatUsdFigure(upholdAmountValue)}</p>
                      <p className="mt-2 text-[11px] sm:text-xs font-semibold leading-relaxed text-red-100">Negative deficit held during premium freeze.</p>
                    </div>
                  </div>

                  {accountFrozen && premiumProjectedProfitValue > 0 && (
                    <div className="mt-4 rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-emerald-100">
                        Expected premium profit after unfreeze: +{formatUsdFigure(Math.abs(premiumProjectedProfitValue))}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => setActiveNav('analytics')}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                Submit Products & Earn
              </Button>
              <Button
                onClick={() => {
                  setDepositSourceWalletAddress(cryptoWallet.walletAddress || '');
                  const modalAssets = getDepositCryptoAssets(depositConfig);
                  const modalDefaultAssetCode = String(
                    depositConfig?.crypto?.defaultAsset
                    || modalAssets?.[0]?.asset
                    || 'BTC'
                  ).toUpperCase();
                  const modalSelectedAsset = modalAssets.find((item) => String(item.asset || '').toUpperCase() === modalDefaultAssetCode) || modalAssets[0] || null;
                  setDepositCryptoAsset(String(modalSelectedAsset?.asset || modalDefaultAssetCode || 'BTC').toUpperCase());
                  setDepositCryptoNetwork(String(modalSelectedAsset?.network || modalSelectedAsset?.networks?.[0] || 'Bitcoin'));
                  setShowDepositModal(true);
                }}
                variant="outline"
                size="lg"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Deposit Funds (Bank/Crypto)
              </Button>
            </div>

            {/* VIP Levels Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Vip Levels</h3>
                <button 
                  onClick={() => setShowVIPCarousel(true)}
                  className="flex items-center text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors"
                >
                  View More
                  <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* VIP Tier Preview Cards - Responsive Grid */}
              <div className="-mx-4 px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pb-2">
                  {/* Normal Tier */}
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg overflow-hidden border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold">Normal</h4>
                          <span className="text-lg">👑</span>
                        </div>
                        <span className="text-2xl font-bold">$99</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        <li className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>Profits of <strong>0.5%</strong> per product - <strong>35</strong> products per set.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>Access to other premium features</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Silver Tier */}
                  <Card className="bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-lg overflow-hidden border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold">Silver</h4>
                          <span className="text-lg">💎</span>
                        </div>
                        <span className="text-2xl font-bold">$399</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        <li className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>Profits of <strong>0.75%</strong> per product - <strong>40</strong> products per set.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>Access to other premium features</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Gold Tier */}
                  <Card className="bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg overflow-hidden border-0 ring-2 ring-amber-300/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold">Gold</h4>
                          <span className="text-lg">⭐</span>
                          {displayProfile.vipTier === 'Gold' && (
                            <span className="bg-white text-gray-900 px-2 py-0.5 rounded-full text-xs font-bold">Current</span>
                          )}
                        </div>
                        <span className="text-2xl font-bold">$999</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        <li className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>Profits of <strong>1%</strong> per product - <strong>45</strong> products per set.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>Access to other premium features</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Metrics Section */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="shadow-sm border-0 bg-gradient-to-br from-cyan-50 to-blue-50 card-hover">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs font-medium text-gray-500 mb-2">Compress alerts by</p>
                  <p className="text-5xl font-bold text-blue-600">{displayMetrics.alertCompressionRatio}%</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-gradient-to-br from-pink-50 to-rose-50 card-hover">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs font-medium text-gray-500 mb-2">Identify critical alerts in</p>
                  <p className="text-5xl font-bold text-rose-500">{displayMetrics.mttrImprovement}s</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-teal-50 card-hover">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs font-medium text-gray-500 mb-2">Reduce ServiceNow tickets by</p>
                  <p className="text-3xl font-bold text-emerald-600">{displayMetrics.ticketReductionRate}%</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-gradient-to-br from-violet-50 to-purple-50 card-hover">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs font-medium text-gray-500 mb-2">Save up to</p>
                  <p className="text-3xl font-bold text-violet-600">{displayMetrics.automationCoverage}%</p>
                </CardContent>
              </Card>
            </div>

            {showFAQ && (
              <section id="faq-knowledge-section" className="mb-6 scroll-mt-24">
                <Card className="overflow-hidden border border-blue-100 shadow-lg">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">FAQ & Knowledge Base</h3>
                        <p className="text-xs text-white/90">Get quick answers without leaving your dashboard.</p>
                      </div>
                      <button
                        onClick={() => setShowFAQ(false)}
                        className="rounded-lg border border-white/40 px-3 py-1 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                  <CardContent className="px-5 py-5">
                    <FAQ
                      accessToken={accessToken}
                      onCreateSupportTicket={() => {
                        setShowFAQ(false);
                        setShowSupportTickets(true);
                      }}
                      onStartLiveChat={() => {
                        setShowFAQ(false);
                        setShowLiveChat(true);
                      }}
                    />
                  </CardContent>
                </Card>
              </section>
            )}
          </>
        )}

        {activeNav === 'reports' && (
          <div className="px-4">
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Records</h2>
                <p className="text-gray-600 mb-6">View your submission history and earnings records</p>
                <div className="space-y-3">
                  {productsSubmitted > 0 ? (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-900">Total Submissions</p>
                            <p className="text-sm text-gray-600 mt-1">{productsSubmitted} products</p>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">${totalEarnings.toFixed(2)}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setShowRecords(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        View All Records
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No records yet. Start submitting products!</p>
                      <Button 
                        onClick={() => setActiveNav('analytics')}
                        className="mt-4"
                      >
                        Go to Products
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeNav === 'settings' && (
          <div className="px-4">
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{displayProfile.name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Contact Email</p>
                    <p className="font-semibold text-gray-900">{displayProfile.contactEmail || 'Not set'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Invitation Code</p>
                    <p className="font-semibold text-gray-900 font-mono tracking-wide">{displayProfile.invitationCode || 'Not assigned'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Last Login Country</p>
                    <p className="font-semibold text-gray-900">{displayProfile.lastLoginCountry || 'Unknown'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Last Login Time</p>
                    <p className="font-semibold text-gray-900">
                      {displayProfile.lastLoginAt ? new Date(displayProfile.lastLoginAt).toLocaleString() : 'Not available'}
                    </p>
                  </div>

                  {/* Account Credentials Section */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🔐 Account Credentials</h3>
                    
                    {!editingSettings ? (
                      <button
                        onClick={() => {
                          setSettingsForm((prev) => ({
                            ...prev,
                            username: displayProfile.name || prev.username,
                            contactEmail: displayProfile.contactEmail || '',
                          }));
                          setEditingSettings(true);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit Account Settings
                      </button>
                    ) : (
                      <div className="space-y-3 bg-white p-4 rounded-lg border-2 border-blue-300">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                          <input
                            type="text"
                            value={settingsForm.username}
                            onChange={(e) => setSettingsForm({...settingsForm, username: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter new username"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Email (Optional)</label>
                          <input
                            type="email"
                            value={settingsForm.contactEmail}
                            onChange={(e) => setSettingsForm({...settingsForm, contactEmail: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter email for notifications"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Login Password</label>
                          <input
                            type="password"
                            value={settingsForm.loginPassword}
                            onChange={(e) => setSettingsForm({...settingsForm, loginPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter new login password (leave blank to keep current)"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Login Password</label>
                          <input
                            type="password"
                            value={settingsForm.confirmLoginPassword}
                            onChange={(e) => setSettingsForm({...settingsForm, confirmLoginPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Confirm login password"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Withdrawal Password</label>
                          <input
                            type="password"
                            value={settingsForm.withdrawalPassword}
                            onChange={(e) => setSettingsForm({...settingsForm, withdrawalPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter new withdrawal password (leave blank to keep current)"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Withdrawal Password</label>
                          <input
                            type="password"
                            value={settingsForm.confirmWithdrawalPassword}
                            onChange={(e) => setSettingsForm({...settingsForm, confirmWithdrawalPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Confirm withdrawal password"
                          />
                        </div>
                        
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={async () => {
                              if (settingsForm.loginPassword !== settingsForm.confirmLoginPassword) {
                                setUiNotice({ type: 'error', text: 'Login passwords do not match' });
                                return;
                              }
                              if (settingsForm.withdrawalPassword !== settingsForm.confirmWithdrawalPassword) {
                                setUiNotice({ type: 'error', text: 'Withdrawal passwords do not match' });
                                return;
                              }

                              const normalizedContactEmail = settingsForm.contactEmail.trim().toLowerCase();
                              if (normalizedContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContactEmail)) {
                                setUiNotice({ type: 'error', text: 'Invalid contact email format' });
                                return;
                              }

                              if (!demoMode) {
                                try {
                                  const { projectId, publicAnonKey } = await import('~/utils/supabase/info');
                                  const baseHeaders = {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'apikey': publicAnonKey,
                                  };
                                  const fnBase = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3`;

                                  // Save contact email
                                  const saveResponse = await fetch(`${fnBase}/profile/contact-email`, {
                                    method: 'PUT',
                                    headers: baseHeaders,
                                    body: JSON.stringify({ contactEmail: normalizedContactEmail || null }),
                                  });
                                  const saveData = await saveResponse.json().catch(() => ({}));
                                  if (!saveResponse.ok) {
                                    throw new Error(saveData?.error || 'Failed to update contact email');
                                  }
                                  setProfile((prev) => prev ? { ...prev, contactEmail: normalizedContactEmail || null } : prev);

                                  // Change login password if provided
                                  if (settingsForm.loginPassword) {
                                    const pwResp = await fetch(`${fnBase}/profile/change-password`, {
                                      method: 'PUT',
                                      headers: baseHeaders,
                                      body: JSON.stringify({ newPassword: settingsForm.loginPassword }),
                                    });
                                    const pwData = await pwResp.json().catch(() => ({}));
                                    if (!pwResp.ok) {
                                      throw new Error(pwData?.error || 'Failed to update login password');
                                    }
                                  }

                                  // Change withdrawal password if provided
                                  if (settingsForm.withdrawalPassword) {
                                    const wpResp = await fetch(`${fnBase}/profile/change-withdrawal-password`, {
                                      method: 'PUT',
                                      headers: baseHeaders,
                                      body: JSON.stringify({ newPin: settingsForm.withdrawalPassword }),
                                    });
                                    const wpData = await wpResp.json().catch(() => ({}));
                                    if (!wpResp.ok) {
                                      throw new Error(wpData?.error || 'Failed to update withdrawal password');
                                    }
                                  }
                                } catch (saveErr: any) {
                                  setUiNotice({ type: 'error', text: `${saveErr?.message || 'Failed to save settings'}` });
                                  return;
                                }
                              }

                              setSettingsForm((prev) => ({ ...prev, loginPassword: '', confirmLoginPassword: '', withdrawalPassword: '', confirmWithdrawalPassword: '' }));
                              setUiNotice({ type: 'success', text: 'Account settings updated successfully' });
                              setEditingSettings(false);
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingSettings(false)}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banking Details Section */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">💳 Banking Details</h3>
                    
                    {bankingDetails.accountName ? (
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300 space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold text-gray-700">Saved Bank Account</p>
                          <button
                            onClick={() => setShowBankingForm(!showBankingForm)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {showBankingForm ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                        <p className="text-sm"><strong>Bank:</strong> {bankingDetails.bankName}</p>
                        <p className="text-sm"><strong>Account Name:</strong> {bankingDetails.accountName}</p>
                        <p className="text-sm"><strong>Account #:</strong> ****{bankingDetails.accountNumber.slice(-4)}</p>
                        <p className="text-sm"><strong>Routing #:</strong> {bankingDetails.routingNumber}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowBankingForm(true)}
                        className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        ➕ Add Banking Details
                      </button>
                    )}
                    
                    {showBankingForm && (
                      <div className="mt-3 space-y-2 bg-white p-4 rounded-lg border-2 border-green-300">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={bankingDetails.bankName}
                            onChange={(e) => setBankingDetails({...bankingDetails, bankName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g., Chase Bank"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                          <input
                            type="text"
                            value={bankingDetails.accountName}
                            onChange={(e) => setBankingDetails({...bankingDetails, accountName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Full name on account"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                          <input
                            type="password"
                            value={bankingDetails.accountNumber}
                            onChange={(e) => setBankingDetails({...bankingDetails, accountNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Your account number (encrypted)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Routing Number</label>
                          <input
                            type="text"
                            value={bankingDetails.routingNumber}
                            onChange={(e) => setBankingDetails({...bankingDetails, routingNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Your routing number"
                          />
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={() => {
                              if (!bankingDetails.bankName || !bankingDetails.accountName || !bankingDetails.accountNumber || !bankingDetails.routingNumber) {
                                setUiNotice({ type: 'error', text: 'Please fill in all banking details' });
                                return;
                              }
                              (async () => {
                                try {
                                  const { projectId } = await import('~/utils/supabase/info');
                                  const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/profile/payment-details`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                                    body: JSON.stringify({ banking: bankingDetails }),
                                  });
                                  if (!resp.ok) {
                                    const d = await resp.json().catch(() => ({}));
                                    throw new Error(d?.error || 'Failed to save banking details');
                                  }
                                  setUiNotice({ type: 'success', text: 'Banking details saved securely' });
                                  setShowBankingForm(false);
                                } catch (e: any) {
                                  setUiNotice({ type: 'error', text: e?.message || 'Failed to save banking details' });
                                }
                              })();
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                          >
                            Save Bank Details
                          </button>
                          <button
                            onClick={() => setShowBankingForm(false)}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Crypto Wallet Section */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">₿ Crypto Wallet</h3>
                    
                    {cryptoWallet.walletAddress ? (
                      <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300 space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold text-gray-700">Saved Crypto Wallet</p>
                          <button
                            onClick={() => setShowCryptoForm(!showCryptoForm)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {showCryptoForm ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                        <p className="text-sm"><strong>Wallet Type:</strong> {cryptoWallet.walletType}</p>
                        <p className="text-sm break-all"><strong>Address:</strong> {cryptoWallet.walletAddress.slice(0, 12)}...{cryptoWallet.walletAddress.slice(-12)}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCryptoForm(true)}
                        className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        ➕ Add Crypto Wallet
                      </button>
                    )}
                    
                    {showCryptoForm && (
                      <div className="mt-3 space-y-2 bg-white p-4 rounded-lg border-2 border-purple-300">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Wallet Type</label>
                          <select
                            value={cryptoWallet.walletType}
                            onChange={(e) => setCryptoWallet({...cryptoWallet, walletType: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option>Bitcoin</option>
                            <option>Ethereum</option>
                            <option>USDC</option>
                            <option>Litecoin</option>
                            <option>Ripple (XRP)</option>
                            <option>Cardano</option>
                            <option>Solana</option>
                            <option>Polygon</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Wallet Address</label>
                          <input
                            type="text"
                            value={cryptoWallet.walletAddress}
                            onChange={(e) => setCryptoWallet({...cryptoWallet, walletAddress: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                            placeholder="Enter your crypto wallet address"
                          />
                        </div>
                        <p className="text-xs text-gray-600 italic">💡 Your wallet address is encrypted and secure. You can deposit/withdraw using this wallet.</p>
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={() => {
                              if (!cryptoWallet.walletAddress || cryptoWallet.walletAddress.length < 20) {
                                setUiNotice({ type: 'error', text: 'Please enter a valid wallet address' });
                                return;
                              }
                              (async () => {
                                try {
                                  const { projectId } = await import('~/utils/supabase/info');
                                  const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/profile/payment-details`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                                    body: JSON.stringify({ crypto: cryptoWallet }),
                                  });
                                  if (!resp.ok) {
                                    const d = await resp.json().catch(() => ({}));
                                    throw new Error(d?.error || 'Failed to save wallet');
                                  }
                                  setUiNotice({ type: 'success', text: 'Crypto wallet saved securely' });
                                  setShowCryptoForm(false);
                                } catch (e: any) {
                                  setUiNotice({ type: 'error', text: e?.message || 'Failed to save wallet' });
                                }
                              })();
                            }}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                          >
                            Save Wallet
                          </button>
                          <button
                            onClick={() => setShowCryptoForm(false)}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available Payment Methods */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">💰 Available Payment Methods</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-3 rounded-lg text-center font-medium ${bankingDetails.accountName ? 'bg-green-100 border-2 border-green-500 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        🏦 Bank Transfer
                        {bankingDetails.accountName && <p className="text-xs mt-1">✓ Available</p>}
                      </div>
                      <div className={`p-3 rounded-lg text-center font-medium ${cryptoWallet.walletAddress ? 'bg-purple-100 border-2 border-purple-500 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        ₿ Crypto
                        {cryptoWallet.walletAddress && <p className="text-xs mt-1">✓ Available</p>}
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f1629] to-[#1a1d2e] text-white shadow-2xl z-40 safe-bottom border-t border-white/5">
        <div className="grid grid-cols-4 gap-1 px-3 py-2.5">
          <button 
            className={`flex flex-col items-center space-y-0.5 py-1.5 rounded-xl transition-all duration-200 ${activeNav === 'home' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('home')}
          >
            <Home className={`h-5 w-5 ${activeNav === 'home' ? 'drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]' : ''}`} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-0.5 py-1.5 rounded-xl transition-all duration-200 ${activeNav === 'analytics' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('analytics')}
          >
            <BarChart3 className={`h-5 w-5 ${activeNav === 'analytics' ? 'drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]' : ''}`} />
            <span className="text-[10px] font-medium">Starting</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-0.5 py-1.5 rounded-xl transition-all duration-200 ${activeNav === 'reports' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('reports')}
          >
            <FileText className={`h-5 w-5 ${activeNav === 'reports' ? 'drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]' : ''}`} />
            <span className="text-[10px] font-medium">Reports</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-0.5 py-1.5 rounded-xl transition-all duration-200 ${activeNav === 'settings' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('settings')}
          >
            <Settings className={`h-5 w-5 ${activeNav === 'settings' ? 'drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]' : ''}`} />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>

      {/* Floating Chat Button */}
      <button 
        className="fixed bottom-20 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-5 py-3 shadow-xl hover:shadow-2xl flex items-center space-x-2 z-50 transition-all duration-200 active:scale-95 border border-white/10"
        onClick={() => setShowChat(true)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">Chat</span>
      </button>

      {/* Product Review Page */}
      {showReviewPage && currentProduct && (
        <ProductReviewPage
          product={currentProduct}
          onSubmit={handleReviewSubmit}
          onCancel={() => setShowReviewPage(false)}
        />
      )}

      {/* VIP Tiers Carousel Modal */}
      {showVIPCarousel && (
        <VIPTiersCarousel
          currentTier={displayProfile.vipTier}
          onClose={() => setShowVIPCarousel(false)}
        />
      )}

      {/* About Us Page */}
      {showAboutUs && (
        <AboutUsPage
          onClose={() => setShowAboutUs(false)}
        />
      )}

      {/* Member ID Page */}
      {showMemberID && (
        <MemberIDPage
          memberId={displayProfile.id.substring(0, 6).toUpperCase()}
          userName={displayProfile.name}
          invitationCode={displayProfile.invitationCode}
          onClose={() => setShowMemberID(false)}
        />
      )}

      {/* Certificate Page */}
      {showCertificate && (
        <CertificatePage
          onClose={() => setShowCertificate(false)}
        />
      )}

      {/* Activity Page */}
      {showActivity && (
        <ActivityPage
          onClose={() => setShowActivity(false)}
        />
      )}

      {/* Records Page */}
      {showRecords && (
        <RecordsPage
          records={productRecords}
          onClose={() => setShowRecords(false)}
        />
      )}

      {/* Product Submission Loader */}
      {showSubmissionLoader && submissionData && (
        <ProductSubmissionLoader
          productName={submissionData.productName}
          profit={submissionData.profit}
          rating={submissionData.rating}
          todaysTotal={submissionData.todaysTotal}
          onComplete={handleLoaderComplete}
        />
      )}

      {/* Customer Service Chat */}
      {showChat && (
        <CustomerServiceChat
          onClose={() => setShowChat(false)}
          accessToken={accessToken}
          userName={displayProfile.name}
          accountFrozen={accountFrozen}
          freezeAmount={freezeAmount}
        />
      )}

      {/* Unfreeze Success Modal */}
      <UnfreezeSuccessModal
        isOpen={showUnfreezeModal}
        onClose={() => setShowUnfreezeModal(false)}
        newBalance={unfreezeBalance}
      />

      {/* Account Freeze Modal */}
      <AccountFreezeModal
        isOpen={showFreezeModal}
        onClose={() => {
          setShowFreezeModal(false);
          setShowChat(true); // Auto-open customer service chat
        }}
        premiumAmount={freezePremiumAmount}
        currentBalance={balance}
        potentialProfit={premiumProfitBeforeFreeze}
      />

      {/* Withdrawal Password Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white">
              <h2 className="text-xl font-bold">Deposit Funds</h2>
              <p className="text-sm text-white/90">Choose Bank or Crypto and submit your deposit request</p>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                <Button variant={depositMethod === 'bank' ? 'default' : 'outline'} onClick={() => setDepositMethod('bank')}>
                  Bank Transfer
                </Button>
                <Button variant={depositMethod === 'crypto' ? 'default' : 'outline'} onClick={() => setDepositMethod('crypto')}>
                  Crypto
                </Button>
              </div>

              {depositMethod === 'bank' ? (
                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 space-y-1">
                  <p><strong>Bank:</strong> {depositConfig?.bank?.bankName || bankingDetails.bankName || 'N/A'}</p>
                  <p><strong>Account Name:</strong> {depositConfig?.bank?.accountName || bankingDetails.accountName || 'N/A'}</p>
                  <p><strong>Account Number:</strong> {depositConfig?.bank?.accountNumber || bankingDetails.accountNumber || 'N/A'}</p>
                  <p><strong>Routing Number:</strong> {depositConfig?.bank?.routingNumber || bankingDetails.routingNumber || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-2">{depositConfig?.bank?.instructions || 'Complete transfer and provide your reference.'}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 space-y-1">
                  {availableCryptoAssets.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <label className="text-sm font-medium text-gray-700">Crypto Asset</label>
                      <select
                        value={depositCryptoAsset}
                        onChange={(e) => {
                          const nextAsset = String(e.target.value || '').toUpperCase();
                          setDepositCryptoAsset(nextAsset);
                          const nextAssetConfig = availableCryptoAssets.find((item) => String(item?.asset || '').toUpperCase() === nextAsset) || null;
                          const nextNetworks = Array.isArray(nextAssetConfig?.networks) && nextAssetConfig.networks.length > 0
                            ? nextAssetConfig.networks
                            : [nextAssetConfig?.network].filter(Boolean) as string[];
                          if (nextNetworks.length > 0 && !nextNetworks.includes(depositCryptoNetwork)) {
                            setDepositCryptoNetwork(nextNetworks[0]);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                      >
                        {availableCryptoAssets.map((item) => (
                          <option key={item.asset} value={String(item.asset || '').toUpperCase()}>
                            {item.asset}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {availableCryptoNetworks.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <label className="text-sm font-medium text-gray-700">Network</label>
                      <select
                        value={displayCryptoNetwork}
                        onChange={(e) => setDepositCryptoNetwork(String(e.target.value || ''))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                      >
                        {availableCryptoNetworks.map((network) => (
                          <option key={network} value={network}>
                            {network}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <p><strong>Network:</strong> {displayCryptoNetwork}</p>
                  <p><strong>Wallet Address:</strong> {selectedCryptoAssetConfig?.walletAddress || depositConfig?.crypto?.walletAddress || cryptoWallet.walletAddress || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-2">{selectedCryptoAssetConfig?.instructions || depositConfig?.crypto?.instructions || 'Send funds to the address above and provide tx hash.'}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  min={depositConfig?.minimumAmount || 1}
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter amount"
                />
                {depositMethod === 'crypto' ? (
                  <>
                    <label className="text-sm font-medium text-gray-700">Your Wallet Address</label>
                    <input
                      type="text"
                      value={depositSourceWalletAddress}
                      onChange={(e) => setDepositSourceWalletAddress(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Sender wallet address"
                    />
                    <label className="text-sm font-medium text-gray-700">Transaction Hash (optional)</label>
                    <input
                      type="text"
                      value={depositTxHash}
                      onChange={(e) => setDepositTxHash(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Blockchain transaction hash"
                    />
                  </>
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-700">Reference</label>
                    <input
                      type="text"
                      value={depositReference}
                      onChange={(e) => setDepositReference(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Bank payment reference"
                    />
                  </>
                )}
                <label className="text-sm font-medium text-gray-700">Note (optional)</label>
                <textarea
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Add any extra details"
                />
              </div>
            </div>

              <div className="btn-container border-t border-gray-200 p-6 pt-4 bg-white">
                <div className="btn-group">
                <Button variant="outline" onClick={() => setShowDepositModal(false)}>
                  Cancel
                </Button>
                <Button className="btn-primary-action bg-blue-600 hover:bg-blue-700 text-white" onClick={submitDepositRequest} disabled={isSubmittingDeposit}>
                  {isSubmittingDeposit ? 'Submitting...' : 'Submit Deposit Request'}
                </Button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Withdrawal Password Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header - Blue gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-6">
              <h2 className="text-2xl font-bold text-white">Withdrawal Password</h2>
              <p className="text-blue-100 text-sm mt-1">Enter your withdrawal password to proceed</p>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Withdrawal Password</label>
                  <input
                    type="password"
                    value={withdrawalPassword}
                    onChange={(e) => setWithdrawalPassword(e.target.value)}
                    placeholder="Enter your withdrawal password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-gray-600 text-xs mt-1">This is your secure withdrawal password</p>
                </div>

                {/* Buttons */}
                <div className="btn-container pt-4">
                  <div className="btn-group">
                  <button
                    onClick={() => {
                      setShowWithdrawalModal(false);
                      setWithdrawalPassword('');
                    }}
                    className="min-w-0 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (withdrawalPassword.trim()) {
                        // TODO: Integrate with backend to process withdrawal
                        setUiNotice({ type: 'success', text: `Withdrawal initiated with password. Amount: $${balance.toFixed(2)}` });
                        setShowWithdrawalModal(false);
                        setWithdrawalPassword('');
                      } else {
                        setUiNotice({ type: 'error', text: 'Please enter your withdrawal password' });
                      }
                    }}
                    className="btn-primary-action min-w-0 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
                  >
                    Submit
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Dashboard Modal */}
      {showEarnings && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">My Earnings & Balance</h2>
                  <button
                    onClick={() => setShowEarnings(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {profile && (
                  <EarningsDashboard
                    accessToken={accessToken}
                    profile={profile}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Manager Modal */}
      {showReferrals && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">My Referrals Network</h2>
                  <button
                    onClick={() => setShowReferrals(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <ReferralManager accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawal && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Request Withdrawal</h2>
                  <button
                    onClick={() => setShowWithdrawal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <WithdrawalForm
                  accessToken={accessToken}
                  currentBalance={profile?.balance || 0}
                  withdrawalLimit={Number(profile?.withdrawalLimit ?? 0)}
                  onSuccess={() => {
                    setRefreshCounter(refreshCounter + 1);
                    // Could trigger refresh of earnings here
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forced Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Change Your Password</h2>
              <p className="text-sm text-amber-100 mt-1">Your account requires a password change for security reasons</p>
            </div>

            {/* Content */}
            <form onSubmit={handlePasswordChange} className="px-6 py-6 space-y-4">
              {passwordChangeError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700 font-medium">{passwordChangeError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordChangeForm.newPassword}
                  onChange={(e) => setPasswordChangeForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  disabled={passwordChangeLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordChangeForm.confirmPassword}
                  onChange={(e) => setPasswordChangeForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  disabled={passwordChangeLoading}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={passwordChangeLoading || !passwordChangeForm.newPassword}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {passwordChangeLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                ⚠️ You must change your password before access is granted to your account
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Email Preferences Modal */}
      {showEmailPreferences && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">📧 Email Notification Settings</h2>
                  <button
                    onClick={() => setShowEmailPreferences(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <EmailPreferences profile={profile} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">📊 Analytics Dashboard</h2>
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <AnalyticsDashboard accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referrers Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">🏆 Top Referrers Leaderboard</h2>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <ReferrersLeaderboard accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Payouts Modal */}
      {showBonusPayouts && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">🎁 Bonus Payouts & Rewards</h2>
                  <button
                    onClick={() => setShowBonusPayouts(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <BonusPayouts accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Tickets Modal */}
      {showSupportTickets && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-6 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">🎫 Support Tickets</h2>
                  <button
                    onClick={() => setShowSupportTickets(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <SupportTickets accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Chat Modal */}
      {showLiveChat && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">💬 Live Chat Support</h2>
                  <button
                    onClick={() => setShowLiveChat(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <LiveChat accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


