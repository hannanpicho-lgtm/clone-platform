import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { safeFetch } from '../../utils/safeFetch';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  Activity,
  Gift,
  UserPlus,
  MessageSquare,
  Settings,
  BarChart3,
  XCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Shield,
  Bell,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Zap,
  Link2,
  Ticket,
  Copy,
} from 'lucide-react';
import { PremiumManagementPanel } from './PremiumManagementPanel';
import { getVipTierConfig, VIP_TIER_ORDER } from './vipConfig';

// Import all required types

interface User {
  id: string;
  name?: string;
  email?: string;
  invitationCode?: string;
  vipTier?: string;
  currentSetTasksCompleted?: number;
  accountFrozen?: boolean;
  balance?: number;
  productsSubmitted?: number;
  dailyTaskSetLimit?: number;
  extraTaskSets?: number;
  withdrawalLimit?: number;
  lastLoginCountry?: string;
  lastLoginIp?: string;
  taskSetsCompletedToday?: number;
  creditScore?: number;
  freezeAmount?: number;
  premiumAssignment?: {
    orderId?: string | null;
    amount?: number;
    enteredAmount?: number;
    previousBalance?: number;
    topUpRequired?: number;
  } | null;
}
interface Transaction {
  id: string;
  commission: number;
  timestamp: string;
  status?: string;
  productName?: string;
  userName?: string;
}
interface WithdrawalRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  denialReason?: string;
}
interface InvitationCode {
  code: string;
  owner?: string;
  referrals?: number;
  status?: string;
  generatedAt?: string;
  ownerUserId?: string;
}
interface SupportCase {
  id: string;
  userId?: string;
  userName?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'open' | 'in_progress' | 'resolved';
  updatedAt?: string;
  repliesCount?: number;
  messages?: any[];
}
interface PlatformMetrics {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  activeUsers: number;
  frozenAccounts: number;
  totalCommissionsPaid: number;
}
interface AdminAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  status: string;
}
interface AlertsSummary {
  total: number;
  actionRequired: number;
  pendingWithdrawals: number;
  openSupportTickets: number;
  frozenAccounts: number;
  critical: number;
  high: number;
}
interface AdminAuditLogItem {
  id: string;
  action: string;
  actorUserId?: string | null;
  actorType: 'super_admin' | 'limited_admin';
  targetUserId?: string | null;
  targetIdentifier?: string | null;
  createdAt: string;
  meta?: Record<string, any>;
}
interface LimitedAdminAccount {
  id: string;
  username: string;
  name?: string;
  permissions: string[];
  userId?: string;
  active?: boolean;
  displayName?: string;
}
interface AnnouncementConfigItem {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning';
  popup: boolean;
  active: boolean;
  createdAt: string;
  expiresAt?: string | null;
}
interface AdminDashboardProps {
  onLogout: () => void;
  adminAccessToken?: string;
  adminIsSuperAdmin?: boolean;
  adminPermissions?: string[];
}

type VipTierName = 'Normal' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
type VipCommissionRangeMap = Record<VipTierName, { min: number; max: number }>;

const DEFAULT_VIP_COMMISSION_RANGES: VipCommissionRangeMap = {
  Normal: { min: 40, max: 60 },
  Silver: { min: 60, max: 70 },
  Gold: { min: 150, max: 170 },
  Platinum: { min: 200, max: 250 },
  Diamond: { min: 1500, max: 2000 },
};

const VIP_COMMISSION_TIER_LABELS: Record<VipTierName, string> = {
  Normal: 'Bronze (VIP1)',
  Silver: 'Silver (VIP2)',
  Gold: 'Gold (VIP3)',
  Platinum: 'Platinum (VIP4)',
  Diamond: 'Diamond (VIP5)',
};

const normalizeVipCommissionRanges = (input: any): VipCommissionRangeMap => {
  const tiers: VipTierName[] = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const normalized = { ...DEFAULT_VIP_COMMISSION_RANGES } as VipCommissionRangeMap;

  tiers.forEach((tier) => {
    const fallback = DEFAULT_VIP_COMMISSION_RANGES[tier];
    const source = input?.[tier] || {};
    const min = Number(source?.min);
    const max = Number(source?.max);
    const safeMin = Number.isFinite(min) && min >= 0 ? min : fallback.min;
    const safeMaxCandidate = Number.isFinite(max) && max >= 0 ? max : fallback.max;
    normalized[tier] = {
      min: Math.round(safeMin * 100) / 100,
      max: Math.round(Math.max(safeMin, safeMaxCandidate) * 100) / 100,
    };
  });

  return normalized;
};

