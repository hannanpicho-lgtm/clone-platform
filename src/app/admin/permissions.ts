import type { AdminSession } from './types';

export const SUB_ADMIN_DEFAULT_PERMISSIONS = [
  'users.view',
  'users.manage_status',
  'support.manage',
] as const;

export const SUB_ADMIN_PERMISSION_OPTIONS = [
  { value: 'users.view', label: 'View users and subscriptions' },
  { value: 'users.manage_status', label: 'Suspend and activate users' },
  { value: 'users.adjust_balance', label: 'Adjust user balances' },
  { value: 'users.assign_premium', label: 'Assign premium products' },
  { value: 'users.reset_tasks', label: 'Reset user task sets' },
  { value: 'users.manage_task_limits', label: 'Update task and withdrawal limits' },
  { value: 'users.unfreeze', label: 'Unfreeze frozen users' },
  { value: 'users.update_vip', label: 'Change VIP tiers' },
  { value: 'users.reset_password', label: 'Reset login password and withdrawal PIN' },
  { value: 'withdrawals.manage', label: 'Approve and deny withdrawals' },
  { value: 'invitations.manage', label: 'Manage invitation codes' },
  { value: 'premium.manage', label: 'Manage premium products' },
  { value: 'support.manage', label: 'View and manage support tickets' },
] as const;

export function isSuperAdmin(session: AdminSession | null): boolean {
  return session?.role === 'super-admin';
}

export function hasAdminPermission(session: AdminSession | null, permission: string): boolean {
  if (!session) return false;
  if (session.role === 'super-admin') return true;
  return session.permissions.includes('*') || session.permissions.includes(permission);
}

export function getDefaultAdminPath(session: AdminSession | null): string {
  return hasAdminPermission(session, 'users.view') ? '/admin/dashboard' : '/admin';
}