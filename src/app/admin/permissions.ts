import type { AdminSession } from './types';

export const SUB_ADMIN_DEFAULT_PERMISSIONS = [
  'users.view',
  'users.manage_status',
  'support.manage',
] as const;

export const SUB_ADMIN_PERMISSION_OPTIONS = [
  { value: 'users.view', label: 'View users and subscriptions' },
  { value: 'users.manage_status', label: 'Suspend and activate users' },
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