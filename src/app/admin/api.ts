import { safeFetch } from '../../utils/safeFetch';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import type {
  AdminAlertItem,
  AdminAlertsSummary,
  AdminAuditLogItem,
  AdminInvitationCode,
  AdminMetrics,
  AdminSession,
  AdminSupportLinks,
  AdminSupportTicket,
  AdminUserRecord,
  AdminWithdrawalRequest,
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
        totalEarnings: Number(user?.totalEarnings || 0),
        frozenNegativeAmount: Number(user?.frozenNegativeAmount || 0),
        accountFrozen: Boolean(user?.accountFrozen),
        freezeAmount: Number(user?.freezeAmount || 0),
        accountDisabled: Boolean(user?.accountDisabled),
        createdAt: String(user?.createdAt || ''),
        lastLoginAt: user?.lastLoginAt ? String(user.lastLoginAt) : null,
        lastLoginCountry: user?.lastLoginCountry ? String(user.lastLoginCountry) : null,
        lastLoginIp: user?.lastLoginIp ? String(user.lastLoginIp) : null,
        dailyTaskSetLimit: Number(user?.dailyTaskSetLimit || 0),
        extraTaskSets: Number(user?.extraTaskSets || 0),
        withdrawalLimit: Number(user?.withdrawalLimit || 0),
        taskSetsCompletedToday: Number(user?.taskSetsCompletedToday || 0),
        currentSetTasksCompleted: Number(user?.currentSetTasksCompleted || 0),
        currentSetDate: user?.currentSetDate ? String(user.currentSetDate) : null,
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

export async function unfreezeUser(session: AdminSession, userId: string): Promise<void> {
  const response = await adminFetch(session, '/admin/unfreeze', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to unfreeze user');
  }
}

export async function updateUserVipTier(session: AdminSession, userId: string, vipTier: string): Promise<void> {
  const response = await adminFetch(session, '/admin/vip-tier', {
    method: 'PUT',
    body: JSON.stringify({ userId, vipTier }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to update VIP tier');
  }
}

export async function adjustUserBalance(
  session: AdminSession,
  payload: { userId: string; amount: number; category: string; note?: string },
): Promise<void> {
  const response = await adminFetch(session, '/admin/users/adjust-balance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to adjust balance');
  }
}

export async function assignUserPremium(
  session: AdminSession,
  payload: { userId: string; amount: number; position?: number },
): Promise<void> {
  const response = await adminFetch(session, '/admin/users/assign-premium', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to assign premium');
  }
}

export async function resetUserTaskSet(session: AdminSession, userId: string, mode: 'manual' | 'complete_set' = 'manual'): Promise<void> {
  const response = await adminFetch(session, '/admin/users/reset-task-set', {
    method: 'POST',
    body: JSON.stringify({ userId, mode }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to reset task set');
  }
}

export async function updateUserTaskLimits(
  session: AdminSession,
  payload: { userId: string; dailyTaskSetLimit: number; extraTaskSets: number; withdrawalLimit: number },
): Promise<void> {
  const response = await adminFetch(session, '/admin/users/task-limits', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to update task limits');
  }
}

export async function resetUserLoginPassword(session: AdminSession, userId: string, newPassword: string): Promise<void> {
  const response = await adminFetch(session, '/admin/users/reset-login-password', {
    method: 'POST',
    body: JSON.stringify({ userId, newPassword }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to reset login password');
  }
}

export async function resetUserWithdrawalPin(session: AdminSession, userId: string, newPin: string): Promise<void> {
  const response = await adminFetch(session, '/admin/users/reset-withdrawal-password', {
    method: 'POST',
    body: JSON.stringify({ userId, newPin }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to reset withdrawal PIN');
  }
}

export async function fetchAdminWithdrawals(session: AdminSession): Promise<AdminWithdrawalRequest[]> {
  const response = await adminFetch(session, '/admin/withdrawals');
  if (!response || !response.ok) {
    throw new Error('Failed to fetch withdrawals');
  }
  const data = await response.json().catch(() => ({}));
  const withdrawals = Array.isArray(data?.withdrawals) ? data.withdrawals : [];
  return withdrawals.map((item: any) => ({
    id: String(item?.id || ''),
    userId: String(item?.userId || ''),
    userName: String(item?.userName || item?.name || 'Unknown User'),
    userEmail: item?.userEmail ? String(item.userEmail) : item?.email ? String(item.email) : '',
    amount: Number(item?.amount || 0),
    status: item?.status === 'approved' ? 'approved' : item?.status === 'denied' ? 'denied' : 'pending',
    requestedAt: String(item?.requestedAt || item?.createdAt || ''),
    approvedAt: item?.approvedAt ? String(item.approvedAt) : undefined,
    deniedAt: item?.deniedAt ? String(item.deniedAt) : undefined,
    denialReason: item?.denialReason ? String(item.denialReason) : undefined,
  }));
}

export async function approveWithdrawal(session: AdminSession, withdrawalId: string): Promise<void> {
  const response = await adminFetch(session, '/admin/approve-withdrawal', {
    method: 'POST',
    body: JSON.stringify({ withdrawalId }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to approve withdrawal');
  }
}

export async function denyWithdrawal(session: AdminSession, withdrawalId: string, denialReason: string): Promise<void> {
  const response = await adminFetch(session, '/admin/deny-withdrawal', {
    method: 'POST',
    body: JSON.stringify({ withdrawalId, denialReason }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to deny withdrawal');
  }
}

export async function fetchInvitationCodes(session: AdminSession): Promise<AdminInvitationCode[]> {
  const response = await adminFetch(session, '/admin/invitation-codes');
  if (!response || !response.ok) {
    throw new Error('Failed to fetch invitation codes');
  }
  const data = await response.json().catch(() => ({}));
  const invitationCodes = Array.isArray(data?.invitationCodes) ? data.invitationCodes : [];
  return invitationCodes
    .map((item: any) => ({
      code: String(item?.code || '').trim(),
      owner: String(item?.ownerName || item?.ownerEmail || 'Platform Invite'),
      referrals: Number(item?.signups || 0),
      status: item?.status === 'disabled' ? 'disabled' : 'active',
      generatedAt: String(item?.createdAt || ''),
      ownerUserId: item?.ownerUserId ? String(item.ownerUserId) : null,
    }))
    .filter((item: AdminInvitationCode) => Boolean(item.code));
}

export async function generateInvitationCode(session: AdminSession, ownerUserId?: string | null): Promise<void> {
  const response = await adminFetch(session, '/admin/invitation-codes/generate', {
    method: 'POST',
    body: JSON.stringify({ ownerUserId: ownerUserId || null }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to generate invitation code');
  }
}

export async function updateInvitationCodeStatus(session: AdminSession, code: string, status: 'active' | 'disabled'): Promise<void> {
  const response = await adminFetch(session, '/admin/invitation-codes/status', {
    method: 'PUT',
    body: JSON.stringify({ code, status }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to update invitation code status');
  }
}

export async function updateSupportTicketStatus(session: AdminSession, ticketId: string, status: 'open' | 'in_progress' | 'resolved'): Promise<void> {
  const response = await adminFetch(session, `/admin/support-tickets/${ticketId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: status === 'in_progress' ? 'in-progress' : status }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to update support ticket status');
  }
}

export async function replySupportTicket(session: AdminSession, ticketId: string, message: string): Promise<void> {
  const response = await adminFetch(session, `/admin/support-tickets/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to reply to support ticket');
  }
}

export async function fetchContactLinks(session: AdminSession): Promise<AdminSupportLinks> {
  const response = await adminFetch(session, '/contact-links');
  if (!response || !response.ok) {
    throw new Error('Failed to fetch support links');
  }
  const data = await response.json().catch(() => ({}));
  const config = data?.config || {};
  return {
    whatsapp: String(config?.whatsapp || ''),
    telegram: String(config?.telegram || ''),
    whatsapp2: String(config?.whatsapp2 || ''),
    telegram2: String(config?.telegram2 || ''),
  };
}

export async function updateContactLinks(session: AdminSession, links: Partial<AdminSupportLinks>): Promise<AdminSupportLinks> {
  const response = await adminFetch(session, '/admin/contact-links', {
    method: 'PUT',
    body: JSON.stringify(links),
  });
  if (!response || !response.ok) {
    const data = response ? await response.json().catch(() => ({})) : {};
    throw new Error(data?.error || 'Failed to update support links');
  }
  const data = await response.json().catch(() => ({}));
  const config = data?.config || {};
  return {
    whatsapp: String(config?.whatsapp || ''),
    telegram: String(config?.telegram || ''),
    whatsapp2: String(config?.whatsapp2 || ''),
    telegram2: String(config?.telegram2 || ''),
  };
}

export async function fetchAdminAlerts(session: AdminSession): Promise<{ alerts: AdminAlertItem[]; summary: AdminAlertsSummary }> {
  const response = await adminFetch(session, '/admin/alerts');
  if (!response || !response.ok) {
    throw new Error('Failed to fetch admin alerts');
  }

  const data = await response.json().catch(() => ({}));
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
  return {
    alerts: alerts.map((item: any) => ({
      id: String(item?.id || ''),
      type: item?.type || 'support_ticket',
      severity: item?.severity || 'medium',
      title: String(item?.title || ''),
      message: String(item?.message || ''),
      createdAt: String(item?.createdAt || ''),
      status: item?.status || 'action_required',
    })),
    summary: {
      total: Number(data?.summary?.total || 0),
      actionRequired: Number(data?.summary?.actionRequired || 0),
      pendingWithdrawals: Number(data?.summary?.pendingWithdrawals || 0),
      openSupportTickets: Number(data?.summary?.openSupportTickets || 0),
      frozenAccounts: Number(data?.summary?.frozenAccounts || 0),
      critical: Number(data?.summary?.critical || 0),
      high: Number(data?.summary?.high || 0),
    },
  };
}