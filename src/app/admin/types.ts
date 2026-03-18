export type AdminRole = 'super-admin' | 'sub-admin';

export interface AdminSession {
  accessToken: string;
  role: AdminRole;
  permissions: string[];
  authenticatedAt: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  vipTier: string;
  balance: number;
  productsSubmitted: number;
  totalEarnings?: number;
  frozenNegativeAmount?: number;
  accountFrozen: boolean;
  freezeAmount?: number;
  accountDisabled: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  lastLoginCountry?: string | null;
  lastLoginIp?: string | null;
  dailyTaskSetLimit?: number;
  extraTaskSets?: number;
  withdrawalLimit?: number;
  taskSetsCompletedToday?: number;
  currentSetTasksCompleted?: number;
  currentSetDate?: string | null;
}

export interface AdminMetrics {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  activeUsers: number;
  frozenAccounts: number;
  totalCommissionsPaid: number;
}

export interface AdminSupportTicket {
  id: string;
  userId?: string | null;
  userName: string;
  subject: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  message?: string;
  createdAt?: string;
  updatedAt: string;
  repliesCount: number;
  unreadByAdmin?: boolean;
  unreadCount?: number;
  replies?: AdminSupportMessage[];
}

export interface AdminSupportMessage {
  id: string;
  userId?: string;
  userName: string;
  message: string;
  createdAt: string;
  role: 'user' | 'admin';
}

export interface AdminAuditLogItem {
  id: string;
  action: string;
  actorUserId?: string | null;
  actorType: 'super_admin' | 'limited_admin';
  targetUserId?: string | null;
  targetIdentifier?: string | null;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface LimitedAdminAccount {
  userId: string;
  username: string;
  displayName?: string;
  authEmail?: string;
  active: boolean;
  status: 'active' | 'disabled' | 'revoked';
  permissions: string[];
  usersCreated?: number;
  totalEarningsFromUsers?: number;
  createdAt?: string;
  updatedAt?: string | null;
  revokedAt?: string | null;
}

export interface AdminInvitationCode {
  code: string;
  owner: string;
  referrals: number;
  status: 'active' | 'disabled';
  generatedAt: string;
  ownerUserId?: string | null;
}

export interface AdminWithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  denialReason?: string;
}

export interface AdminSupportLinks {
  whatsapp: string;
  telegram: string;
  whatsapp2: string;
  telegram2: string;
}

export interface AdminAlertItem {
  id: string;
  type: 'withdrawal_pending' | 'withdrawal_approved' | 'withdrawal_denied' | 'support_ticket' | 'frozen_account' | 'new_referral' | 'premium_assignment';
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  message: string;
  createdAt: string;
  status: 'new' | 'action_required' | 'resolved';
}

export interface AdminAlertsSummary {
  total: number;
  actionRequired: number;
  pendingWithdrawals: number;
  openSupportTickets: number;
  frozenAccounts: number;
  critical: number;
  high: number;
}