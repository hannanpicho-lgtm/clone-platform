import type { AdminRole, AdminSession } from './types';

const ADMIN_SESSION_STORAGE_KEY = 'tankplatform.admin.session';

export function loadAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.accessToken || !parsed?.role) return null;
    return {
      accessToken: String(parsed.accessToken),
      role: (parsed.role === 'super-admin' ? 'super-admin' : 'sub-admin') as AdminRole,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions.map(String) : [],
      authenticatedAt: String(parsed.authenticatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function saveAdminSession(session: AdminSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem('superAdminKey');
}