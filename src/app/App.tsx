import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getSupabaseClient } from '/utils/supabase/client';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Use singleton Supabase client
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Check if we're on admin route
    const path = window.location.pathname;
    if (path === '/admin' || path.startsWith('/admin/')) {
      setIsAdminMode(true);
      setIsCheckingSession(false);
      return;
    }

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

    // Check for existing session
    checkSession();

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
        setAccessToken(session.access_token);
      }
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    window.location.href = '/';
  };

  const handleLogout = async () => {
    if (isAdminMode) {
      // Admin logout
      handleAdminLogout();
    } else {
      // Regular user logout
      try {
        await supabase.auth.signOut();
        setAccessToken(null);
      } catch (err) {
        console.error('Logout error:', err);
      }
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

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {isAdminMode ? (
          isAdminAuthenticated ? (
            <AdminDashboard onLogout={handleAdminLogout} />
          ) : (
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
          )
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