import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getSupabaseClient } from '/utils/supabase/client';

console.log("App.tsx loaded");

export default function App() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const adminPortalOnly = String(import.meta.env.VITE_ADMIN_PORTAL_ONLY || '').trim().toLowerCase() === 'true';
  const adminPortalUrl = String(import.meta.env.VITE_ADMIN_PORTAL_URL || '').trim();
  const resolvedAdminPortalUrl = adminPortalUrl || 'https://tank-admin-portal.tanknewmedia.work';
  const isAdminPortalHost = hostname.includes('tank-admin-portal')
    || hostname.includes('tank-admin-live')
    || hostname.includes('clone-platform-admin.pages.dev');
  const isAdminRoute = typeof window !== 'undefined'
    ? (pathname === '/admin' || pathname.startsWith('/admin/'))
    : false;
  const shouldRenderAdminPortal = adminPortalOnly || isAdminPortalHost || isAdminRoute;
  const adminGateKey = String(import.meta.env.VITE_ADMIN_SITE_GATE_KEY || '').trim();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAccessToken, setAdminAccessToken] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [adminGateUnlocked, setAdminGateUnlocked] = useState(false);
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [isRedirectingToAdminPortal, setIsRedirectingToAdminPortal] = useState(false);

  // Use singleton Supabase client
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Suppress "Failed to fetch" errors in console
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Filter out fetch errors related to backend
      const message = args[0]?.toString() || '';
      if (
        message.includes('Failed to fetch') ||
        message.includes('TypeError: Failed to fetch') ||
        (message.includes('Error fetching data') && message.includes('TypeError'))
      ) {
        // Silently ignore - these are expected when backend is not deployed
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Suppress unhandled promise rejections for fetch errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.toString() || '';
      if (
        message.includes('Failed to fetch') ||
        message.includes('fetch') ||
        message.includes('aborted')
      ) {
        event.preventDefault(); // Prevent error from showing
        console.log('ℹ️ Network request failed (expected if backend not deployed)');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    if (!adminPortalOnly && !isAdminPortalHost && isAdminRoute && resolvedAdminPortalUrl) {
      try {
        const targetUrl = new URL(resolvedAdminPortalUrl);
        const alreadyOnAdminPortal = targetUrl.hostname === hostname;
        if (!alreadyOnAdminPortal) {
          setIsRedirectingToAdminPortal(true);
          window.location.replace(resolvedAdminPortalUrl);
          return () => {
            console.error = originalConsoleError;
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
          };
        }
      } catch (error) {
        console.error('Invalid admin portal URL:', error);
      }
    }

    if (shouldRenderAdminPortal) {
      if (!adminGateKey) {
        setAdminGateUnlocked(true);
      } else {
        const unlocked = typeof window !== 'undefined' && window.sessionStorage.getItem('admin_gate_unlocked') === 'true';
        setAdminGateUnlocked(Boolean(unlocked));
      }
      setIsCheckingSession(false);
    } else {
      checkSession();
    }

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking session:', error);
      }
      
      if (session?.access_token) {
        const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
        if (!userError && userData?.user?.id) {
          setAccessToken(session.access_token);
        } else {
          await supabase.auth.signOut();
          setAccessToken(null);
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
      setAccessToken(null);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
  };

  const handleAdminLoginSuccess = (auth?: { accessToken?: string; isSuperAdmin: boolean; permissions?: string[] }) => {
    setAdminAccessToken(auth?.accessToken || null);
    setIsSuperAdmin(Boolean(auth?.isSuperAdmin));
    setAdminPermissions(Array.isArray(auth?.permissions) ? auth.permissions : []);
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminAccessToken(null);
    setAdminPermissions([]);
    setIsSuperAdmin(true);
    if (isAdminRoute) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/';
    }
  };

  const handleAdminGateUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminGateKey) {
      setAdminGateUnlocked(true);
      return;
    }

    if (gateInput.trim() !== adminGateKey) {
      setGateError('Invalid access key');
      return;
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('admin_gate_unlocked', 'true');
    }
    setGateError('');
    setAdminGateUnlocked(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isRedirectingToAdminPortal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Opening admin portal...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {shouldRenderAdminPortal ? (
          !adminGateUnlocked ? (
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
          ) : (
          isAdminAuthenticated ? (
            <AdminDashboard
              onLogout={handleAdminLogout}
              adminAccessToken={adminAccessToken}
              adminIsSuperAdmin={isSuperAdmin}
              adminPermissions={adminPermissions}
            />
          ) : (
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
          ))
        ) : (
          accessToken ? (
            <Dashboard accessToken={accessToken} onLogout={handleLogout} />
          ) : (
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          )
        )}
      </div>
    </ErrorBoundary>
  );
}