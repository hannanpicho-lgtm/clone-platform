import { safeFetch } from '../../utils/safeFetch';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import type {
  AdminAuditLogItem,
  AdminMetrics,
  AdminSession,
  AdminSupportTicket,
  AdminUserRecord,
  LimitedAdminAccount,
} from './types';

const ADMIN_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3`;

async function adminFetch(session: AdminSession, path: string, init?: RequestInit) {
  return safeFetch(`${ADMIN_FUNCTION_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken || publicAnonKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

export async function fetchAdminUsers(session: AdminSession): Promise<{ users: AdminUserRecord[]; metrics: AdminMetrics }> {
  let page = 1;
  let totalPages = 1;
  const users: AdminUserRecord[] = [];
  let metrics: AdminMetrics = {
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    activeUsers: 0,
    frozenAccounts: 0,
    totalCommissionsPaid: 0,
  };

  while (page <= totalPages) {
    const response = await adminFetch(session, `/admin/users?page=${page}&limit=250`);
    if (!response || !response.ok) {
      throw new Error('Failed to fetch admin users');
    }

    const data = await response.json().catch(() => ({}));
    metrics = data?.metrics || metrics;
    const pageUsers = Array.isArray(data?.users) ? data.users : [];
    users.push(
      ...pageUsers.map((user: any) => ({
        id: String(user?.id || ''),
        name: String(user?.name || 'User'),
        email: String(user?.email || ''),
        vipTier: String(user?.vipTier || 'Normal'),
        balance: Number(user?.balance || 0),
        productsSubmitted: Number(user?.productsSubmitted || 0),
        accountFrozen: Boolean(user?.accountFrozen),
        accountDisabled: Boolean(user?.accountDisabled),
        createdAt: String(user?.createdAt || ''),
        lastLoginAt: user?.lastLoginAt ? String(user.lastLoginAt) : null,
      })),
    );

    totalPages = Number(data?.pagination?.totalPages || 1);
    page += 1;
  }

  return { users, metrics };
}

export async function fetchAdminSupportTickets(session: AdminSession): Promise<AdminSupportTicket[]> {
  const response = await adminFetch(session, '/admin/support-tickets');
  if (!response || !response.ok) {
    return [];
  }

  const data = await response.json().catch(() => ({}));
  const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
  return tickets.map((ticket: any) => ({
    id: String(ticket?.id || ''),
    userId: ticket?.userId ? String(ticket.userId) : null,
    userName: String(ticket?.userName || ticket?.user || 'Unknown User'),
    subject: String(ticket?.subject || ticket?.category || 'Support request'),
    category: String(ticket?.category || 'general'),
    priority: (ticket?.priority === 'high' ? 'high' : ticket?.priority === 'low' ? 'low' : 'medium') as 'high' | 'medium' | 'low',
    status: (ticket?.status === 'resolved' ? 'resolved' : ticket?.status === 'in_progress' || ticket?.status === 'in-progress' ? 'in_progress' : 'open') as 'open' | 'in_progress' | 'resolved',
    updatedAt: String(ticket?.updatedAt || ticket?.createdAt || new Date().toISOString()),
    repliesCount: Array.isArray(ticket?.replies) ? ticket.replies.length : 0,
  }));
}

export async function fetchAdminAuditLog(session: AdminSession, limit = 25): Promise<AdminAuditLogItem[]> {
  const response = await adminFetch(session, `/admin/audit-log?limit=${limit}`);
  if (!response || !response.ok) {
    return [];
  }

  const data = await response.json().catch(() => ({}));
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  return logs.map((log: any) => ({
    id: String(log?.id || ''),
    action: String(log?.action || 'unknown'),
    actorUserId: log?.actorUserId ? String(log.actorUserId) : null,
    actorType: log?.actorType === 'limited_admin' ? 'limited_admin' : 'super_admin',
    targetUserId: log?.targetUserId ? String(log.targetUserId) : null,
    targetIdentifier: log?.targetIdentifier ? String(log.targetIdentifier) : null,
    createdAt: String(log?.createdAt || ''),
    meta: log?.meta && typeof log.meta === 'object' ? log.meta : {},
  }));
}

export async function updateUserAccountStatus(session: AdminSession, userId: string, disabled: boolean): Promise<void> {
  const response = await adminFetch(session, '/admin/users/account-status', {
    method: 'PUT',
    body: JSON.stringify({ userId, disabled }),
  });
  if (!response || !response.ok) {
    const payload = response ? await response.json().catch(() => ({})) : {};
    throw new Error(payload?.error || 'Failed to update account status');
  }
}

export async function fetchSubAdmins(session: AdminSession): Promise<LimitedAdminAccount[]> {
  const response = await adminFetch(session, '/admin/accounts');
  if (!response || !response.ok) {
    throw new Error('Failed to fetch sub-admin accounts');
  }

  const data = await response.json().catch(() => ({}));
  const admins = Array.isArray(data?.admins) ? data.admins : [];
  return admins.map((admin: any) => ({
    userId: String(admin?.userId || ''),
    username: String(admin?.username || ''),
    displayName: admin?.displayName ? String(admin.displayName) : '',
    authEmail: admin?.authEmail ? String(admin.authEmail) : '',
    active: admin?.active !== false,
    status: admin?.status === 'revoked' ? 'revoked' : admin?.status === 'disabled' ? 'disabled' : 'active',
    permissions: Array.isArray(admin?.permissions) ? admin.permissions.map(String) : [],
    usersCreated: Number(admin?.usersCreated || 0),
    totalEarningsFromUsers: Number(admin?.totalEarningsFromUsers || 0),
    createdAt: admin?.createdAt ? String(admin.createdAt) : '',
    updatedAt: admin?.updatedAt ? String(admin.updatedAt) : null,
    revokedAt: admin?.revokedAt ? String(admin.revokedAt) : null,
  }));
}

export async function createSubAdmin(
  session: AdminSession,
  payload: { username: string; name: string; password: string; permissions: string[] },
): Promise<void> {
  const response = await adminFetch(session, '/admin/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to create sub-admin');
  }
}

export async function updateSubAdmin(
  session: AdminSession,
  adminUserId: string,
  payload: { permissions: string[]; active: boolean; displayName?: string },
): Promise<void> {
  const response = await adminFetch(session, `/admin/accounts/${adminUserId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to update sub-admin');
  }
}

export async function revokeSubAdmin(session: AdminSession, adminUserId: string): Promise<void> {
  const response = await adminFetch(session, `/admin/accounts/${adminUserId}/revoke`, {
    method: 'POST',
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to revoke sub-admin');
  }
}

export async function deleteAdminUser(session: AdminSession, userId: string): Promise<void> {
  const response = await adminFetch(session, `/admin/users/${userId}`, {
    method: 'DELETE',
  });
  if (!response || !response.ok) {
    const payload = response ? await response.json().catch(() => ({})) : {};
    throw new Error(payload?.error || 'Failed to delete user');
  }
}

export async function deleteSubAdmin(session: AdminSession, adminUserId: string): Promise<void> {
  const response = await adminFetch(session, `/admin/accounts/${adminUserId}`, {
    method: 'DELETE',
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to delete sub-admin');
  }
}