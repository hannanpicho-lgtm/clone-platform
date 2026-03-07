import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';

// Import all required types

interface User {
  id: string;
  name?: string;
  email?: string;
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
interface LimitedAdminAccount {
  id: string;
  username: string;
  name?: string;
  permissions: string[];
  userId?: string;
  active?: boolean;
  displayName?: string;
}
interface AdminDashboardProps {
  onLogout: () => void;
  adminAccessToken?: string;
  adminIsSuperAdmin?: boolean;
  adminPermissions?: string[];
}



// Stub imports for icons and components (accept props, return null)
const Users = (props: any) => null;
const DollarSign = (props: any) => null;
const Activity = (props: any) => null;
const Gift = (props: any) => null;
const UserPlus = (props: any) => null;
const MessageSquare = (props: any) => null;
const Settings = (props: any) => null;
const BarChart3 = (props: any) => null;
const XCircle = (props: any) => null;
const CheckCircle = (props: any) => null;
const RefreshCw = (props: any) => null;
const Search = (props: any) => null;
const Shield = (props: any) => null;
const Bell = (props: any) => null;
const LogOut = (props: any) => null;
const TrendingUp = (props: any) => null;
const AlertTriangle = (props: any) => null;
const Zap = (props: any) => null;
const Link2 = (props: any) => null;
const Ticket = (props: any) => null;
const AdminProductManager = (props: any) => null;
const Copy = (props: any) => null;
const PremiumManagementPanel = (props: any) => null;

export function AdminDashboard({ onLogout, adminAccessToken, adminIsSuperAdmin = true, adminPermissions = ['*'] }: AdminDashboardProps) {
    // Utility functions and permission variables (must be inside the component)
    function formatLocationLabel(val: any) { return String(val || 'Unknown'); }
    function formatIpLabel(val: any) { return String(val || ''); }
    function getTasksPerSetForTier(tier: string) { return 3; }
    function isResetRequired(user: User) { return false; }
    const canViewUsers = true;
    const canManageUsers = true;
    const canAssignPremium = true;
    const canManageSupport = true;
    const canManageInvitations = true;
    const canUnfreezeUsers = true;
    const canAdjustBalance = true;
    const canUpdateVip = true;
    const canResetTasks = true;
    const canManageTaskLimits = true;
  // State hooks for permission options and action submission
  const [LIMITED_ADMIN_PERMISSION_OPTIONS] = useState<string[]>([]);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [permissionsInput, setPermissionsInput] = useState('');
  const [denyWithdrawalId, setDenyWithdrawalId] = useState('');
  const [denyReasonInput, setDenyReasonInput] = useState('');
    // --- TEMP STUBS FOR BUILD ---
    // Replace these with real implementations as needed
    const projectId = 'your-project-id';
    const safeFetch = (...args: [RequestInfo, RequestInit?]) => fetch(...args);
    const getAdminAuthToken = () => '';
    const setWithdrawalLimitInput = (v: string) => {};
    const withdrawalLimitInput = '0';
    const reloadInvitationCodes = async (_?: any) => {};
    const loadAdminWithdrawals = async () => {};
  // --- React state and logic ---
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'withdrawals' | 'transactions' | 'premium' | 'products' | 'invitations' | 'customer-service' | 'settings'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
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
  const [adminAccounts, setAdminAccounts] = useState<LimitedAdminAccount[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState('users.view,users.adjust_balance,users.assign_premium,users.reset_tasks,users.manage_task_limits,users.unfreeze,users.update_vip,invitations.manage,support.manage,withdrawals.manage');
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [supportReplyDrafts, setSupportReplyDrafts] = useState<Record<string, string>>({});
  const [supportStatusFilter, setSupportStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [supportLinks, setSupportLinks] = useState({ whatsapp: '', telegram: '' });
  const [savingSupportLinks, setSavingSupportLinks] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetStatus, setResetStatus] = useState('');
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

  async function handleAdminReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetStatus('');

    try {
      const response = await fetch('/api/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
      });

      if (response.ok) {
        setResetStatus('Password reset successfully.');
      } else {
        setResetStatus('Failed to reset password. Please check user ID and try again.');
      }
    } catch {
      setResetStatus('Error occurred. Please try again.');
    }
  }



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

      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const backendUsers = data.users || [];
        setUsers(backendUsers);
        setMetrics(data.metrics);

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

