import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AdminLogin } from '../components/AdminLogin';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AdminLayout } from './layout/AdminLayout';
import { evaluateAdminRouteAccess, resolveAdminRoute } from './middleware';
import { clearAdminSession, loadAdminSession, saveAdminSession } from './session';
import type { AdminSession } from './types';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminSubAdminsPage } from './pages/AdminSubAdminsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';

function getCurrentPath() {
  return typeof window !== 'undefined' ? window.location.pathname : '/admin';
}

export function AdminApp() {
  const adminGateKey = String(import.meta.env.VITE_ADMIN_SITE_GATE_KEY || '').trim();
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [adminGateUnlocked, setAdminGateUnlocked] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
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
          <h1 className="text-2xl font-bold text-white text-center mb-2">Admin Portal Access</h1>
          <p className="text-sm text-purple-200 text-center mb-6">Enter portal access key to continue</p>
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
  let page = <AdminDashboardPage session={session} />;
  if (route === 'users') {
    page = <AdminUsersPage session={session} />;
  } else if (route === 'sub-admins') {
    page = <AdminSubAdminsPage session={session} />;
  }

  return (
    <AdminLayout currentPath={currentPath} session={session} onLogout={handleAdminLogout}>
      {page}
    </AdminLayout>
  );
}