export function AdminDashboard({ onLogout, adminAccessToken, adminIsSuperAdmin = true, adminPermissions = ['*'] }: AdminDashboardProps) {
    // Utility functions and permission variables (must be inside the component)
    function formatLocationLabel(val: any) { return String(val || 'Unknown'); }
    function formatIpLabel(val: any) { return String(val || ''); }
    function getTasksPerSetForTier(tier: string) { return getVipTierConfig(tier).productsPerSet; }
    function isResetRequired(user: User) {
      const tasksPerSet = getTasksPerSetForTier(String(user?.vipTier || 'Normal'));
      const completed = Number(user?.currentSetTasksCompleted ?? 0);
      return completed >= tasksPerSet && tasksPerSet > 0;
    }
    const hasPermission = (permission: string) => {
      if (adminIsSuperAdmin) return true;
      return adminPermissions.includes('*') || adminPermissions.includes(permission);
    };
    const canViewUsers = hasPermission('users.view');
    const canManageUsers = hasPermission('users.view')
      || hasPermission('users.adjust_balance')
      || hasPermission('users.assign_premium')
      || hasPermission('users.reset_tasks')
      || hasPermission('users.manage_task_limits')
      || hasPermission('users.unfreeze')
      || hasPermission('users.update_vip')
      || hasPermission('users.reset_password');
    const canAssignPremium = hasPermission('users.assign_premium') || hasPermission('premium.manage');
    const canManageSupport = hasPermission('support.manage');
    const canManageInvitations = hasPermission('invitations.manage');
    const canUnfreezeUsers = hasPermission('users.unfreeze');
    const canAdjustBalance = hasPermission('users.adjust_balance');
    const canUpdateVip = hasPermission('users.update_vip');
    const canResetTasks = hasPermission('users.reset_tasks');
    const canManageTaskLimits = hasPermission('users.manage_task_limits');
    const canResetPasswords = hasPermission('users.reset_password');
    const canViewAudit = canViewUsers || canManageSupport || hasPermission('withdrawals.manage');
    const LIMITED_ADMIN_PERMISSION_OPTIONS = [
      'users.view',
      'users.adjust_balance',
      'users.assign_premium',
      'users.reset_password',
      'users.reset_tasks',
      'users.manage_task_limits',
      'users.unfreeze',
      'users.update_vip',
      'support.manage',
      'withdrawals.manage',
      'invitations.manage',
      'premium.manage',
    ];
  // State hooks for permission options and action submission
  const [submittingAction, setSubmittingAction] = useState(false);
  const [permissionsInput, setPermissionsInput] = useState('');
  const [denyWithdrawalId, setDenyWithdrawalId] = useState('');
  const [denyReasonInput, setDenyReasonInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReconcilingPremiumBalances, setIsReconcilingPremiumBalances] = useState(false);
    // --- TEMP STUBS FOR BUILD ---
    // Replace these with real implementations as needed
    const getAdminAuthToken = () => {
      if (adminAccessToken && String(adminAccessToken).trim()) {
        return String(adminAccessToken).trim();
      }

      if (typeof window !== 'undefined') {
        const storedSuperAdminKey = String(window.sessionStorage.getItem('superAdminKey') || '').trim();
        if (storedSuperAdminKey) {
          return storedSuperAdminKey;
        }
      }

      return publicAnonKey;
    };
    const reloadInvitationCodes = async (_?: any) => {
      try {
        const response = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/invitation-codes`,
          {
            headers: {
              Authorization: `Bearer ${getAdminAuthToken()}`,
            },
          }
        );

        if (!response || !response.ok) {
          setInvitationCodes([]);
          return;
        }

        const data = await response.json().catch(() => ({}));
        const rows = Array.isArray(data?.invitationCodes) ? data.invitationCodes : [];
        setInvitationCodes(rows.map((item: any) => ({
          code: String(item?.code || ''),
          owner: String(item?.ownerName || item?.owner || 'Platform Invite'),
          referrals: Number(item?.signups ?? item?.referrals ?? 0),
          status: String(item?.status || 'active'),
          generatedAt: String(item?.createdAt || item?.generatedAt || ''),
          ownerUserId: item?.ownerUserId ? String(item.ownerUserId) : undefined,
        })).filter((item: InvitationCode) => item.code));
      } catch {
        setInvitationCodes([]);
      }
    };
    const loadAdminWithdrawals = async () => {
      try {
        const response = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/withdrawals`,
          {
            headers: {
              Authorization: `Bearer ${getAdminAuthToken()}`,
            },
          }
        );

        if (!response || !response.ok) {
          setWithdrawals([]);
          return;
        }

        const data = await response.json().catch(() => ({}));
        const rows = Array.isArray(data?.withdrawals) ? data.withdrawals : [];
        const mappedWithdrawals = rows.map((item: any) => ({
          id: String(item?.id || ''),
          userId: String(item?.userId || ''),
          userName: String(item?.userName || 'User'),
          userEmail: String(item?.userEmail || ''),
          amount: Number(item?.amount || 0),
          status: (item?.status || 'pending') as 'pending' | 'approved' | 'denied',
          requestedAt: String(item?.requestedAt || ''),
          approvedAt: item?.approvedAt || undefined,
          deniedAt: item?.deniedAt || undefined,
          denialReason: item?.denialReason || undefined,
        }));

        const nextPendingIds = mappedWithdrawals
          .filter((item) => item.status === 'pending')
          .map((item) => item.id);

        if (hasLoadedWithdrawalsRef.current) {
          const newPendingWithdrawals = mappedWithdrawals.filter(
            (item) => item.status === 'pending' && !previousPendingWithdrawalIdsRef.current.includes(item.id)
          );

          if (newPendingWithdrawals.length > 0) {
            playWithdrawalAlert();

            newPendingWithdrawals.forEach((item) => {
              toast.warning(`New withdrawal request from ${item.userName}`, {
                description: `$${item.amount.toFixed(2)} is awaiting admin approval.`,
                duration: 12000,
              });

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New withdrawal request', {
                  body: `${item.userName} requested $${item.amount.toFixed(2)}`,
                  tag: `withdrawal-${item.id}`,
                  requireInteraction: true,
                });
              }
            });
          }
        } else {
          hasLoadedWithdrawalsRef.current = true;

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => undefined);
          }
        }

        previousPendingWithdrawalIdsRef.current = nextPendingIds;
        setWithdrawals(mappedWithdrawals);
      } catch {
        setWithdrawals([]);
      }
    };
  // --- React state and logic ---
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'withdrawals' | 'transactions' | 'premium' | 'products' | 'invitations' | 'customer-service' | 'audit' | 'settings'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<'all' | 'approved' | 'pending' | 'denied'>('all');
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [supportCases, setSupportCases] = useState<SupportCase[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    activeUsers: 0,
    frozenAccounts: 0,
    totalCommissionsPaid: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary>({
    total: 0,
    actionRequired: 0,
    pendingWithdrawals: 0,
    openSupportTickets: 0,
    frozenAccounts: 0,
    critical: 0,
    high: 0,
  });
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [adminAuditLog, setAdminAuditLog] = useState<AdminAuditLogItem[]>([]);
  const [loadingAuditLog, setLoadingAuditLog] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState<LimitedAdminAccount[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState('users.view,users.adjust_balance,users.assign_premium,users.reset_password,users.reset_tasks,users.manage_task_limits,users.unfreeze,users.update_vip,invitations.manage,support.manage,withdrawals.manage');
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [supportReplyDrafts, setSupportReplyDrafts] = useState<Record<string, string>>({});
  const [supportStatusFilter, setSupportStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedSupportCaseId, setSelectedSupportCaseId] = useState<string | null>(null);
  const [supportLinks, setSupportLinks] = useState({ whatsapp: '', telegram: '' });
  const [savingSupportLinks, setSavingSupportLinks] = useState(false);
  const [announcementsConfig, setAnnouncementsConfig] = useState<AnnouncementConfigItem[]>([]);
  const [announcementTitleDraft, setAnnouncementTitleDraft] = useState('');
  const [announcementMessageDraft, setAnnouncementMessageDraft] = useState('');
  const [announcementLevelDraft, setAnnouncementLevelDraft] = useState<'info' | 'success' | 'warning'>('info');
  const [announcementPopupDraft, setAnnouncementPopupDraft] = useState(true);
  const [announcementExpiresAtDraft, setAnnouncementExpiresAtDraft] = useState('');
  const [savingAnnouncements, setSavingAnnouncements] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false);
  const [showAssignPremiumModal, setShowAssignPremiumModal] = useState(false);
  const [showTaskLimitsModal, setShowTaskLimitsModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [showDenyWithdrawalModal, setShowDenyWithdrawalModal] = useState(false);
  const [actionTargetUser, setActionTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [taskLimitsTargetUser, setTaskLimitsTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [permissionsTargetAdmin, setPermissionsTargetAdmin] = useState<LimitedAdminAccount | null>(null);
  const [adjustBalanceAmount, setAdjustBalanceAmount] = useState('100');
  const [adjustBalanceCategory, setAdjustBalanceCategory] = useState('bonus');
  const [adjustBalanceNote, setAdjustBalanceNote] = useState('');
  const [premiumAmountInput, setPremiumAmountInput] = useState('');
  const [premiumPositionInput, setPremiumPositionInput] = useState('');
  const [taskLimitDailyInput, setTaskLimitDailyInput] = useState('3');
  const [taskLimitExtraInput, setTaskLimitExtraInput] = useState('0');
  const [withdrawalLimitInput, setWithdrawalLimitInput] = useState('0');
  const [creditScoreInput, setCreditScoreInput] = useState('100');
  const [vipCommissionRanges, setVipCommissionRanges] = useState<VipCommissionRangeMap>({ ...DEFAULT_VIP_COMMISSION_RANGES });
  const [savingVipCommissionRanges, setSavingVipCommissionRanges] = useState(false);
  const [vipCommissionSetSelection, setVipCommissionSetSelection] = useState<'set1' | 'set2'>('set1');
  const [vipCommissionTierSelection, setVipCommissionTierSelection] = useState<VipTierName>('Normal');
  const hasLoadedWithdrawalsRef = useRef(false);
  const previousPendingWithdrawalIdsRef = useRef<string[]>([]);

  const playWithdrawalAlert = () => {
    if (typeof window === 'undefined') return;

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.45);
      oscillator.onended = () => {
        audioContext.close().catch(() => undefined);
      };
    } catch {
    }
  };

  async function handleAdminReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetStatus('');

    try {
      const token = getAdminAuthToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
      });

      const payload = await response.json().catch(() => ({} as any));

      if (response.ok) {
        setResetStatus('Password reset successfully.');
      } else {
        setResetStatus(`Failed to reset password${payload?.error ? `: ${payload.error}` : '. Please check user ID and try again.'}`);
      }
    } catch {
      setResetStatus('Error occurred. Please try again.');
    }
  }

  async function handleCopyUserId(userId: string) {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedUserId(userId);
      setResetUserId(userId);
      window.setTimeout(() => {
        setCopiedUserId((current) => (current === userId ? null : current));
      }, 1500);
    } catch {
      setResetStatus('Unable to copy user ID. Please copy it manually.');
    }
  }

  const loadVipCommissionRanges = async () => {
    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/vip-commission-ranges`,
        {
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
          },
        },
      );

      if (!response || !response.ok) {
        setVipCommissionRanges({ ...DEFAULT_VIP_COMMISSION_RANGES });
        return;
      }

      const data = await response.json().catch(() => ({}));
      const normalized = normalizeVipCommissionRanges(data?.config?.ranges || data?.ranges || {});
      setVipCommissionRanges(normalized);
    } catch {
      setVipCommissionRanges({ ...DEFAULT_VIP_COMMISSION_RANGES });
    }
  };

  const updateVipCommissionRange = (tier: VipTierName, key: 'min' | 'max', raw: string) => {
    const parsed = Number(raw);
    setVipCommissionRanges((prev) => {
      const next = { ...prev };
      const current = next[tier];
      if (!Number.isFinite(parsed)) {
        next[tier] = { ...current, [key]: 0 };
      } else {
        next[tier] = { ...current, [key]: Math.max(0, parsed) };
      }
      if (next[tier].max < next[tier].min) {
        next[tier].max = next[tier].min;
      }
      return next;
    });
  };

  const handleResetVipCommissionRanges = () => {
    setVipCommissionRanges({ ...DEFAULT_VIP_COMMISSION_RANGES });
  };

  const handleSaveVipCommissionRanges = async () => {
    try {
      setSavingVipCommissionRanges(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/vip-commission-ranges`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ranges: vipCommissionRanges }),
        },
      );

      const data = await response?.json().catch(() => ({}));
      if (!response || !response.ok) {
        alert(`❌ Failed to save VIP commission ranges${data?.error ? `: ${data.error}` : ''}`);
        return;
      }

      setVipCommissionRanges(normalizeVipCommissionRanges(data?.config?.ranges || vipCommissionRanges));
      alert('✅ VIP commission ranges updated');
    } catch {
      alert('❌ Failed to save VIP commission ranges');
    } finally {
      setSavingVipCommissionRanges(false);
    }
  };



  const loadAdminAlerts = async (forceDemo = false, sourceUsers: User[] = users, sourceSupport: SupportCase[] = supportCases) => {
    if (!forceDemo) {
      try {
        const response = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/alerts`,
          {
            headers: {
              Authorization: `Bearer ${getAdminAuthToken()}`,
            },
          }
        );

        if (response && response.ok) {
          const data = await response.json();
          setAdminAlerts(data?.alerts || []);
          setAlertsSummary(data?.summary || {
            total: 0,
            actionRequired: 0,
            pendingWithdrawals: 0,
            openSupportTickets: 0,
            frozenAccounts: 0,
            critical: 0,
            high: 0,
          });
          return;
        }
      } catch {
      }
    }

    const fallbackAlerts: AdminAlert[] = [];
    sourceUsers.filter((user) => user.accountFrozen).slice(0, 5).forEach((user) => {
      fallbackAlerts.push({
        id: `frozen:${user.id}`,
        type: 'frozen_account',
        severity: 'critical',
        title: 'Frozen account requires intervention',
        message: `${user.name} is frozen and needs admin action`,
        createdAt: new Date().toISOString(),
        status: 'action_required',
      });
    });

    sourceSupport.filter((item) => item.status !== 'resolved').slice(0, 5).forEach((item) => {
      fallbackAlerts.push({
        id: `support:${item.id}`,
        type: 'support_ticket',
        severity: item.priority === 'high' ? 'high' : 'medium',
        title: 'Customer service ticket needs attention',
        message: `${item.userName}: ${item.category}`,
        createdAt: new Date().toISOString(),
        status: 'action_required',
      });
    });

    setAdminAlerts(fallbackAlerts);
    setAlertsSummary({
      total: fallbackAlerts.length,
      actionRequired: fallbackAlerts.filter((item) => item.status === 'action_required').length,
      pendingWithdrawals: fallbackAlerts.filter((item) => item.type === 'withdrawal_pending').length,
      openSupportTickets: fallbackAlerts.filter((item) => item.type === 'support_ticket').length,
      frozenAccounts: fallbackAlerts.filter((item) => item.type === 'frozen_account').length,
      critical: fallbackAlerts.filter((item) => item.severity === 'critical').length,
      high: fallbackAlerts.filter((item) => item.severity === 'high').length,
    });
  };

  const loadAdminAuditLog = async () => {
    if (!canViewAudit) {
      setAdminAuditLog([]);
      return;
    }

    try {
      setLoadingAuditLog(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/audit-log?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
          },
        }
      );

      if (!response || !response.ok) {
        setAdminAuditLog([]);
        return;
      }

      const data = await response.json().catch(() => ({}));
      setAdminAuditLog(Array.isArray(data?.logs) ? data.logs : []);
    } catch {
      setAdminAuditLog([]);
    } finally {
      setLoadingAuditLog(false);
    }
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from backend
      const usersResponse = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
          },
        }
      );

      if (usersResponse?.ok) {
        const data = await usersResponse.json();
        const backendUsers = data.users || [];
        setUsers(backendUsers);
        setMetrics(data.metrics);
        await loadVipCommissionRanges();

        try {
          const transactionsResponse = await safeFetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/transactions`,
            {
              headers: {
                Authorization: `Bearer ${getAdminAuthToken()}`,
              },
            }
          );

          if (transactionsResponse?.ok) {
            const txData = await transactionsResponse.json().catch(() => ({}));
            setTransactions(Array.isArray(txData?.transactions) ? txData.transactions : []);
          } else {
            setTransactions([]);
          }
        } catch {
          setTransactions([]);
        }

        await reloadInvitationCodes(backendUsers);

        await loadAdminWithdrawals();

        try {
          const linksResponse = await safeFetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/contact-links`,
            {
              headers: {
                Authorization: `Bearer ${getAdminAuthToken()}`,
              },
            }
          );

          if (linksResponse?.ok) {
            const linksData = await linksResponse.json();
            const config = linksData?.config || {};
            setSupportLinks({
              whatsapp: String(config.whatsapp || ''),
              telegram: String(config.telegram || ''),
            });
          }
        } catch {
          // Keep existing values silently
        }

        try {
          const announcementsResponse = await safeFetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/announcements`,
            {
              headers: {
                Authorization: `Bearer ${getAdminAuthToken()}`,
              },
            }
          );

          if (announcementsResponse?.ok) {
            const announcementsData = await announcementsResponse.json().catch(() => ({}));
            const items = Array.isArray(announcementsData?.config?.items) ? announcementsData.config.items : [];
            setAnnouncementsConfig(items.map((item: any) => ({
              id: String(item?.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
              title: String(item?.title || ''),
              message: String(item?.message || ''),
              level: (String(item?.level || 'info').toLowerCase() === 'success'
                ? 'success'
                : String(item?.level || 'info').toLowerCase() === 'warning'
                  ? 'warning'
                  : 'info') as 'info' | 'success' | 'warning',
              popup: item?.popup !== false,
              active: item?.active !== false,
              createdAt: String(item?.createdAt || new Date().toISOString()),
              expiresAt: item?.expiresAt ? String(item.expiresAt) : null,
            })));
          }
        } catch {
          // Keep existing values silently
        }

        try {
          const supportResponse = await safeFetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/support-tickets`,
            {
              headers: {
                Authorization: `Bearer ${getAdminAuthToken()}`,
              },
            }
          );

          if (supportResponse?.ok) {
            const supportData = await supportResponse.json();
            if (supportData.tickets && Array.isArray(supportData.tickets)) {
              setSupportCases(
                supportData.tickets.slice(0, 10).map((ticket: any, index: number) => ({
                  id: ticket.id || `CS-${2000 + index}`,
                  userId: ticket.userId || null,
                  userName: ticket.userName || ticket.user || 'Unknown User',
                  category: ticket.subject || ticket.category || 'General',
                  priority: (ticket.priority || 'medium') as 'high' | 'medium' | 'low',
                  status: (ticket.status === 'pending' || ticket.status === 'open' ? 'open' : ticket.status === 'in-progress' || ticket.status === 'in_progress' ? 'in_progress' : ticket.status === 'resolved' ? 'resolved' : 'open') as 'open' | 'in_progress' | 'resolved',
                  updatedAt: ticket.updatedAt || ticket.createdAt || 'recently',
                  repliesCount: Array.isArray(ticket.replies) ? ticket.replies.length : 0,
                  messages: [
                    {
                      id: `${ticket.id || `CS-${2000 + index}`}-initial`,
                      role: 'user',
                      sender: ticket.userName || ticket.user || 'User',
                      message: String(ticket.message || ticket.subject || 'Support request'),
                      createdAt: ticket.createdAt || ticket.updatedAt || 'recently',
                    },
                    ...((Array.isArray(ticket.replies) ? ticket.replies : []).map((reply: any, replyIndex: number) => ({
                      id: reply.id || `${ticket.id || `CS-${2000 + index}`}-reply-${replyIndex}`,
                      role: reply?.role === 'admin' ? 'admin' : 'user',
                      sender: reply?.userName || (reply?.role === 'admin' ? 'Support Admin' : (ticket.userName || 'User')),
                      message: String(reply?.message || ''),
                      createdAt: reply?.createdAt || ticket.updatedAt || 'recently',
                    }))).filter((reply: any) => reply.message),
                  ],
                }))
              );
            } else {
              setSupportCases([]);
            }
          } else {
            setSupportCases([]);
          }
        } catch {
          setSupportCases([]);
        }

        await loadAdminAlerts(false, backendUsers, supportCases);
        await loadAdminAccounts();
        await loadAdminAuditLog();
      } else {
        throw new Error('Backend not available');
      }
    } catch (err) {
      setUsers([]);
      setTransactions([]);
      setWithdrawals([]);
      setInvitationCodes([]);
      setSupportCases([]);
      setVipCommissionRanges({ ...DEFAULT_VIP_COMMISSION_RANGES });
      setAnnouncementsConfig([]);
      setMetrics({
        totalUsers: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        activeUsers: 0,
        frozenAccounts: 0,
        totalCommissionsPaid: 0,
      });
      await loadAdminAlerts(true, [], []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadAdminData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReconcilePremiumBalances = async () => {
    if (isReconcilingPremiumBalances) return;
    const proceed = window.confirm(
      'Run premium balance reconciliation for all users now? This applies only missing credits and is safe to re-run.'
    );
    if (!proceed) return;

    setIsReconcilingPremiumBalances(true);
    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users/reconcile-premium-balances`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dryRun: false }),
        }
      );

      const payload = await response?.json().catch(() => ({} as any));
      if (!response || !response.ok) {
        alert(`❌ Premium balance reconciliation failed${payload?.error ? `: ${payload.error}` : ''}`);
        return;
      }

      const summary = payload?.summary || {};
      alert(
        `✅ Premium reconciliation complete. Updated users: ${Number(summary?.updatedUsers || 0)}. Total credited: $${Number(summary?.totalPremiumProfitCredited || 0).toFixed(2)}.`
      );
      await loadAdminData();
    } catch {
      alert('❌ Error running premium reconciliation');
    } finally {
      setIsReconcilingPremiumBalances(false);
    }
  };

  const loadAdminAccounts = async () => {
    if (!superAdminKey.trim()) {
      setAdminAccounts([]);
      return;
    }

    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/accounts`,
        {
          headers: {
            Authorization: `Bearer ${superAdminKey.trim()}`,
          },
        }
      );

      if (!response || !response.ok) {
        setAdminAccounts([]);
        return;
      }

      const data = await response.json();
      setAdminAccounts(Array.isArray(data?.admins) ? data.admins : []);
    } catch {
      setAdminAccounts([]);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [adminAccessToken]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAdminAuditLog();
    }
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAdminAlerts(false);
    }, 30000);

    // Debug: Log users and selectedUser state whenever they change
    console.log('DEBUG: users state', users);
    console.log('DEBUG: selectedUser state', selectedUser);
    console.log('DEBUG: supportCases state', supportCases);
    return () => clearInterval(interval);
  }, [users, supportCases, selectedUser]);

  useEffect(() => {
    if (!adminIsSuperAdmin && !adminPermissions.includes('*') && !adminPermissions.includes('withdrawals.manage')) {
      return;
    }

    const interval = setInterval(() => {
      loadAdminWithdrawals();
    }, 10000);

    return () => clearInterval(interval);
  }, [adminAccessToken, adminIsSuperAdmin, adminPermissions]);

  useEffect(() => {
    if (activeTab !== 'customer-service') {
      return;
    }

    const interval = setInterval(() => {
      loadAdminData();
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, adminAccessToken]);

  // Load admin accounts when super admin key changes
  useEffect(() => {
    if (superAdminKey.trim()) {
      loadAdminAccounts();
    }
  }, [superAdminKey]);

  const handleUnfreezeAccount = async (userId: string) => {
    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/unfreeze`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response?.ok) {
        loadAdminData();
        loadAdminAlerts(false);
        alert('✅ Account unfrozen successfully');
      } else {
        alert('❌ Failed to unfreeze account');
      }
    } catch (err) {
      alert('❌ Error unfreezing account');
    }
  };

  const handleUpdateVIPTier = async (userId: string, newTier: string) => {
    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/vip-tier`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, vipTier: newTier }),
        }
      );

      if (response?.ok) {
        loadAdminData();
        setSelectedUser(prev => prev ? { ...prev, vipTier: newTier } : prev);
        alert(`✅ VIP tier updated to ${newTier}`);
      } else {
        const errorData = await response?.json().catch(() => ({}));
        alert(`❌ Failed to update VIP tier${errorData?.error ? `: ${errorData.error}` : ''}`);
      }
    } catch (err) {
      alert('❌ Error updating VIP tier');
    }
  };

  const openAdjustBalanceModal = (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    setActionTargetUser({ id: userId, name: targetUser?.name || 'User' });
    setAdjustBalanceAmount('100');
    setAdjustBalanceCategory('bonus');
    setAdjustBalanceNote('');
    setShowAdjustBalanceModal(true);
  };

  const submitAdjustBalance = async () => {
    if (!actionTargetUser?.id) return;

    const amount = Number(adjustBalanceAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      alert('❌ Invalid amount');
      return;
    }

    const category = String(adjustBalanceCategory || 'adjustment').trim().toLowerCase();
    const note = String(adjustBalanceNote || '');

    try {
      setSubmittingAction(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users/adjust-balance`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: actionTargetUser.id, amount, category, note }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to adjust balance${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminData();
      setShowAdjustBalanceModal(false);
      setActionTargetUser(null);
      alert('✅ Account adjusted successfully');
    } catch {
      alert('❌ Failed to adjust balance');
    } finally {
      setSubmittingAction(false);
    }
  };

  const openAssignPremiumModal = (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    setActionTargetUser({ id: userId, name: targetUser?.name || 'User' });
    setPremiumAmountInput('');
    setPremiumPositionInput('');
    setShowAssignPremiumModal(true);
  };

  const submitAssignPremium = async () => {
    if (!actionTargetUser?.id) return;

    if (!premiumAmountInput.trim()) {
      alert('❌ Deficit amount is required');
      return;
    }

    const payload: any = { userId: actionTargetUser.id };
    const parsedAmount = Number(premiumAmountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('❌ Invalid deficit amount');
      return;
    }
    payload.amount = parsedAmount;

    if (premiumPositionInput.trim()) {
      const parsedPosition = Number(premiumPositionInput);
      if (!Number.isFinite(parsedPosition)) {
        alert('❌ Invalid deficit position');
        return;
      }
      payload.position = parsedPosition;
    }

    try {
      setSubmittingAction(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users/assign-premium`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to assign premium deficit${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminData();
      setShowAssignPremiumModal(false);
      setActionTargetUser(null);
      alert('✅ Premium deficit assigned successfully');
    } catch {
      alert('❌ Failed to assign premium deficit');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResetTaskSetForUser = async (userId: string, mode: 'manual' | 'complete_set' = 'manual') => {
    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users/reset-task-set`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, mode }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to reset task set${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminData();
      alert('✅ Task set reset successfully');
    } catch {
      alert('❌ Failed to reset task set');
    }
  };

  const handleUpdateTaskLimitsForUser = (userId: string, user: User) => {
    const targetUser = users.find((item) => item.id === userId);
    setTaskLimitsTargetUser({ id: userId, name: targetUser?.name || user.name || 'User' });
    setTaskLimitDailyInput(String(user.dailyTaskSetLimit ?? 3));
    setTaskLimitExtraInput(String(user.extraTaskSets ?? 0));
    setWithdrawalLimitInput(String(user.withdrawalLimit ?? 0));
    setCreditScoreInput(String(user.creditScore ?? 100));
    setShowTaskLimitsModal(true);
  };

  const submitTaskLimitsForUser = async () => {
    if (!taskLimitsTargetUser?.id) return;

    const dailyTaskSetLimit = Number(taskLimitDailyInput);
    const extraTaskSets = Number(taskLimitExtraInput);
    const withdrawalLimit = Number(withdrawalLimitInput);
    const creditScore = Number(creditScoreInput);

    if (!Number.isFinite(dailyTaskSetLimit) || dailyTaskSetLimit < 1) {
      alert('❌ Daily task set limit must be at least 1');
      return;
    }

    if (!Number.isFinite(extraTaskSets) || extraTaskSets < 0) {
      alert('❌ Extra task sets cannot be negative');
      return;
    }

    if (!Number.isFinite(withdrawalLimit) || withdrawalLimit < 0) {
      alert('❌ Withdrawal limit cannot be negative');
      return;
    }

    if (!Number.isFinite(creditScore) || creditScore < 0 || creditScore > 100) {
      alert('❌ Credit score must be between 0 and 100');
      return;
    }

    try {
      setSubmittingAction(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users/task-limits`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: taskLimitsTargetUser.id, dailyTaskSetLimit, extraTaskSets, withdrawalLimit, creditScore }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to update task limits${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminData();
      setShowTaskLimitsModal(false);
      setTaskLimitsTargetUser(null);
      alert('✅ Task limits updated successfully');
    } catch {
      alert('❌ Failed to update task limits');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateLimitedAdmin = async () => {
    const username = newAdminUsername.trim();
    const name = newAdminName.trim();
    const password = newAdminPassword;
    const permissions = newAdminPermissions
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (!username || !name || !password || permissions.length === 0) {
      alert('❌ Fill username, name, password, and permissions');
      return;
    }

    if (!superAdminKey.trim()) {
      alert('❌ Super admin key is required to create limited admin accounts');
      return;
    }

    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/accounts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, name, password, permissions }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to create limited admin${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      setNewAdminUsername('');
      setNewAdminName('');
      setNewAdminPassword('');
      setNewAdminPermissions('users.view');
      await loadAdminAccounts();
      alert('✅ Limited admin created');
    } catch {
      alert('❌ Failed to create limited admin');
    }
  };

  const handleToggleAdminActive = async (account: LimitedAdminAccount) => {
    if (!superAdminKey.trim()) {
      alert('❌ Super admin key is required to manage limited admin accounts');
      return;
    }

    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/accounts/${account.userId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${superAdminKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            active: !account.active,
            permissions: account.permissions,
            displayName: account.displayName,
          }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to update admin account${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminAccounts();
      alert('✅ Admin account updated');
    } catch {
      alert('❌ Failed to update admin account');
    }
  };

  const handleEditAdminPermissions = (account: LimitedAdminAccount) => {
    if (!superAdminKey.trim()) {
      alert('❌ Super admin key is required to manage limited admin accounts');
      return;
    }

    setPermissionsTargetAdmin(account);
    setPermissionsInput(account.permissions.join(','));
    setShowEditPermissionsModal(true);
  };

  const submitEditAdminPermissions = async () => {
    if (!permissionsTargetAdmin) return;
    if (!superAdminKey.trim()) {
      alert('❌ Super admin key is required to manage limited admin accounts');
      return;
    }

    const permissions = permissionsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (permissions.length === 0) {
      alert('❌ At least one permission is required');
      return;
    }

    try {
      setSubmittingAction(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/accounts/${permissionsTargetAdmin.userId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${superAdminKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            active: permissionsTargetAdmin.active,
            permissions,
            displayName: permissionsTargetAdmin.displayName,
          }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to update permissions${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminAccounts();
      setShowEditPermissionsModal(false);
      setPermissionsTargetAdmin(null);
      alert('✅ Admin permissions updated');
    } catch {
      alert('❌ Failed to update admin permissions');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveSupportLinks = async () => {
    if (!canManageSupport) {
      alert('❌ Missing permission: support.manage');
      return;
    }

    if (!supportLinks.whatsapp.trim() && !supportLinks.telegram.trim()) {
      alert('❌ Provide WhatsApp and/or Telegram link');
      return;
    }

    try {
      setSavingSupportLinks(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/contact-links`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whatsapp: supportLinks.whatsapp.trim(),
            telegram: supportLinks.telegram.trim(),
          }),
        }
      );

      const data = await response?.json().catch(() => ({}));
      if (!response?.ok) {
        alert(`❌ Failed to save links${data?.error ? `: ${data.error}` : ''}`);
        return;
      }

      setSupportLinks({
        whatsapp: String(data?.config?.whatsapp || supportLinks.whatsapp),
        telegram: String(data?.config?.telegram || supportLinks.telegram),
      });
      alert('✅ Customer Service links updated');
    } catch {
      alert('❌ Failed to save Customer Service links');
    } finally {
      setSavingSupportLinks(false);
    }
  };

  const handleAddAnnouncementDraft = () => {
    const title = announcementTitleDraft.trim();
    const message = announcementMessageDraft.trim();
    if (!title || !message) {
      alert('❌ Announcement title and message are required');
      return;
    }

    const now = new Date().toISOString();
    const nextItem: AnnouncementConfigItem = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      level: announcementLevelDraft,
      popup: announcementPopupDraft,
      active: true,
      createdAt: now,
      expiresAt: announcementExpiresAtDraft.trim() || null,
    };

    setAnnouncementsConfig((prev) => [nextItem, ...prev].slice(0, 50));
    setAnnouncementTitleDraft('');
    setAnnouncementMessageDraft('');
    setAnnouncementLevelDraft('info');
    setAnnouncementPopupDraft(true);
    setAnnouncementExpiresAtDraft('');
  };

  const handleToggleAnnouncementField = (id: string, field: 'active' | 'popup') => {
    setAnnouncementsConfig((prev) => prev.map((item) => (
      item.id === id ? { ...item, [field]: !item[field] } : item
    )));
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncementsConfig((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAnnouncements = async () => {
    if (!canManageSupport) {
      alert('❌ Missing permission: support.manage');
      return;
    }

    try {
      setSavingAnnouncements(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/announcements`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: announcementsConfig.map((item) => ({
              id: item.id,
              title: item.title,
              message: item.message,
              level: item.level,
              popup: item.popup,
              active: item.active,
              createdAt: item.createdAt,
              expiresAt: item.expiresAt || null,
            })),
          }),
        }
      );

      const data = await response?.json().catch(() => ({}));
      if (!response?.ok) {
        alert(`❌ Failed to save announcements${data?.error ? `: ${data.error}` : ''}`);
        return;
      }

      const savedItems = Array.isArray(data?.config?.items) ? data.config.items : [];
      setAnnouncementsConfig(savedItems.map((item: any) => ({
        id: String(item?.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        title: String(item?.title || ''),
        message: String(item?.message || ''),
        level: (String(item?.level || 'info').toLowerCase() === 'success'
          ? 'success'
          : String(item?.level || 'info').toLowerCase() === 'warning'
            ? 'warning'
            : 'info') as 'info' | 'success' | 'warning',
        popup: item?.popup !== false,
        active: item?.active !== false,
        createdAt: String(item?.createdAt || new Date().toISOString()),
        expiresAt: item?.expiresAt ? String(item.expiresAt) : null,
      })));
      alert('✅ Announcements updated');
    } catch {
      alert('❌ Failed to save announcements');
    } finally {
      setSavingAnnouncements(false);
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedSearchQuery) return true;
    return (
      String(user.name || '').toLowerCase().includes(normalizedSearchQuery)
      || String(user.email || '').toLowerCase().includes(normalizedSearchQuery)
      || String(user.id || '').toLowerCase().includes(normalizedSearchQuery)
      || String(user.vipTier || '').toLowerCase().includes(normalizedSearchQuery)
      || String(user.invitationCode || '').toLowerCase().includes(normalizedSearchQuery)
    );
  });

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'Normal': 'bg-gray-100 text-gray-800 border-gray-300',
      'Silver': 'bg-slate-100 text-slate-800 border-slate-300',
      'Gold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Platinum': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'Diamond': 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return colors[tier] || colors['Normal'];
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'denied') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getCaseStatusColor = (status: SupportCase['status']) => {
    if (status === 'resolved') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'in_progress') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getPriorityColor = (priority: SupportCase['priority']) => {
    if (priority === 'high') return 'text-red-700';
    if (priority === 'medium') return 'text-yellow-700';
    return 'text-green-700';
  };

  const handleToggleInvitationCode = (code: string) => {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) {
      alert('❌ Invitation code is missing. Please reload and try again.');
      return;
    }

    const target = invitationCodes.find(item => item.code === normalizedCode);
    if (!target) return;

    const nextStatus = target.status === 'active' ? 'disabled' : 'active';
    safeFetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/invitation-codes/status`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getAdminAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: normalizedCode, status: nextStatus }),
      }
    )
      .then(async (response: Response | null) => {
        if (!response) {
          alert('❌ Backend not reachable. Please try again.');
          return;
        }
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          alert(`❌ Failed to update invitation code status${errorData?.error ? `: ${errorData.error}` : ''}`);
          return;
        }
        await reloadInvitationCodes(users);
        alert(`✅ Invitation code ${normalizedCode} is now ${nextStatus}.`);
      })
      .catch(() => {
        alert('❌ Failed to update invitation code status');
      });
  };

  const handleAddInvitationCode = () => {
    const ownerUserId = users[0]?.id || null;
    safeFetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/invitation-codes/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAdminAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ownerUserId }),
      }
    )
      .then(async (response: Response | null) => {
        if (!response) {
          alert('❌ Backend not reachable. Please try again.');
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.invitationCode) {
          alert(`❌ Failed to generate invitation code${data?.error ? `: ${data.error}` : ''}`);
          return;
        }

        await reloadInvitationCodes(users);
        alert(`✅ New invitation code generated: ${data.invitationCode.code}`);
      })
      .catch(() => {
        alert('❌ Failed to generate invitation code');
      });
  };

  const handleUpdateCaseStatus = (id: string, nextStatus: SupportCase['status']) => {
    setSupportCases(prev => prev.map(item =>
      item.id === id ? { ...item, status: nextStatus, updatedAt: 'just now' } : item
    ));
    loadAdminAlerts(false);
  };

  const handleReplySupportCase = async (caseId: string) => {
    const message = (supportReplyDrafts[caseId] || '').trim();
    if (!message) {
      alert('❌ Reply message is required');
      return;
    }

    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/support-tickets/${caseId}/reply`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to reply${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      setSupportReplyDrafts((prev) => ({ ...prev, [caseId]: '' }));
      await loadAdminData();
      await loadAdminAlerts(false);
      alert('✅ Reply sent successfully');
    } catch {
      alert('❌ Failed to send reply');
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/approve-withdrawal`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ withdrawalId }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to approve withdrawal${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminWithdrawals();
      await loadAdminAlerts(false);
      await loadAdminData();
      alert('✅ Withdrawal approved successfully');
    } catch {
      alert('❌ Failed to approve withdrawal');
    }
  };

  const handleDenyWithdrawal = (withdrawalId: string) => {
    setDenyWithdrawalId(withdrawalId);
    setDenyReasonInput('Insufficient verification details');
    setShowDenyWithdrawalModal(true);
  };

  const submitDenyWithdrawal = async () => {
    const denialReason = String(denyReasonInput || '').trim();
    if (!denyWithdrawalId) return;
    if (!denialReason) {
      alert('❌ Denial reason is required');
      return;
    }

    try {
      setSubmittingAction(true);
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/deny-withdrawal`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAdminAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ withdrawalId: denyWithdrawalId, denialReason }),
        }
      );

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert(`❌ Failed to deny withdrawal${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminWithdrawals();
      await loadAdminAlerts(false);
      setShowDenyWithdrawalModal(false);
      setDenyWithdrawalId('');
      alert('✅ Withdrawal denied successfully');
    } catch {
      alert('❌ Failed to deny withdrawal');
    } finally {
      setSubmittingAction(false);
    }
  };

  const activeInvitationCount = invitationCodes.filter(item => item.status === 'active').length;
  const openSupportCount = supportCases.filter(item => item.status !== 'resolved').length;
  const filteredSupportCases = supportCases.filter((item) => {
    if (supportStatusFilter === 'all') return true;
    return item.status === supportStatusFilter;
  });
  const selectedSupportCase = filteredSupportCases.find((item) => item.id === selectedSupportCaseId)
    || filteredSupportCases[0]
    || null;
  const pendingWithdrawalCount = withdrawals.filter(item => item.status === 'pending').length;
  const pendingWithdrawalTotal = withdrawals
    .filter(item => item.status === 'pending')
    .reduce((total, item) => total + item.amount, 0);
  const selectedVipRange = vipCommissionRanges[vipCommissionTierSelection];
  const selectedVipConfig = getVipTierConfig(vipCommissionTierSelection);
  const selectedTaskCount = vipCommissionSetSelection === 'set1'
    ? selectedVipConfig.productsPerSet
    : selectedVipConfig.productsPerSet * 2;
  const selectedRate = Number(selectedVipConfig.commissionRate || 0);
  const requiredProductValueMin = selectedRate > 0 ? selectedVipRange.min / selectedRate : 0;
  const requiredProductValueMax = selectedRate > 0 ? selectedVipRange.max / selectedRate : 0;
  const estimatedPerProductMin = selectedTaskCount > 0 ? requiredProductValueMin / selectedTaskCount : 0;
  const estimatedPerProductMax = selectedTaskCount > 0 ? requiredProductValueMax / selectedTaskCount : 0;
  const selectedUserPremiumAmount = Math.max(
    0,
    Number(
      selectedUser?.premiumAssignment?.amount
      ?? selectedUser?.premiumAssignment?.enteredAmount
      ?? selectedUser?.freezeAmount
      ?? 0,
    ),
  );
  const selectedUserLedgerBalance = Number(selectedUser?.balance ?? 0);
  const hasSelectedUserPremiumSnapshot = Boolean(selectedUser?.accountFrozen) && selectedUserPremiumAmount > 0;
  const selectedUserPrePremiumBalance = Number.isFinite(Number(selectedUser?.premiumAssignment?.previousBalance))
    ? Number(selectedUser?.premiumAssignment?.previousBalance)
    : selectedUserLedgerBalance;
  const selectedUserCurrentBalance = hasSelectedUserPremiumSnapshot
    ? selectedUserPrePremiumBalance
    : selectedUserLedgerBalance;
  const selectedUserDisplayBalance = hasSelectedUserPremiumSnapshot
    ? (selectedUserPrePremiumBalance + selectedUserPremiumAmount)
    : selectedUserLedgerBalance;
  const selectedUserActiveHoldAmount = selectedUserPremiumAmount > 0
    ? selectedUserPremiumAmount
    : Math.max(
      Number(selectedUser?.freezeAmount ?? 0),
      -selectedUserLedgerBalance,
      Number(selectedUser?.premiumAssignment?.topUpRequired ?? 0),
    );
  const selectedUserFrozenHoldValue = selectedUser?.accountFrozen
    ? -Math.max(0, selectedUserActiveHoldAmount)
    : 0;
  const filteredTransactions = transactions.filter((transaction) => {
    if (transactionStatusFilter === 'all') return true;
    return (transaction.status ? transaction.status.toLowerCase() : '') === transactionStatusFilter;
  });
  const alertBadgeCount = alertsSummary.actionRequired;

  const getAlertSeverityStyles = (severity: AdminAlert['severity']) => {
    if (severity === 'critical') return 'bg-red-100 text-red-800 border-red-300';
    if (severity === 'high') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const formatAlertTime = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMin = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    if (filteredSupportCases.length === 0) {
      setSelectedSupportCaseId(null);
      return;
    }

    if (!selectedSupportCaseId || !filteredSupportCases.some((item) => item.id === selectedSupportCaseId)) {
      setSelectedSupportCaseId(filteredSupportCases[0].id);
    }
  }, [filteredSupportCases, selectedSupportCaseId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">Tanknewmedia Platform Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                className="h-9 w-9 p-0"
                title="Refresh all admin data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>

              <button
                type="button"
                onClick={() => setShowAlertsPanel((prev) => !prev)}
                className="relative h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {alertBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {alertBadgeCount > 99 ? '99+' : alertBadgeCount}
                  </span>
                )}
              </button>

              {showAlertsPanel && (
                <div className="absolute right-0 top-12 w-[26rem] max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-2xl z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">Critical Alerts</h3>
                      <span className="text-xs text-gray-500">Action required: {alertsSummary.actionRequired}</span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {adminAlerts.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">No active alerts.</div>
                    ) : (
                      adminAlerts.slice(0, 12).map((alert) => (
                        <div key={alert.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-gray-900">{alert.title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getAlertSeverityStyles(alert.severity)}`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatAlertTime(alert.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={onLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'premium', label: 'Premium Deficit Assignment', icon: Gift },
              { id: 'products', label: 'Products', icon: Gift },
              ...(canManageInvitations ? [{ id: 'invitations', label: 'Invitations', icon: UserPlus }] : []),
              { id: 'customer-service', label: 'Customer Service', icon: MessageSquare },
              ...(canViewAudit ? [{ id: 'audit', label: 'Audit Log', icon: Shield }] : []),
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
                    {activeTab === 'products' && (
                      <motion.div
                        key="products"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                      >
                          <Card className="border-0 shadow-lg">
                            <CardContent className="p-6 space-y-3">
                              <h3 className="text-lg font-bold text-gray-900">Product Catalog and Image Setup</h3>
                              <p className="text-sm text-gray-600">
                                Add products in the catalog, set image URL, and mark premium templates when needed.
                              </p>
                              <div className="text-xs text-gray-500 space-y-1">
                                <p>Tip: use Task Products in Premium Deficit Assignment to add image URLs and toggle active/archived status.</p>
                                <p>User-side task cards and review pages read product image URLs from this catalog.</p>
                              </div>
                            </CardContent>
                          </Card>
                          <PremiumManagementPanel
                            adminToken={adminAccessToken}
                            isSuperAdmin={adminIsSuperAdmin}
                          />
                      </motion.div>
                    )}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Users</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.totalUsers}</p>
                        <p className="text-blue-100 text-xs mt-1">↑ 12% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-white mt-1">${metrics.totalRevenue.toLocaleString()}</p>
                        <p className="text-green-100 text-xs mt-1">↑ 24% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Total Transactions</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.totalTransactions}</p>
                        <p className="text-purple-100 text-xs mt-1">↑ 18% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Active Users</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.activeUsers}</p>
                        <p className="text-orange-100 text-xs mt-1">Active in last 7 days</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm font-medium">Frozen Accounts</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.frozenAccounts}</p>
                        <p className="text-red-100 text-xs mt-1">Require attention</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Commissions Paid</p>
                        <p className="text-3xl font-bold text-white mt-1">${metrics.totalCommissionsPaid.toLocaleString()}</p>
                        <p className="text-cyan-100 text-xs mt-1">Lifetime total</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-100 text-sm font-medium">Active Invite Codes</p>
                        <p className="text-3xl font-bold text-white mt-1">{activeInvitationCount}</p>
                        <p className="text-indigo-100 text-xs mt-1">Invitation system status</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Link2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500 to-pink-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-100 text-sm font-medium">Open Support Cases</p>
                        <p className="text-3xl font-bold text-white mt-1">{openSupportCount}</p>
                        <p className="text-pink-100 text-xs mt-1">Customer service workload</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefreshAll}
                      disabled={isRefreshing}
                      className="h-8 w-8 p-0"
                      title="Refresh all admin data"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <Button
                      onClick={() => setActiveTab('users')}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                    {canAssignPremium && (
                      <Button
                        onClick={() => setActiveTab('premium')}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Premium Deficit Assignment
                      </Button>
                    )}
                    {canManageInvitations && (
                      <Button
                        onClick={() => setActiveTab('invitations')}
                        className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Invitation Codes
                      </Button>
                    )}
                    <Button
                      onClick={() => setActiveTab('withdrawals')}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Review Withdrawals
                    </Button>
                    <Button
                      onClick={() => setActiveTab('customer-service')}
                      className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Customer Service
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="space-y-1">
                        <p className="font-bold text-green-600">${transaction.commission.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Customer Service Queue</h3>
                    <Button
                      size="sm"
                      className="bg-pink-600 hover:bg-pink-700 text-white"
                      onClick={() => setActiveTab('customer-service')}
                    >
                      Open Inbox
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                      <p className="text-xs text-blue-700">Open</p>
                      <p className="text-lg font-bold text-blue-900">{supportCases.filter((item) => item.status === 'open').length}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs text-amber-700">In Progress</p>
                      <p className="text-lg font-bold text-amber-900">{supportCases.filter((item) => item.status === 'in_progress').length}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-xs text-emerald-700">Resolved</p>
                      <p className="text-lg font-bold text-emerald-900">{supportCases.filter((item) => item.status === 'resolved').length}</p>
                    </div>
                  </div>
                  {supportCases.length === 0 ? (
                    <p className="text-xs text-gray-600">No customer service cases yet. New user messages will appear in the Customer Service tab.</p>
                  ) : (
                    <div className="space-y-2">
                      {supportCases.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedSupportCaseId(item.id);
                            setActiveTab('customer-service');
                          }}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <p className="text-sm font-semibold text-gray-900">{item.userName || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">{item.id} • {item.category || 'General'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {canViewUsers ? (
                <>
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Premium Balance Migration</p>
                        <p className="text-xs text-gray-600">Recalculate and apply missing premium credits for current users using the new premium rule.</p>
                      </div>
                      {canAdjustBalance && (
                        <Button
                          type="button"
                          onClick={handleReconcilePremiumBalances}
                          disabled={isReconcilingPremiumBalances}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isReconcilingPremiumBalances ? 'animate-spin' : ''}`} />
                          {isReconcilingPremiumBalances ? 'Reconciling...' : 'Recalculate Premium Balances'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Search Bar */}
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search users by name, email, user ID, invitation code, or VIP tier..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-20"
                        />
                        {searchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Showing {filteredUsers.length} of {users.length} users
                      </p>
                    </CardContent>
                  </Card>

                  {/* Users Table */}
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIP Tier</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                                  {users.length === 0 ? 'No users available.' : 'No users match your search.'}
                                </td>
                              </tr>
                            ) : (
                              filteredUsers.map((user) => (
                                <tr key={user.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{user.vipTier}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-gray-900">{user.balance ? user.balance.toLocaleString() : '0'}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-gray-900">{user.productsSubmitted ?? 0}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {user.accountFrozen ? (
                                      <span className="flex items-center gap-1 text-red-600">
                                        <XCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Frozen</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Active</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopyUserId(user.id)}
                                      >
                                        <Copy className="w-4 h-4 mr-1" />
                                        {copiedUserId === user.id ? 'Copied' : 'Copy ID'}
                                      </Button>
                                      {canUnfreezeUsers && user.accountFrozen && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUnfreezeAccount(user.id)}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          Unfreeze
                                        </Button>
                                      )}
                                      {canAssignPremium && (
                                        <Button
                                          size="sm"
                                          className="bg-purple-600 hover:bg-purple-700 text-white"
                                          onClick={() => openAssignPremiumModal(user.id)}
                                        >
                                          Deficit
                                        </Button>
                                      )}
                                      {canAdjustBalance && (
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                          onClick={() => openAdjustBalanceModal(user.id)}
                                        >
                                          Adjust
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setShowUserDetails(true);
                                        }}
                                      >
                                        Details
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600">You do not have permission to view users.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'withdrawals' && (
            <motion.div
              key="withdrawals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <CardContent className="p-6">
                    <p className="text-blue-100 text-sm font-medium">Pending Requests</p>
                    <p className="text-3xl font-bold text-white mt-1">{pendingWithdrawalCount}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600">
                  <CardContent className="p-6">
                    <p className="text-green-100 text-sm font-medium">Pending Amount</p>
                    <p className="text-3xl font-bold text-white mt-1">${pendingWithdrawalTotal.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <CardContent className="p-6">
                    <p className="text-purple-100 text-sm font-medium">Mode</p>
                    <p className="text-3xl font-bold text-white mt-1">Live</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Pending Withdrawals</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadAdminWithdrawals}
                      className="h-8 w-8 p-0"
                      title="Refresh withdrawals"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>

                  {withdrawals.filter((item) => item.status === 'pending').length === 0 ? (
                    <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
                      No pending withdrawals.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {withdrawals
                        .filter((item) => item.status === 'pending')
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                              <p className="font-semibold text-gray-900">{item.userName}</p>
                              <p className="text-sm text-gray-600">{item.userEmail || 'No contact email'}</p>
                              <p className="text-xs text-gray-500 mt-1">Requested: {new Date(item.requestedAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-lg text-gray-900 min-w-[120px] text-right">${item.amount.toLocaleString()}</p>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApproveWithdrawal(item.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDenyWithdrawal(item.id)}
                              >
                                Deny
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">All Transactions</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={transactionStatusFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setTransactionStatusFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant={transactionStatusFilter === 'approved' ? 'default' : 'outline'}
                        onClick={() => setTransactionStatusFilter('approved')}
                      >
                        Approved
                      </Button>
                      <Button
                        size="sm"
                        variant={transactionStatusFilter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setTransactionStatusFilter('pending')}
                      >
                        Pending
                      </Button>
                      <Button
                        size="sm"
                        variant={transactionStatusFilter === 'denied' ? 'default' : 'outline'}
                        onClick={() => setTransactionStatusFilter('denied')}
                      >
                        Denied
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </p>
                  <div className="space-y-3">
                    {filteredTransactions.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
                        No transactions found for this filter.
                      </div>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{transaction.productName ?? ''}</p>
                              <p className="text-sm text-gray-500">{transaction.userName ?? ''}</p>
                              <p className="text-xs text-gray-400 mt-1">{transaction.timestamp}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xl text-green-600 mb-1">
                              ${transaction.commission.toFixed(2)}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status ?? '')}`}> 
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'premium' && (
            <motion.div
              key="premium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <PremiumManagementPanel
                adminToken={adminAccessToken}
                isSuperAdmin={adminIsSuperAdmin}
              />
            </motion.div>
          )}

          {activeTab === 'invitations' && (
            <motion.div
              key="invitations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Invitation Code Management</h3>
                    {canManageInvitations && (
                      <Button onClick={handleAddInvitationCode} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Generate Code
                      </Button>
                    )}
                  </div>
                  {!canManageInvitations && (
                    <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-3 py-2 mb-4">
                      You do not have permission to manage invitation codes. Ask super admin to grant <span className="font-mono">invitations.manage</span>.
                    </p>
                  )}
                  <div className="space-y-3">
                    {invitationCodes.length === 0 ? (
                      <div className="p-6 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                        No invitation codes available for this admin account.
                      </div>
                    ) : invitationCodes.map((item) => (
                      <div key={item.code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900">{item.code}</p>
                          <p className="text-sm text-gray-600">Owner: {item.owner || 'Platform Invite'} • Referrals: {Number.isFinite(item.referrals) ? item.referrals : 0}</p>
                          <p className="text-xs text-gray-500 mt-1">Generated: {item.generatedAt || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(item.code)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleToggleInvitationCode(item.code)}
                            disabled={!canManageInvitations}
                            className={item.status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                          >
                            {item.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            item.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'customer-service' && (
            <motion.div
              key="customer-service"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Customer Service Cases</h3>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={supportStatusFilter === 'all' ? 'default' : 'outline'} onClick={() => setSupportStatusFilter('all')}>
                        All ({supportCases.length})
                      </Button>
                      <Button size="sm" variant={supportStatusFilter === 'open' ? 'default' : 'outline'} onClick={() => setSupportStatusFilter('open')}>
                        Open ({supportCases.filter((item) => item.status === 'open').length})
                      </Button>
                      <Button size="sm" variant={supportStatusFilter === 'in_progress' ? 'default' : 'outline'} onClick={() => setSupportStatusFilter('in_progress')}>
                        In Progress ({supportCases.filter((item) => item.status === 'in_progress').length})
                      </Button>
                      <Button size="sm" variant={supportStatusFilter === 'resolved' ? 'default' : 'outline'} onClick={() => setSupportStatusFilter('resolved')}>
                        Resolved ({supportCases.filter((item) => item.status === 'resolved').length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        className="h-8 w-8 p-0"
                        title="Refresh all admin data"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-5 p-4 rounded-lg border border-blue-200 bg-blue-50 space-y-3">
                    <h4 className="font-semibold text-blue-900">Customer Service Contact Links</h4>
                    <p className="text-xs text-blue-800">Configure WhatsApp and Telegram links shown to users in customer service chat.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                      value={supportLinks.whatsapp}
                      onChange={(e) => setSupportLinks((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="https://wa.me/..."
                      disabled={!canManageSupport}
                      />
                      <Input
                      value={supportLinks.telegram}
                      onChange={(e) => setSupportLinks((prev) => ({ ...prev, telegram: e.target.value }))}
                      placeholder="https://t.me/..."
                      disabled={!canManageSupport}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveSupportLinks}
                        disabled={!canManageSupport || savingSupportLinks}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {savingSupportLinks ? 'Saving...' : 'Save CS Links'}
                      </Button>
                      {!canManageSupport && (
                        <span className="text-xs text-gray-600">Permission required: support.manage</span>
                      )}
                    </div>
                  </div>

                  {filteredSupportCases.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600">
                      {supportCases.length === 0
                        ? 'No customer service cases yet. Once users create tickets, they will appear here.'
                        : 'No cases in this filter.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white max-h-[30rem] overflow-y-auto">
                        {filteredSupportCases.map((item) => {
                          const isSelected = selectedSupportCase?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedSupportCaseId(item.id)}
                              className={`w-full text-left p-4 border-b border-gray-100 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{item.userName || 'Unknown User'}</p>
                                  <p className="text-xs text-gray-500">{item.id}</p>
                                  <p className="text-xs text-gray-600 mt-1">{item.category || 'General'}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${getCaseStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                              </div>
                              <p className={`text-xs mt-2 font-semibold ${getPriorityColor(item.priority)}`}>
                                Priority: {item.priority}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1">Updated: {item.updatedAt} • Replies: {item.repliesCount || 0}</p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                        {!selectedSupportCase ? (
                          <div className="text-sm text-gray-600">Select a case to open the chat thread.</div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{selectedSupportCase.userName || 'Unknown User'}</p>
                                <p className="text-xs text-gray-500">{selectedSupportCase.id} • {selectedSupportCase.category || 'General'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => handleUpdateCaseStatus(selectedSupportCase.id, 'in_progress')}>
                                  In Progress
                                </Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateCaseStatus(selectedSupportCase.id, 'resolved')}>
                                  Resolve
                                </Button>
                              </div>
                            </div>

                            <div className="max-h-[20rem] overflow-y-auto space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                              {(selectedSupportCase.messages || []).length > 0 ? (
                                (selectedSupportCase.messages || []).map((message) => (
                                  <div key={message.id} className={`flex ${message.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-lg ${message.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                                      <p className="text-xs font-semibold opacity-90">{message.sender}</p>
                                      <p className="text-sm">{message.message}</p>
                                      <p className="text-[10px] mt-1 opacity-70">{message.createdAt}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500">No chat messages yet for this case.</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                value={supportReplyDrafts[selectedSupportCase.id] || ''}
                                onChange={(e) => setSupportReplyDrafts((prev) => ({ ...prev, [selectedSupportCase.id]: e.target.value }))}
                                placeholder="Type response to this user..."
                              />
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => handleReplySupportCase(selectedSupportCase.id)}
                              >
                                Send Reply
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Admin Audit Log</h3>
                    <Button size="sm" variant="outline" onClick={loadAdminAuditLog} disabled={loadingAuditLog}>
                      {loadingAuditLog ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                  {adminAuditLog.length === 0 ? (
                    <div className="p-6 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                      {loadingAuditLog ? 'Loading audit entries...' : 'No audit entries available for your scope.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {adminAuditLog.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-gray-900">{entry.action}</p>
                            <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Actor: {entry.actorType === 'super_admin' ? 'Super Admin' : (entry.actorUserId || 'Limited Admin')}
                            {entry.targetUserId ? ` | Target User: ${entry.targetUserId}` : ''}
                            {entry.targetIdentifier ? ` | Target: ${entry.targetIdentifier}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">VIP Commission Ranges</h4>
                          <p className="text-xs text-gray-500">Configure total commission earnings per VIP level (both task sets combined).</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={handleResetVipCommissionRanges}>
                            Reset Defaults
                          </Button>
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleSaveVipCommissionRanges}
                            disabled={savingVipCommissionRanges}
                          >
                            {savingVipCommissionRanges ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                        <p className="font-semibold mb-1">How it works:</p>
                        <p>When assigning tasks, the system should keep each VIP tier within your target commission range.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-gray-200 text-gray-600">
                              <th className="py-2 pr-3">VIP Level</th>
                              <th className="py-2 pr-3">Minimum Commission ($)</th>
                              <th className="py-2 pr-3">Maximum Commission ($)</th>
                              <th className="py-2">Range</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(VIP_TIER_ORDER as VipTierName[]).map((tier) => {
                              const row = vipCommissionRanges[tier];
                              const spread = Math.max(0, Number(row.max || 0) - Number(row.min || 0));
                              return (
                                <tr key={tier} className="border-b border-gray-100 text-gray-800">
                                  <td className="py-2 pr-3 font-semibold">{VIP_COMMISSION_TIER_LABELS[tier]}</td>
                                  <td className="py-2 pr-3">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={row.min}
                                      onChange={(e) => updateVipCommissionRange(tier, 'min', e.target.value)}
                                    />
                                  </td>
                                  <td className="py-2 pr-3">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={row.max}
                                      onChange={(e) => updateVipCommissionRange(tier, 'max', e.target.value)}
                                    />
                                  </td>
                                  <td className="py-2">
                                    <span className="font-semibold">${Number(row.min || 0).toFixed(2)} - ${Number(row.max || 0).toFixed(2)}</span>
                                    <span className="text-xs text-gray-500"> (spread: ${spread.toFixed(2)})</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                        <p className="font-semibold mb-1">Example Calculation</p>
                        <p>
                          For {VIP_COMMISSION_TIER_LABELS[vipCommissionTierSelection]} with ${selectedVipRange.min.toFixed(2)} - ${selectedVipRange.max.toFixed(2)}:
                          tasks in selected set should total commission within this band.
                        </p>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                        <h5 className="font-semibold text-gray-900">Commission Calculator</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            className="h-10 rounded-md border border-gray-300 bg-white px-3"
                            value={vipCommissionTierSelection}
                            onChange={(e) => setVipCommissionTierSelection(e.target.value as VipTierName)}
                          >
                            {(VIP_TIER_ORDER as VipTierName[]).map((tier) => (
                              <option key={tier} value={tier}>{VIP_COMMISSION_TIER_LABELS[tier]}</option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-md border border-gray-300 bg-white px-3"
                            value={vipCommissionSetSelection}
                            onChange={(e) => setVipCommissionSetSelection(e.target.value as 'set1' | 'set2')}
                          >
                            <option value="set1">Set 1 (No Deficit Assignment)</option>
                            <option value="set2">Set 1 + Set 2 (Both Sets)</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                          <p>Commission rate: <strong>{(selectedRate * 100).toFixed(2)}%</strong> • Tasks: <strong>{selectedTaskCount}</strong></p>
                          <p>Required product total: <strong>${requiredProductValueMin.toFixed(2)} - ${requiredProductValueMax.toFixed(2)}</strong></p>
                          <p>Estimated per product value: <strong>${estimatedPerProductMin.toFixed(2)} - ${estimatedPerProductMax.toFixed(2)}</strong></p>
                          <p>Tier product range baseline: <strong>${selectedVipConfig.productMin.toLocaleString()} - ${selectedVipConfig.productMax.toLocaleString()}</strong></p>
                        </div>
                      </div>
                    </div>

                    {adminIsSuperAdmin ? (
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
                        <h4 className="font-semibold text-indigo-900">Create Limited Admin</h4>
                        <Input
                          value={superAdminKey}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSuperAdminKey(value);
                            if (typeof window !== 'undefined') {
                              window.sessionStorage.setItem('superAdminKey', value);
                            }
                          }}
                          type="password"
                          placeholder="Super admin key (required)"
                        />
                        <p className="text-xs text-indigo-700">
                          Required only for limited-admin account management actions.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} placeholder="Username" />
                          <Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Display name" />
                          <Input value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} type="password" placeholder="Password" />
                          <Input value={newAdminPermissions} onChange={(e) => setNewAdminPermissions(e.target.value)} placeholder="permissions comma-separated" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setNewAdminPermissions('users.view,users.reset_password,invitations.manage,support.manage')}
                          >
                            Apply Invite+Support Preset
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setNewAdminPermissions('users.view,users.adjust_balance,users.assign_premium,users.reset_password,users.reset_tasks,users.manage_task_limits,users.unfreeze,users.update_vip,withdrawals.manage,support.manage,invitations.manage')}
                          >
                            Apply Ops Preset
                          </Button>
                        </div>
                        <p className="text-xs text-indigo-700">
                          Allowed permissions: {LIMITED_ADMIN_PERMISSION_OPTIONS.join(', ')}
                        </p>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreateLimitedAdmin}>
                          Create Limited Admin
                        </Button>

                        <div className="space-y-2 mt-3">
                          {adminAccounts.length === 0 ? (
                            <p className="text-xs text-indigo-700">No limited admin accounts loaded.</p>
                          ) : (
                            adminAccounts.map((account) => (
                              <div key={account.userId} className="flex items-center justify-between p-2 rounded border border-indigo-200 bg-white">
                                <div>
                                  <p className="text-sm font-semibold text-indigo-900">{account.displayName} ({account.username})</p>
                                  <p className="text-xs text-indigo-700">{account.permissions.join(', ')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditAdminPermissions(account)}
                                  >
                                    Edit Access
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleToggleAdminActive(account)}
                                    className={account.active ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                                  >
                                    {account.active ? 'Disable' : 'Enable'}
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700 font-medium">Limited admin account</p>
                        <p className="text-xs text-gray-600 mt-1">User and account-management controls are restricted to super admin.</p>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <h4 className="font-semibold text-blue-900">Announcement System</h4>
                      <p className="text-xs text-blue-800">Compose platform announcements and choose whether they should appear as popups.</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={announcementTitleDraft}
                          onChange={(e) => setAnnouncementTitleDraft(e.target.value)}
                          placeholder="Announcement title"
                          disabled={!canManageSupport}
                        />
                        <Input
                          type="datetime-local"
                          value={announcementExpiresAtDraft}
                          onChange={(e) => setAnnouncementExpiresAtDraft(e.target.value)}
                          placeholder="Expiry (optional)"
                          disabled={!canManageSupport}
                        />
                      </div>

                      <textarea
                        value={announcementMessageDraft}
                        onChange={(e) => setAnnouncementMessageDraft(e.target.value)}
                        placeholder="Announcement message"
                        disabled={!canManageSupport}
                        className="w-full min-h-[88px] rounded-md border border-blue-200 bg-white p-3 text-sm text-gray-800"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={announcementLevelDraft}
                          onChange={(e) => setAnnouncementLevelDraft(e.target.value as 'info' | 'success' | 'warning')}
                          disabled={!canManageSupport}
                          className="h-10 rounded-md border border-blue-200 bg-white px-3 text-sm"
                        >
                          <option value="info">Info</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                        </select>
                        <label className="inline-flex items-center gap-2 text-sm text-blue-900">
                          <input
                            type="checkbox"
                            checked={announcementPopupDraft}
                            onChange={(e) => setAnnouncementPopupDraft(e.target.checked)}
                            disabled={!canManageSupport}
                          />
                          Show as popup
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddAnnouncementDraft}
                          disabled={!canManageSupport}
                        >
                          Add To Queue
                        </Button>
                        <Button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleSaveAnnouncements}
                          disabled={!canManageSupport || savingAnnouncements}
                        >
                          {savingAnnouncements ? 'Saving...' : 'Publish Announcements'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {announcementsConfig.length === 0 ? (
                          <p className="text-xs text-blue-800">No announcements configured yet.</p>
                        ) : (
                          announcementsConfig.map((item) => (
                            <div key={item.id} className="rounded-md border border-blue-200 bg-white p-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                  <p className="text-xs text-gray-500">{item.level.toUpperCase()} • {item.createdAt}</p>
                                  {item.expiresAt ? (
                                    <p className="text-xs text-gray-500">Expires: {item.expiresAt}</p>
                                  ) : null}
                                  <p className="text-sm text-gray-700 mt-1">{item.message}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleAnnouncementField(item.id, 'active')}
                                    disabled={!canManageSupport}
                                  >
                                    {item.active ? 'Active' : 'Inactive'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleAnnouncementField(item.id, 'popup')}
                                    disabled={!canManageSupport}
                                  >
                                    {item.popup ? 'Popup On' : 'Popup Off'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => handleDeleteAnnouncement(item.id)}
                                    disabled={!canManageSupport}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {!canManageSupport && (
                        <span className="text-xs text-gray-600 self-center">Permission required: support.manage</span>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <h4 className="font-semibold text-blue-900">Customer Service Contact Links</h4>
                      <p className="text-xs text-blue-800">These links are shown to users in Customer Service chat (WhatsApp/Telegram).</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={supportLinks.whatsapp}
                          onChange={(e) => setSupportLinks((prev) => ({ ...prev, whatsapp: e.target.value }))}
                          placeholder="https://wa.me/..."
                          disabled={!canManageSupport}
                        />
                        <Input
                          value={supportLinks.telegram}
                          onChange={(e) => setSupportLinks((prev) => ({ ...prev, telegram: e.target.value }))}
                          placeholder="https://t.me/TanknewMedia01"
                          disabled={!canManageSupport}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveSupportLinks}
                          disabled={!canManageSupport || savingSupportLinks}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {savingSupportLinks ? 'Saving...' : 'Save CS Links'}
                        </Button>
                        {!canManageSupport && (
                          <span className="text-xs text-gray-600 self-center">Permission required: support.manage</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserDetails && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUserDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
              </div>

              <div className="p-6 space-y-6">
                {/* User Info */}
                {null}
                {/* Debug: Log selectedUser in modal render */}
                {(() => { console.log('DEBUG: Rendering User Details Modal for', selectedUser); return null; })()}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 break-all">{selectedUser.id}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyUserId(selectedUser.id)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copiedUserId === selectedUser.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">VIP Tier</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(selectedUser.vipTier ?? '')}`}>
                      {selectedUser.vipTier}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className={`font-bold text-lg ${selectedUserDisplayBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${selectedUserDisplayBalance.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Current Balance</p>
                    <p className="font-bold text-base text-gray-900">
                      ${selectedUserCurrentBalance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Products Submitted</p>
                    <p className="font-semibold text-gray-900">{selectedUser.productsSubmitted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Account Status</p>
                    <p className={`font-semibold ${selectedUser.accountFrozen ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedUser.accountFrozen ? 'Frozen' : 'Active'}
                    </p>
                    {selectedUser.accountFrozen && (
                      <p className="text-xs font-semibold text-red-600">
                        Hold Amount: ${selectedUserFrozenHoldValue.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Login Location</p>
                    <p className="font-semibold text-gray-900">{formatLocationLabel(selectedUser.lastLoginCountry ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Login IP</p>
                    <p className="font-semibold text-gray-900">{formatIpLabel(selectedUser.lastLoginIp ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Task Set Progress</p>
                    <p className="font-semibold text-gray-900">
                      {selectedUser.currentSetTasksCompleted || 0} / {getTasksPerSetForTier(selectedUser.vipTier || 'Normal')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Daily Sets Used</p>
                    <p className="font-semibold text-gray-900">
                      {(selectedUser.taskSetsCompletedToday ?? 0)} / {((selectedUser.dailyTaskSetLimit ?? 3) + (selectedUser.extraTaskSets ?? 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reset Alert</p>
                    <p className={`font-semibold ${isResetRequired(selectedUser) ? 'text-amber-700' : 'text-green-700'}`}>
                      {isResetRequired(selectedUser) ? 'Reset required - task set complete' : 'No reset required'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Credit Score</p>
                    <p className="font-semibold text-gray-900">{Number(selectedUser.creditScore ?? 100).toFixed(0)}%</p>
                  </div>
                </div>

                {(canManageUsers || canAssignPremium) && (
                  <>
                    {canUpdateVip && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Change VIP Tier</h4>
                        <div className="grid grid-cols-5 gap-2">
                          {['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => (
                            <Button
                              key={tier}
                              size="sm"
                              onClick={() => handleUpdateVIPTier(selectedUser.id, tier)}
                              className={selectedUser.vipTier === tier ? 'bg-purple-600 text-white' : ''}
                              variant={selectedUser.vipTier === tier ? 'default' : 'outline'}
                            >
                              {tier}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-6 space-y-3">
                      <h4 className="font-semibold text-gray-900">Account & Task Actions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {canAdjustBalance && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openAdjustBalanceModal(selectedUser.id)}>
                            Bonus/Topup
                          </Button>
                        )}
                        {canAssignPremium && (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => openAssignPremiumModal(selectedUser.id)}>
                            Premium Deficit Assignment
                          </Button>
                        )}
                        {canResetTasks && (
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() =>
                              handleResetTaskSetForUser(
                                selectedUser.id,
                                isResetRequired(selectedUser) ? 'complete_set' : 'manual',
                              )
                            }
                          >
                            Reset Task Set
                          </Button>
                        )}
                        {canManageTaskLimits && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateTaskLimitsForUser(selectedUser.id, selectedUser)}>
                            Set Limits
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <Button onClick={() => setShowUserDetails(false)} variant="outline">
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTaskLimitsModal && taskLimitsTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <h3 className="text-lg font-bold">Update Task Limits</h3>
              <p className="text-xs opacity-90">User: {taskLimitsTargetUser.name}</p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Task Set Limit</label>
                <Input
                  type="number"
                  min="1"
                  value={taskLimitDailyInput}
                  onChange={(e) => setTaskLimitDailyInput(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Task Sets (Provision)</label>
                <Input
                  type="number"
                  min="0"
                  value={taskLimitExtraInput}
                  onChange={(e) => setTaskLimitExtraInput(e.target.value)}
                  placeholder="e.g. 0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Limit (0 = no cap)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={withdrawalLimitInput}
                  onChange={(e) => setWithdrawalLimitInput(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score (0 - 100)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={creditScoreInput}
                  onChange={(e) => setCreditScoreInput(e.target.value)}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full min-w-0"
                  onClick={() => {
                    setShowTaskLimitsModal(false);
                    setTaskLimitsTargetUser(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full min-w-0 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={submitTaskLimitsForUser}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Saving...' : 'Save Limits'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditPermissionsModal && permissionsTargetAdmin && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <h3 className="text-lg font-bold">Edit Admin Access</h3>
              <p className="text-xs opacity-90">Admin: {permissionsTargetAdmin.username}</p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions (comma-separated)</label>
                <textarea
                  value={permissionsInput}
                  onChange={(e) => setPermissionsInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[90px]"
                  placeholder="users.view,users.adjust_balance"
                />
              </div>
              <p className="text-xs text-gray-500">
                Allowed: {LIMITED_ADMIN_PERMISSION_OPTIONS.join(', ')}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full min-w-0"
                  onClick={() => {
                    setShowEditPermissionsModal(false);
                    setPermissionsTargetAdmin(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full min-w-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={submitEditAdminPermissions}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Saving...' : 'Update Access'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDenyWithdrawalModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white">
              <h3 className="text-lg font-bold">Deny Withdrawal</h3>
              <p className="text-xs opacity-90">Provide a reason for this action</p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Denial Reason</label>
                <Input
                  type="text"
                  value={denyReasonInput}
                  onChange={(e) => setDenyReasonInput(e.target.value)}
                  placeholder="Required"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full min-w-0"
                  onClick={() => {
                    setShowDenyWithdrawalModal(false);
                    setDenyWithdrawalId('');
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full min-w-0 bg-red-600 hover:bg-red-700 text-white"
                  onClick={submitDenyWithdrawal}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Saving...' : 'Confirm Deny'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdjustBalanceModal && actionTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <h3 className="text-lg font-bold">Adjust Balance</h3>
              <p className="text-xs opacity-90">User: {actionTargetUser.name}</p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (+/-)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={adjustBalanceAmount}
                  onChange={(e) => setAdjustBalanceAmount(e.target.value)}
                  placeholder="e.g. 100 or -50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={adjustBalanceCategory}
                  onChange={(e) => setAdjustBalanceCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="bonus">bonus</option>
                  <option value="reward">reward</option>
                  <option value="topup">topup</option>
                  <option value="adjustment">adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <Input
                  type="text"
                  value={adjustBalanceNote}
                  onChange={(e) => setAdjustBalanceNote(e.target.value)}
                  placeholder="Reason"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full min-w-0"
                  onClick={() => {
                    setShowAdjustBalanceModal(false);
                    setActionTargetUser(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full min-w-0 bg-green-600 hover:bg-green-700 text-white"
                  onClick={submitAdjustBalance}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Saving...' : 'Submit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignPremiumModal && actionTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white">
              <h3 className="text-lg font-bold">Premium Deficit Assignment</h3>
              <p className="text-xs opacity-90">User: {actionTargetUser.name}</p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deficit Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={premiumAmountInput}
                  onChange={(e) => setPremiumAmountInput(e.target.value)}
                  placeholder="Required"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Encounter Position (optional)</label>
                <Input
                  type="number"
                  value={premiumPositionInput}
                  onChange={(e) => setPremiumPositionInput(e.target.value)}
                  placeholder="Leave blank for global default"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full min-w-0"
                  onClick={() => {
                    setShowAssignPremiumModal(false);
                    setActionTargetUser(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full min-w-0 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={submitAssignPremium}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Saving...' : 'Assign Deficit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin password reset form */}
      {canResetPasswords && (
      <div className="admin-reset-form mt-8">
        <h2 className="text-xl font-bold mb-4">Admin Password Reset</h2>
        <p className="text-sm text-gray-600 mb-3 text-center">
          Use the exact user ID from Users tab for reliable password reset.
        </p>
        <form onSubmit={handleAdminReset} className="flex flex-col gap-4 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Username or User ID"
            value={resetUserId}
            onChange={e => setResetUserId(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="New Password"
            value={resetPassword}
            onChange={e => setResetPassword(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 rounded">Reset Password</button>
        </form>
        {resetStatus && (
          <div className={`mt-2 text-sm text-center ${resetStatus.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {resetStatus}
          </div>
        )}
      </div>
      )}
    </div>
  );
}