          if (linksResponse.ok) {
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
          const supportResponse = await safeFetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/support-tickets`,
            {
              headers: {
                Authorization: `Bearer ${getAdminAuthToken()}`,
              },
            }
          );

          if (supportResponse.ok) {
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
      } else {
        throw new Error('Backend not available');
      }
    } catch (err) {
      setUsers([]);
      setTransactions([]);
      setWithdrawals([]);
      setInvitationCodes([]);
      setSupportCases([]);
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
    const interval = setInterval(() => {
      loadAdminAlerts(false);
    }, 30000);

    // Debug: Log users and selectedUser state whenever they change
    console.log('DEBUG: users state', users);
    console.log('DEBUG: selectedUser state', selectedUser);
    console.log('DEBUG: supportCases state', supportCases);
    return () => clearInterval(interval);
  }, [users, supportCases, selectedUser]);

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

      if (response.ok) {
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

      if (response.ok) {
        loadAdminData();
        setSelectedUser(prev => prev ? { ...prev, vipTier: newTier } : prev);
        alert(`✅ VIP tier updated to ${newTier}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
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
      alert('❌ Premium amount is required');
      return;
    }

    const payload: any = { userId: actionTargetUser.id };
    const parsedAmount = Number(premiumAmountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('❌ Invalid premium amount');
      return;
    }
    payload.amount = parsedAmount;

    if (premiumPositionInput.trim()) {
      const parsedPosition = Number(premiumPositionInput);
      if (!Number.isFinite(parsedPosition)) {
        alert('❌ Invalid premium position');
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
        alert(`❌ Failed to assign premium${errorData?.error ? `: ${errorData.error}` : ''}`);
        return;
      }

      await loadAdminData();
      setShowAssignPremiumModal(false);
      setActionTargetUser(null);
      alert('✅ Premium assigned successfully');
    } catch {
      alert('❌ Failed to assign premium');
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
    setShowTaskLimitsModal(true);
  };

