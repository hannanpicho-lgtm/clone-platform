import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AdminLogin } from '../components/AdminLogin';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { fetchAdminSupportTickets } from './api';
import { AdminLayout } from './layout/AdminLayout';
import { evaluateAdminRouteAccess, resolveAdminRoute } from './middleware';
import { hasAdminPermission } from './permissions';
import { clearAdminSession, loadAdminSession, saveAdminSession } from './session';
import type { AdminSession } from './types';
import { AdminCustomerServicePage } from './pages/AdminCustomerServicePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminInvitationsPage } from './pages/AdminInvitationsPage';
import { AdminPremiumPage } from './pages/AdminPremiumPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminSubAdminsPage } from './pages/AdminSubAdminsPage';
import { AdminSupportLinksPage } from './pages/AdminSupportLinksPage';
import { AdminTransactionsPage } from './pages/AdminTransactionsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminWithdrawalsPage } from './pages/AdminWithdrawalsPage';
import { getCurrentTenantBranding } from '../branding/tenantBranding';

function getCurrentPath() {
  return typeof window !== 'undefined' ? window.location.pathname : '/admin';
}

export function AdminApp() {
  const adminGateKey = String(import.meta.env.VITE_ADMIN_SITE_GATE_KEY || '').trim();
  const branding = getCurrentTenantBranding();
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [adminGateUnlocked, setAdminGateUnlocked] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const currentPath = useMemo(() => getCurrentPath(), []);

  useEffect(() => {
    if (!adminGateKey) {
      setAdminGateUnlocked(true);
    } else {
      setAdminGateUnlocked(window.sessionStorage.getItem('admin_gate_unlocked') === 'true');
    }
    setSession(loadAdminSession());
  }, [adminGateKey]);

  const access = evaluateAdminRouteAccess(currentPath, session);

  useEffect(() => {
    if (access.redirectTo && access.redirectTo !== currentPath && access.allowed) {
      window.location.replace(access.redirectTo);
    }
  }, [access, currentPath]);

  useEffect(() => {
    if (!session || !hasAdminPermission(session, 'support.manage')) {
      setUnreadSupportCount(0);
      return;
    }

    let alive = true;
    const syncUnreadCount = async () => {
      try {
        const tickets = await fetchAdminSupportTickets(session);
        if (!alive) return;
        const unreadTotal = tickets.reduce((sum, ticket) => {
          const unread = Number(ticket.unreadCount || 0);
          return sum + (unread > 0 ? unread : 0);
        }, 0);
        setUnreadSupportCount(unreadTotal);
      } catch {
        if (alive) {
          setUnreadSupportCount(0);
        }
      }
    };

    syncUnreadCount();
    const intervalId = window.setInterval(syncUnreadCount, 8000);
    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [session]);

  const handleAdminLoginSuccess = (auth?: { accessToken?: string; isSuperAdmin: boolean; permissions?: string[] }) => {
    const nextSession: AdminSession = {
      accessToken: String(auth?.accessToken || '').trim(),
      role: auth?.isSuperAdmin ? 'super-admin' : 'sub-admin',
      permissions: auth?.isSuperAdmin ? ['*'] : Array.isArray(auth?.permissions) ? auth.permissions : [],
      authenticatedAt: new Date().toISOString(),
    };

    if (nextSession.role === 'super-admin' && typeof window !== 'undefined' && nextSession.accessToken) {
      window.sessionStorage.setItem('superAdminKey', nextSession.accessToken);
    }

    saveAdminSession(nextSession);
    setSession(nextSession);
    window.location.href = '/admin/dashboard';
  };

  const handleAdminLogout = () => {
    clearAdminSession();
    setSession(null);
    window.location.href = '/admin';
  };

  const handleAdminGateUnlock = (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminGateKey) {
      setAdminGateUnlocked(true);
      return;
    }

    if (gateInput.trim() !== adminGateKey) {
      setGateError('Invalid access key');
      return;
    }

    window.sessionStorage.setItem('admin_gate_unlocked', 'true');
    setGateError('');
    setAdminGateUnlocked(true);
  };

  if (!adminGateUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-2">{branding.adminGateTitle}</h1>
          <p className="text-sm text-purple-200 text-center mb-6">{branding.adminGatePrompt}</p>
          <form onSubmit={handleAdminGateUnlock} className="space-y-4">
            <input
              type="password"
              value={gateInput}
              onChange={(e) => setGateInput(e.target.value)}
              placeholder="Access key"
              className="w-full h-11 rounded-md border border-white/20 bg-white/5 px-3 text-white placeholder:text-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {gateError && <p className="text-sm text-red-300">{gateError}</p>}
            <button
              type="submit"
              className="w-full h-11 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
  }

  if (!access.allowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-slate-200">
          <CardContent className="space-y-4 p-6 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
            <div>
              <h1 className="text-2xl font-semibold">Access denied</h1>
              <p className="mt-2 text-sm text-slate-500">{access.reason || 'Your admin role cannot access this route.'}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button type="button" onClick={() => { window.location.href = access.redirectTo || '/admin/dashboard'; }}>
                Go to allowed page
              </Button>
              <Button type="button" variant="outline" onClick={handleAdminLogout}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const route = resolveAdminRoute(currentPath);
  let page: React.ReactNode = <AdminDashboardPage session={session} />;
  if (route === 'users') {
    page = <AdminUsersPage session={session} />;
  } else if (route === 'sub-admins') {
    page = <AdminSubAdminsPage session={session} />;
  } else if (route === 'withdrawals') {
    page = <AdminWithdrawalsPage session={session} />;
  } else if (route === 'transactions') {
    page = <AdminTransactionsPage session={session} />;
  } else if (route === 'premium') {
    page = <AdminPremiumPage session={session} />;
  } else if (route === 'invitations') {
    page = <AdminInvitationsPage session={session} />;
  } else if (route === 'customer-service') {
    page = <AdminCustomerServicePage session={session} />;
  } else if (route === 'support-links') {
    page = <AdminSupportLinksPage session={session} />;
  } else if (route === 'settings') {
    page = <AdminSettingsPage session={session} />;
  }

  return (
    <AdminLayout currentPath={currentPath} session={session} onLogout={handleAdminLogout} unreadSupportCount={unreadSupportCount}>
      {page}
    </AdminLayout>
  );
}