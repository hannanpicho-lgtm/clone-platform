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
  accountFrozen: boolean;
  accountDisabled: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
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
  updatedAt: string;
  repliesCount: number;
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