  const submitTaskLimitsForUser = async () => {
    if (!taskLimitsTargetUser?.id) return;

    const dailyTaskSetLimit = Number(taskLimitDailyInput);
    const extraTaskSets = Number(taskLimitExtraInput);
    const withdrawalLimit = Number(withdrawalLimitInput);

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
          body: JSON.stringify({ userId: taskLimitsTargetUser.id, dailyTaskSetLimit, extraTaskSets, withdrawalLimit }),
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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
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

  const filteredUsers = users.filter(user =>
    (user.name ? user.name.toLowerCase() : '').includes(searchQuery.toLowerCase()) ||
    (user.email ? user.email.toLowerCase() : '').includes(searchQuery.toLowerCase())
  );

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
    return status === 'approved' 
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-yellow-100 text-yellow-800 border-yellow-300';
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
      .then(async (response) => {
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
      .then(async (response) => {
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
  const pendingWithdrawalCount = withdrawals.filter(item => item.status === 'pending').length;
  const pendingWithdrawalTotal = withdrawals
    .filter(item => item.status === 'pending')
    .reduce((total, item) => total + item.amount, 0);
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
              { id: 'premium', label: 'Premium Products', icon: Gift },
              { id: 'products', label: 'Products', icon: Gift },
              ...(canManageInvitations ? [{ id: 'invitations', label: 'Invitations', icon: UserPlus }] : []),
              { id: 'customer-service', label: 'Customer Service', icon: MessageSquare },
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
                        <AdminProductManager />
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
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
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
                        Assign Premium
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
                    <Button
                      onClick={loadAdminData}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Data
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
                  {/* Search Bar */}
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search users by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
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
                            {users.map((user) => (
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
                                        Premium
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
                            ))}
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
                    <Button variant="outline" onClick={loadAdminWithdrawals}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
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
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredTransactions.map((transaction) => (
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
                    ))}
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
                      <Button size="sm" variant="outline" onClick={loadAdminData}>
                        Refresh
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

                  <div className="space-y-3">
                    {filteredSupportCases.length === 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600">
                        {supportCases.length === 0
                          ? 'No customer service cases yet. Once users create tickets, they will appear here.'
                          : 'No cases in this filter.'}
                      </div>
                    )}
                    {filteredSupportCases.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                          <p className="font-semibold text-gray-900">{item.id} • {item.userName}</p>
                          <p className="text-sm text-gray-600">{item.category}</p>
                          <p className={`text-xs mt-1 font-semibold ${getPriorityColor(item.priority)}`}>
                            Priority: {item.priority}
                          </p>
                            <p className="text-xs text-gray-500">Updated: {item.updatedAt} • Replies: {item.repliesCount || 0}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => handleUpdateCaseStatus(item.id, 'in_progress')}>
                              In Progress
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateCaseStatus(item.id, 'resolved')}>
                              Resolve
                            </Button>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCaseStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            value={supportReplyDrafts[item.id] || ''}
                            onChange={(e) => setSupportReplyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Type immediate response to user..."
                          />
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleReplySupportCase(item.id)}
                          >
                            Send Reply
                          </Button>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border border-gray-200 bg-white p-3">
                          {(item.messages || []).length > 0 ? (
                            (item.messages || []).map((message) => (
                              <div key={message.id} className={`flex ${message.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-lg ${message.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
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
                      </div>
                    ))}
                  </div>
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
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">VIP Tiers Configuration</h4>
                      <div className="space-y-2 text-sm text-purple-800">
                        <p>• Normal: 0.5% commission, 35 products, $99</p>
                        <p>• Silver: 0.8% commission, 40 products, $999</p>
                        <p>• Gold: 1.0% commission, 45 products, $2,999</p>
                        <p>• Platinum: 1.2% commission, 50 products, $4,999</p>
                        <p>• Diamond: 1.5% commission, 55 products, $9,999</p>
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
                            onClick={() => setNewAdminPermissions('users.view,invitations.manage,support.manage')}
                          >
                            Apply Invite+Support Preset
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setNewAdminPermissions('users.view,users.adjust_balance,users.assign_premium,users.reset_tasks,users.manage_task_limits,users.unfreeze,users.update_vip,withdrawals.manage,support.manage,invitations.manage')}
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
                    <p className="text-sm text-gray-500">VIP Tier</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(selectedUser.vipTier ?? '')}`}>
                      {selectedUser.vipTier}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className={`font-bold text-lg ${(selectedUser.balance ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${(selectedUser.balance ?? 0).toLocaleString()}
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
                            Assign Premium
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowTaskLimitsModal(false);
                    setTaskLimitsTargetUser(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowEditPermissionsModal(false);
                    setPermissionsTargetAdmin(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowDenyWithdrawalModal(false);
                    setDenyWithdrawalId('');
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowAdjustBalanceModal(false);
                    setActionTargetUser(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
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
              <h3 className="text-lg font-bold">Assign Premium</h3>
              <p className="text-xs opacity-90">User: {actionTargetUser.name}</p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium Amount</label>
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowAssignPremiumModal(false);
                    setActionTargetUser(null);
                  }}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={submitAssignPremium}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Saving...' : 'Assign'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin password reset form */}
      <div className="admin-reset-form mt-8">
        <h2 className="text-xl font-bold mb-4">Admin Password Reset</h2>
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
        {resetStatus && <div className="mt-2 text-sm text-green-600">{resetStatus}</div>}
      </div>
    </div>
  );
}