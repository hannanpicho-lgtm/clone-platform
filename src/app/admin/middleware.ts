import { getDefaultAdminPath, hasAdminPermission, isSuperAdmin } from './permissions';
import type { AdminSession } from './types';

export type AdminRouteKey = 'login' | 'dashboard' | 'users' | 'sub-admins' | 'unknown';

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

  return {
    allowed: false,
    route,
    redirectTo: getDefaultAdminPath(session),
    reason: 'Unknown admin route.',
  };
}