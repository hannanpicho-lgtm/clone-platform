import { useState, useEffect, lazy, Suspense } from 'react';
import { useVersionCheck } from '../hooks/useVersionCheck';
import { AuthPage } from './components/AuthPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getSupabaseClient } from '/utils/supabase/client';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Lazy-load heavy routes — reduces initial bundle
const Dashboard = lazy(() =>
  import('./components/Dashboard').then(m => ({ default: m.Dashboard }))
);
const AdminApp = lazy(() =>
  import('./admin/AdminApp').then(m => ({ default: m.AdminApp }))
);

console.log("App.tsx loaded");

export default function App() {
  const envAdminPortalOnly = String(import.meta.env.VITE_ADMIN_PORTAL_ONLY || '').toLowerCase() === 'true';
  const updateAvailable = useVersionCheck();
  const isAdminPortalHost = typeof window !== 'undefined'
    ? window.location.hostname.includes('tank-admin-portal')
    : false;
  const isAdminRoute = typeof window !== 'undefined'
    ? window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
    : false;
  const adminPortalOnly = envAdminPortalOnly && isAdminPortalHost;
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

  // Use singleton Supabase client
  const supabase = getSupabaseClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- Online / Offline detection ---
  useEffect(() => {
    const goOffline = () => { setIsOffline(true); toast.warning('You are offline — some features may be unavailable.'); };
    const goOnline  = () => { setIsOffline(false); toast.success('Back online.'); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  // --- Supabase auth state listener (handles token refresh + expiry) ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        setAccessToken(session.access_token);
      }
      if (event === 'SIGNED_OUT') {
        setAccessToken(null);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [supabase]);

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

    if (adminPortalOnly) {
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
    if (!adminPortalOnly) {
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

  const SuspenseFallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );

  if (isCheckingSession) {
    return SuspenseFallback;
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      {isOffline && (
        <div className="fixed inset-x-0 top-0 z-[10000] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white shadow">
          <span>⚠ No internet connection</span>
        </div>
      )}
      {updateAvailable && (
        <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow">
          <span>A new version of this platform is available.</span>
          <button
            type="button"
            className="rounded border border-white/40 px-2 py-0.5 text-xs font-semibold underline-offset-2 hover:underline"
            onClick={() => window.location.reload()}
          >
            Refresh now
          </button>
        </div>
      )}
      <div className="min-h-screen">
        <Suspense fallback={SuspenseFallback}>
        {adminPortalOnly ? (
          <AdminApp />
        ) : (
          isAdminRoute ? (
            <AdminApp />
          ) : (
            accessToken ? (
              <Dashboard accessToken={accessToken} onLogout={handleLogout} />
            ) : (
              <AuthPage onAuthSuccess={handleAuthSuccess} />
            )
          )
        )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}