import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Menu,
  Bell,
  User,
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
import { FAQPage } from './FAQPage';
import { EarningsDashboard } from './EarningsDashboard';
import { ReferralManager } from './ReferralManager';
import { ProductSubmissionForm } from './ProductSubmissionForm';
import { WithdrawalForm } from './WithdrawalForm';
import { AdminWithdrawalDashboard } from './AdminWithdrawalDashboard';
import { MultiLevelEarnings } from './MultiLevelEarnings';
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
  productsSubmitted?: number;
}

interface Metrics {
  alertCompressionRatio: number;
  ticketReductionRate: number;
  mttrImprovement: number;
  automationCoverage: number;
}

interface GlobalPremiumConfig {
  enabled: boolean;
  position: number;
  amount: number;
}

interface DashboardProps {
  accessToken: string;
  onLogout: () => void;
}

export function Dashboard({ accessToken, onLogout }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [balance, setBalance] = useState(15334); // Initialize with starting balance
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
  const [productRecords, setProductRecords] = useState<RecordItem[]>([]);
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
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  
  // New profit sharing features
  const [showEarnings, setShowEarnings] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const [showProductSubmission, setShowProductSubmission] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showMultiLevelEarnings, setShowMultiLevelEarnings] = useState(false);
  const [showEmailPreferences, setShowEmailPreferences] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBonusPayouts, setShowBonusPayouts] = useState(false);
  const [showSupportTickets, setShowSupportTickets] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  const [refreshCounter, setRefreshCounter] = useState(0); // For refreshing earnings/referrals
  
  const [globalPremiumConfig, setGlobalPremiumConfig] = useState<GlobalPremiumConfig>({
    enabled: true,
    position: 27,
    amount: 10000,
  });
  
  // Withdrawal password modal state
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  
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

  const handleSubmitProduct = (productId: string, commission: number) => {
    setBalance(prev => prev + commission);
    setProductsSubmitted(prev => prev + 1);
    setTodaysProfit(prev => prev + commission);
  };

  const handleStartProduct = (product: ProductData) => {
    setCurrentProduct(product);
    setShowReviewPage(true);
  };

  const handleReviewSubmit = (rating: number, review: string, reviewType: string) => {
    if (!currentProduct) return;
    
    // Check if this submission triggers a global premium product
    const nextSubmissionCount = productsSubmitted + 1;
    const shouldTriggerGlobalPremium =
      globalPremiumConfig.enabled && nextSubmissionCount === globalPremiumConfig.position;
    
    if (shouldTriggerGlobalPremium) {
      // This is a premium product - trigger freeze
      const tier = testVIPTier || displayProfile.vipTier;
      
      // Use globally admin-set amount
      const premiumValue = globalPremiumConfig.amount;
      
      // Get commission rate based on tier
      const commissionRates: { [key: string]: number } = {
        'Normal': 0.005,
        'Silver': 0.0075,
        'Gold': 0.01,
        'Platinum': 0.0125,
        'Diamond': 0.015,
      };
      
      const baseCommission = premiumValue * (commissionRates[tier] || 0.01);
      const premiumProfit = baseCommission * 10; // 10x boost
      
      // Update product count first
      setProductsSubmitted(nextSubmissionCount);
      
      // Trigger premium product freeze
      handlePremiumSubmit(premiumValue, premiumProfit);
      
      // Close review page
      setShowReviewPage(false);
      return;
    }
    
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
    
    // Add profit
    handleSubmitProduct(`product-${Date.now()}`, currentProduct.profit);
    
    // Set submission data and show loader instead of alert
    setSubmissionData({
      productName: currentProduct.name,
      profit: currentProduct.profit,
      rating: rating,
      todaysTotal: todaysProfit + currentProduct.profit,
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

  const handlePremiumSubmit = (mergedValue: number, profit: number) => {
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
    setPremiumProfitBeforeFreeze(profit); // Store premium profit for later (10x commission)
    
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
      productName: `🌟 Premium Merged Product (FROZEN)`,
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

  useEffect(() => {
    const fetchData = async () => {
      // Check if using demo token
      if (accessToken === 'demo-token-12345') {
        console.log('Demo mode detected - skipping API calls');
        setDemoMode(true);
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('Attempting to connect to backend...');
        
        const { projectId, publicAnonKey } = await import('~/utils/supabase/info');



        // Fetch profile with timeout to fail fast
        const controller1 = new AbortController();
        const timeout1 = setTimeout(() => controller1.abort(), 5000);
        
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/profile`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            signal: controller1.signal,
          }
        ).finally(() => clearTimeout(timeout1));

        if (!profileResponse.ok) {
          console.log('Backend returned error status:', profileResponse.status);
          throw new Error('Backend not responding');
        }

        const profileData = await profileResponse.json();
        console.log('✅ Backend connected - Profile data received');
        setProfile(profileData.profile);

        // Fetch metrics with timeout
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 5000);
        
        const metricsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/metrics`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            signal: controller2.signal,
          }
        ).finally(() => clearTimeout(timeout2));

        if (!metricsResponse.ok) {
          throw new Error('Backend not responding');
        }

        const metricsData = await metricsResponse.json();
        console.log('✅ Metrics data received');
        setMetrics(metricsData.metrics);

        // Fetch global premium config
        try {
          const premiumConfigResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/premium/global-config`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'apikey': publicAnonKey,
              },
            }
          );

          if (premiumConfigResponse.ok) {
            const premiumConfigData = await premiumConfigResponse.json();
            if (premiumConfigData?.success && premiumConfigData?.config) {
              setGlobalPremiumConfig({
                enabled: Boolean(premiumConfigData.config.enabled),
                position: Number(premiumConfigData.config.position) || 27,
                amount: Number(premiumConfigData.config.amount) || 10000,
              });
            }
          }
        } catch {
          // Keep defaults if config fetch fails
        }
      } catch (err: any) {
        // Silently handle error - no console.error to prevent "Failed to fetch" showing
        console.log('ℹ️ Backend unavailable - activating Demo Mode');
        setError('');
        setDemoMode(true);
        
        // Set demo data immediately
        const demoProfile: UserProfile = {
          id: 'demo-123',
          email: 'demo@tanknewmedia.com',
          invitationCode: 'DEMO1',
          name: 'Demo User',
          vipTier: 'Silver',
          createdAt: new Date().toISOString(),
        };
        const demoMetrics: Metrics = {
          alertCompressionRatio: 85,
          ticketReductionRate: 62,
          mttrImprovement: 45,
          automationCoverage: 78,
        };
        
        setProfile(demoProfile);
        setMetrics(demoMetrics);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

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
            <h2 className="text-xl font-bold text-red-600">Connection Error</h2>
            <p className="text-gray-600">{error || 'Failed to load data'}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>JWT Validation Issue:</strong> The backend is having trouble validating your session token.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setDemoMode(true)} variant="default" className="w-full">
                View Demo Dashboard
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
    createdAt: new Date().toISOString(),
  } : profile!;

  const displayMetrics = demoMode && !metrics ? {
    alertCompressionRatio: 73,
    ticketReductionRate: 62,
    mttrImprovement: 23,
    automationCoverage: 78,
  } : metrics!;

  const avatarSrc = displayProfile.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(displayProfile.name || 'user')}`;
  const profileInitial = (displayProfile.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Demo Mode Active</div>
                <div className="text-sm text-white/90">Backend unavailable - Using sample data for exploration</div>
              </div>
            </div>
            <Button 
              onClick={onLogout}
              variant="outline" 
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              Exit Demo
            </Button>
          </div>
        </div>
      )}
      
      {/* Side Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with User Info */}
            <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-6 pb-8">
              {/* Close Button */}
              <button 
                onClick={() => setShowMenu(false)} 
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* User Avatar and Info */}
              <div className="flex items-start space-x-3 mb-6">
                <div className="w-12 h-12 rounded-full border-2 border-white/60 overflow-hidden bg-blue-300 flex items-center justify-center">
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
                  <h3 className="text-white font-bold text-lg leading-tight break-words">{displayProfile.name}</h3>
                  <div className="mt-2 bg-white/10 rounded-lg p-2 space-y-1">
                    <p className="text-blue-100 text-xs">
                      <span className="font-semibold">Member ID:</span>{' '}
                      <span className="font-mono tracking-wide">{displayProfile.id.substring(0, 6).toUpperCase()}</span>
                    </p>
                    <p className="text-blue-100 text-xs">
                      <span className="font-semibold">Invite Code:</span>{' '}
                      <span className="font-mono tracking-wide">{displayProfile.invitationCode || 'Not assigned'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats and Credit Score */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex justify-between items-start">
                  {/* Left side - Stats */}
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className="text-blue-200 text-xs">Today's Profit</p>
                      <p className="text-white font-bold text-xl">${todaysProfit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Total Asset</p>
                      <p className="text-white font-bold text-xl">${balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Assets</p>
                      <p className="text-white font-bold text-xl">$0</p>
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
                        strokeDasharray={`${2 * Math.PI * 40 * 0.6} ${2 * Math.PI * 40}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-bold text-xl">60%</span>
                      <span className="text-blue-200 text-xs">Credit</span>
                      <span className="text-blue-200 text-xs">Score</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items - Light Background */}
            <div className="bg-gray-50 px-4 py-6 space-y-6">
              {/* Quick Access Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowMemberID(true);
                  }}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
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
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
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
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
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
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📜</span>
                    <span className="text-gray-900 font-medium text-sm">Cert</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowFAQ(true);
                  }}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">❓</span>
                    <span className="text-gray-900 font-medium text-sm">Faq</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowVIPCarousel(true);
                  }}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">👑</span>
                    <span className="text-gray-900 font-medium text-sm">Membership</span>
                  </div>
                </button>
              </div>

              {/* Transactions Section */}
              <div>
                <h4 className="text-gray-700 font-bold mb-3">Transactions</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setActiveNav('analytics');
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-2 border-red-500 font-medium"
                  >
                    <span className="text-xl">📤</span>
                    <span className="text-gray-900 font-medium">Upload</span>
                  </button>
                  <button 
                    onClick={() => setShowWithdrawalModal(true)}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-2 border-red-500 font-medium"
                  >
                    <span className="text-xl">💵</span>
                    <span className="text-gray-900 font-medium">Cash Out</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setActiveNav('reports');
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">📜</span>
                    <span className="text-gray-900 font-medium">History</span>
                  </button>
                </div>
              </div>

              {/* Profit Sharing Section */}
              <div>
                <h4 className="text-gray-700 font-bold mb-3">💰 Profit Sharing</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowEarnings(true);
                    }}
                    className="w-full bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-l-4 border-green-500"
                  >
                    <span className="text-xl">💵</span>
                    <span className="text-gray-900 font-medium">My Earnings</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowReferrals(true);
                    }}
                    className="w-full bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-l-4 border-purple-500"
                  >
                    <span className="text-xl">👥</span>
                    <span className="text-gray-900 font-medium">My Referrals</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowProductSubmission(true);
                    }}
                    className="w-full bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-l-4 border-orange-500"
                  >
                    <span className="text-xl">📦</span>
                    <span className="text-gray-900 font-medium">Submit Product</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowWithdrawal(true);
                    }}
                    className="w-full bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-l-4 border-red-500"
                  >
                    <span className="text-xl">💸</span>
                    <span className="text-gray-900 font-medium">Request Withdrawal</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowMultiLevelEarnings(true);
                    }}
                    className="w-full bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-l-4 border-cyan-500"
                  >
                    <span className="text-xl">📈</span>
                    <span className="text-gray-900 font-medium">Multi-Level Insights</span>
                  </button>
                </div>
              </div>

              {/* Profile Section */}
              <div>
                <h4 className="text-gray-700 font-bold mb-3">Profile</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setActiveNav('settings');
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">✏️</span>
                    <span className="text-gray-900 font-medium">Edit Profile</span>
                  </button>
                  <button className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3">
                    <span className="text-xl">💳</span>
                    <span className="text-gray-900 font-medium">Financial Information</span>
                  </button>
                </div>
              </div>

              {/* Admin Tools Section */}
              <div>
                <h4 className="text-gray-700 font-bold mb-3">🔐 Admin Tools</h4>
                {adminKey ? (
                  <div className="space-y-2">
                    <button 
                      onClick={() => {
                        setShowMenu(false);
                        setShowAdminDashboard(true);
                      }}
                      className="w-full bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3 border-l-4 border-indigo-500"
                    >
                      <span className="text-xl">📊</span>
                      <span className="text-gray-900 font-medium">Withdrawal Dashboard</span>
                    </button>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('adminKey');
                        setAdminKey('');
                      }}
                      className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                    >
                      <span className="text-xl">🔓</span>
                      <span className="text-gray-900 font-medium">Logout (Admin)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Enter admin key"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && adminKey.trim()) {
                          localStorage.setItem('adminKey', adminKey);
                          setShowMenu(false);
                          setShowAdminDashboard(true);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={() => {
                        if (adminKey.trim()) {
                          localStorage.setItem('adminKey', adminKey);
                          setShowMenu(false);
                          setShowAdminDashboard(true);
                        }
                      }}
                      disabled={!adminKey.trim()}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-3 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Login as Admin
                    </button>
                  </div>
                )}
              </div>

              {/* Others Section */}
              <div>
                <h4 className="text-gray-700 font-bold mb-3">Others</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowFAQ(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">❓</span>
                    <span className="text-gray-900 font-medium">FAQ & Knowledge Base</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowLiveChat(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">💬</span>
                    <span className="text-gray-900 font-medium">Live Chat Support</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowSupportTickets(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">🎫</span>
                    <span className="text-gray-900 font-medium">Support Tickets</span>
                  </button>
                  <button className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3">
                    <span className="text-xl">📞</span>
                    <span className="text-gray-900 font-medium">Contact Us</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowBonusPayouts(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">🎁</span>
                    <span className="text-gray-900 font-medium">Bonus Payouts</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowAnalytics(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">📊</span>
                    <span className="text-gray-900 font-medium">Analytics Dashboard</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowLeaderboard(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">🏆</span>
                    <span className="text-gray-900 font-medium">Top Referrers</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowEmailPreferences(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
                  >
                    <span className="text-xl">📧</span>
                    <span className="text-gray-900 font-medium">Email Preferences</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowNotifications(true);
                    }}
                    className="w-full bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left flex items-center space-x-3"
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
                <p className="text-sm font-medium text-gray-900">Welcome to Tanknewmedia!</p>
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
      <header className="bg-[#1a1d2e] text-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
            onClick={() => setShowMenu(!showMenu)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-wider">TANK</h1>
          <div className="flex items-center space-x-3">
            <button
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setShowMenu(true)}
              aria-label="Open profile"
            >
              <div className="relative w-9 h-9 rounded-full border-2 border-white/70 overflow-hidden bg-slate-700 flex items-center justify-center">
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
              className="p-2 relative hover:bg-white/10 rounded-lg transition-colors" 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 bg-red-500 rounded-full w-2 h-2"></span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Account Frozen Banner */}
      {accountFrozen && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-6 sticky top-[60px] z-40 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center space-x-3 mb-3">
              <svg className="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-bold">🔒 ACCOUNT FROZEN</h3>
                <p className="text-sm opacity-90 mt-1">
                  Congratulations! You have encountered a Premium product please contact Customer Service for more info.
                </p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Top-Up Required:</span>
                <span className="text-2xl font-bold">${freezeAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs opacity-90 mb-3">
                Please contact Customer Service to top up your account and unfreeze
              </p>
              <Button
                onClick={() => setShowChat(true)}
                className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold"
              >
                📞 Contact Customer Service
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Background Image */}
      {activeNav === 'home' && (
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
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
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="1000" height="400" fill="url(#grid)" />
            </svg>
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50"></div>
          <div className="absolute top-4 left-0 right-0 overflow-hidden">
            <motion.div 
              className="inline-flex items-center space-x-4 bg-[#1a1d2e]/80 backdrop-blur-sm text-white px-4 py-2 rounded-full whitespace-nowrap"
              initial={{ x: '100%' }}
              animate={{ x: '-100%' }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
              <Bell className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm font-medium">Welcome to Tanknewmedia for Innovative Software Development · Access Your VIP Data Platform · Manage Products & Earn Commissions · View Your Performance Metrics · Connect with Our Support Team</span>
              <Bell className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm font-medium">Welcome to Tanknewmedia for Innovative Software Development · Access Your VIP Data Platform · Manage Products & Earn Commissions · View Your Performance Metrics · Connect with Our Support Team</span>
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
            onSubmitProduct={handleSubmitProduct}
            onStartProduct={handleStartProduct}
            todaysProfit={todaysProfit}
            accountFrozen={accountFrozen}
          />
        )}
        
        {activeNav === 'home' && (
          <>
            {/* Open and Extensible Card */}
            <Card className="mb-6 shadow-lg">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                  Open and extensible
                </h2>
                <p className="text-sm text-gray-600 text-center leading-relaxed">
                  Tanknewmedia offers custom software development services that help innovative companies and startups design and build digital products with AI, mobile, and web technologies.
                </p>
              </CardContent>
            </Card>

            {/* Balance Display */}
            <Card className="mb-6 shadow-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Earnings</p>
                    <p className="text-4xl font-bold">${balance.toFixed(2)}</p>
                    <p className="text-xs opacity-80 mt-2">{productsSubmitted} products submitted</p>
                  </div>
                  <Wallet className="h-16 w-16 opacity-30" />
                </div>
                <Button 
                  onClick={() => setActiveNav('analytics')}
                  className="w-full mt-4 bg-white text-green-600 hover:bg-gray-100"
                >
                  Submit Products & Earn
                </Button>
              </CardContent>
            </Card>

            {/* VIP Levels Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#4c2eff]">Vip Levels</h3>
                <button 
                  onClick={() => setShowVIPCarousel(true)}
                  className="flex items-center text-[#ff2e9f] text-sm font-medium hover:text-[#ff1e8f] transition-colors"
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
                  <Card className="bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg overflow-hidden">
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
                  <Card className="bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-lg overflow-hidden">
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
                  <Card className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg overflow-hidden ring-4 ring-yellow-300">
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
              <Card className="shadow-sm">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-gray-600 mb-2">Compress alerts by</p>
                  <p className="text-5xl font-bold text-[#00bfff]">{displayMetrics.alertCompressionRatio}%</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-gray-600 mb-2">Identify critical alerts in</p>
                  <p className="text-5xl font-bold text-[#ff2e9f]">{displayMetrics.mttrImprovement}s</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-gray-600 mb-2">Reduce ServiceNow tickets by</p>
                  <p className="text-3xl font-bold text-gray-900">{displayMetrics.ticketReductionRate}%</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-gray-600 mb-2">Save up to</p>
                  <p className="text-3xl font-bold text-gray-900">{displayMetrics.automationCoverage}%</p>
                </CardContent>
              </Card>
            </div>
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
                          <p className="text-2xl font-bold text-blue-600">${balance.toFixed(2)}</p>
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
                                alert('❌ Login passwords do not match');
                                return;
                              }
                              if (settingsForm.withdrawalPassword !== settingsForm.confirmWithdrawalPassword) {
                                alert('❌ Withdrawal passwords do not match');
                                return;
                              }

                              const normalizedContactEmail = settingsForm.contactEmail.trim().toLowerCase();
                              if (normalizedContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContactEmail)) {
                                alert('❌ Invalid contact email format');
                                return;
                              }

                              if (!demoMode) {
                                try {
                                  const { projectId, publicAnonKey } = await import('~/utils/supabase/info');
                                  const saveResponse = await fetch(
                                    `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/profile/contact-email`,
                                    {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${accessToken}`,
                                        'apikey': publicAnonKey,
                                      },
                                      body: JSON.stringify({
                                        contactEmail: normalizedContactEmail || null,
                                      }),
                                    }
                                  );

                                  const saveData = await saveResponse.json().catch(() => ({}));
                                  if (!saveResponse.ok) {
                                    throw new Error(saveData?.error || 'Failed to update contact email');
                                  }

                                  setProfile((prev) => prev ? {
                                    ...prev,
                                    contactEmail: normalizedContactEmail || null,
                                  } : prev);
                                } catch (saveErr: any) {
                                  alert(`❌ ${saveErr?.message || 'Failed to save contact email'}`);
                                  return;
                                }
                              }

                              alert('✅ Account settings updated successfully');
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
                                alert('❌ Please fill in all banking details');
                                return;
                              }
                              alert('✅ Banking details saved securely');
                              setShowBankingForm(false);
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
                                alert('❌ Please enter a valid wallet address');
                                return;
                              }
                              alert('✅ Crypto wallet saved securely');
                              setShowCryptoForm(false);
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
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1d2e] text-white shadow-lg z-40">
        <div className="grid grid-cols-4 gap-1 px-2 py-3">
          <button 
            className={`flex flex-col items-center space-y-1 transition-colors ${activeNav === 'home' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('home')}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-1 transition-colors ${activeNav === 'analytics' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('analytics')}
          >
            <BarChart3 className="h-6 w-6" />
            <span className="text-xs">Starting</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-1 transition-colors ${activeNav === 'reports' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('reports')}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs">Reports</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-1 transition-colors ${activeNav === 'settings' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveNav('settings')}
          >
            <Settings className="h-6 w-6" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>

      {/* Floating Chat Button */}
      <button 
        className="fixed bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 shadow-lg flex items-center space-x-2 z-50 transition-all active:scale-95"
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

      {/* FAQ Page */}
      {showFAQ && (
        <FAQPage
          onClose={() => setShowFAQ(false)}
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
      />

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
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowWithdrawalModal(false);
                      setWithdrawalPassword('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (withdrawalPassword.trim()) {
                        // TODO: Integrate with backend to process withdrawal
                        alert(`✅ Withdrawal initiated with password. Amount: $${balance.toFixed(2)}`);
                        setShowWithdrawalModal(false);
                        setWithdrawalPassword('');
                      } else {
                        alert('❌ Please enter your withdrawal password');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Submit
                  </button>
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

      {/* Product Submission Modal */}
      {showProductSubmission && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Submit Product & Earn</h2>
                  <button
                    onClick={() => setShowProductSubmission(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <ProductSubmissionForm
                  accessToken={accessToken}
                  onSuccess={() => {
                    setRefreshCounter(refreshCounter + 1);
                    // Could trigger refresh of earnings/referrals here
                  }}
                />
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

      {/* Admin Withdrawal Dashboard Modal */}
      {showAdminDashboard && adminKey && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">💰 Admin Withdrawal Dashboard</h2>
                  <button
                    onClick={() => setShowAdminDashboard(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <AdminWithdrawalDashboard adminKey={adminKey} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Level Earnings Modal */}
      {showMultiLevelEarnings && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">📈 Multi-Level Commission Breakdown</h2>
                  <button
                    onClick={() => setShowMultiLevelEarnings(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <MultiLevelEarnings accessToken={accessToken} />
              </div>
            </div>
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

      {/* FAQ Modal */}
      {showFAQ && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center pt-4 pb-20">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">❓ FAQ & Knowledge Base</h2>
                  <button
                    onClick={() => setShowFAQ(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <FAQ accessToken={accessToken} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


