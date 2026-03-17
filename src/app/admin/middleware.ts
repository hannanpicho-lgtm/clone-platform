import { getDefaultAdminPath, hasAdminPermission, isSuperAdmin } from './permissions';
import type { AdminSession } from './types';

export type AdminRouteKey = 'login' | 'dashboard' | 'users' | 'sub-admins' | 'withdrawals' | 'transactions' | 'premium' | 'invitations' | 'customer-service' | 'support-links' | 'settings' | 'unknown';

export interface AdminRouteAccess {
  allowed: boolean;
  route: AdminRouteKey;
  redirectTo?: string;
  reason?: string;
}

export function resolveAdminRoute(pathname: string): AdminRouteKey {
  if (pathname === '/admin') return 'login';
  if (pathname === '/admin/dashboard') return 'dashboard';
  if (pathname === '/admin/users') return 'users';
  if (pathname === '/admin/sub-admins') return 'sub-admins';
  if (pathname === '/admin/withdrawals') return 'withdrawals';
  if (pathname === '/admin/transactions') return 'transactions';
  if (pathname === '/admin/premium') return 'premium';
  if (pathname === '/admin/invitations') return 'invitations';
  if (pathname === '/admin/customer-service') return 'customer-service';
  if (pathname === '/admin/support-links') return 'support-links';
  if (pathname === '/admin/settings') return 'settings';
  return pathname.startsWith('/admin/') ? 'unknown' : 'login';
}

export function evaluateAdminRouteAccess(pathname: string, session: AdminSession | null): AdminRouteAccess {
  const route = resolveAdminRoute(pathname);

  if (route === 'login') {
    if (session) {
      return {
        allowed: true,
        route,
        redirectTo: getDefaultAdminPath(session),
      };
    }
    return { allowed: true, route };
  }

  if (!session) {
    return {
      allowed: false,
      route,
      redirectTo: '/admin',
      reason: 'Admin authentication is required.',
    };
  }

  if (route === 'dashboard') {
    return { allowed: true, route };
  }

  if (route === 'users') {
    return hasAdminPermission(session, 'users.view')
      ? { allowed: true, route }
      : {
          allowed: false,
          route,
          redirectTo: getDefaultAdminPath(session),
          reason: 'Your admin role cannot access user management.',
        };
  }

  if (route === 'sub-admins') {
    return isSuperAdmin(session)
      ? { allowed: true, route }
      : {
          allowed: false,
          route,
          redirectTo: '/admin/dashboard',
          reason: 'Only super-admins can manage sub-admin accounts.',
        };
  }

  if (route === 'withdrawals') {
    return hasAdminPermission(session, 'withdrawals.manage')
      ? { allowed: true, route }
      : {
          allowed: false,
          route,
          redirectTo: '/admin/dashboard',
          reason: 'Your admin role cannot access withdrawals.',
        };
  }

  if (route === 'transactions' || route === 'settings') {
    return { allowed: true, route };
  }

  if (route === 'premium') {
    return hasAdminPermission(session, 'premium.manage') || hasAdminPermission(session, 'users.assign_premium')
      ? { allowed: true, route }
      : {
          allowed: false,
          route,
          redirectTo: '/admin/dashboard',
          reason: 'Your admin role cannot access premium management.',
        };
  }

  if (route === 'invitations') {
    return hasAdminPermission(session, 'invitations.manage')
      ? { allowed: true, route }
      : {
          allowed: false,
          route,
          redirectTo: '/admin/dashboard',
          reason: 'Your admin role cannot access invitation management.',
        };
  }

  if (route === 'customer-service' || route === 'support-links') {
    return hasAdminPermission(session, 'support.manage')
      ? { allowed: true, route }
      : {
          allowed: false,
          route,
          redirectTo: '/admin/dashboard',
          reason: 'Your admin role cannot access support management.',
        };
  }

  return {
    allowed: false,
    route,
    redirectTo: getDefaultAdminPath(session),
    reason: 'Unknown admin route.',
  };
}