import { useState } from 'react';
import { getSupabaseClient } from '/utils/supabase/client';
import { getCurrentTenantBranding } from '../branding/tenantBranding';
import { getTenantUiBundle } from '../tenants/registry';

interface AuthPageProps {
  onAuthSuccess: (accessToken: string) => void;
}

const AUTH_EMAIL_DOMAIN = 'auth.tank.local';

const normalizeUsername = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
};

const buildAuthEmailFromUsername = (username: string): string => {
  const normalized = normalizeUsername(username);
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  // Sign up state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupWithdrawalPassword, setSignupWithdrawalPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupGender, setSignupGender] = useState('male');
  const [signupInviteCode, setSignupInviteCode] = useState('');

  // Sign in state
  const [signinUsername, setSigninUsername] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  const supabase = getSupabaseClient();
  const branding = getCurrentTenantBranding();
  const tenantUi = getTenantUiBundle(branding.tenantId);
  const TenantAuthPresentation = tenantUi.authPresentation;

  const signInViaBackend = async (username: string, password: string): Promise<string> => {
    const { projectId, publicAnonKey } = await import('/utils/supabase/info');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.session?.access_token) {
      throw new Error(data?.error || 'Sign in failed');
    }

    return String(data.session.access_token);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

    // Validation
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    const normalizedUsername = normalizeUsername(signupUsername);
    if (!normalizedUsername || normalizedUsername.length < 3) {
      setError('Username must contain at least 3 letters or numbers');
      setIsLoading(false);
      return;
    }

    try {
      const { projectId, publicAnonKey } = await import('/utils/supabase/info');

      const authEmail = buildAuthEmailFromUsername(signupUsername);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          password: signupPassword,
          name: signupUsername,
          username: signupUsername,
          withdrawalPassword: signupWithdrawalPassword,
          gender: signupGender,
          invitationCode: signupInviteCode || undefined,
        }),
      }).catch((fetchErr) => {
        console.error('Network error during signup:', fetchErr);
        throw new Error('Backend server is not available. Please try again later.');
      });

      const data = await response.json().catch(() => ({ error: 'Invalid response from server' }));

      if (!response.ok) {
        if (data.error && data.error.includes('already been registered')) {
          setIsSignup(false);
          setSigninUsername(signupUsername);
          setError('');
          setInfo('Account already exists. Please sign in instead.');
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || 'Signup failed');
      }

      let autoSigninToken = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          autoSigninToken = await signInViaBackend(signupUsername, signupPassword);
          break;
        } catch {
          if (attempt < 3) {
            await sleep(700);
          }
        }
      }

      if (autoSigninToken) {
        setSignupUsername('');
        setSignupWithdrawalPassword('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setSignupGender('male');
        setSignupInviteCode('');
        onAuthSuccess(autoSigninToken);
        return;
      }

      setIsSignup(false);
      setSigninUsername(signupUsername);
      setSigninPassword('');
      setError('Account created successfully. Please sign in now.');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

    const normalizedUsername = normalizeUsername(signinUsername);
    if (!normalizedUsername) {
      setError('Please enter your username');
      setIsLoading(false);
      return;
    }

    try {
      const token = await signInViaBackend(signinUsername, signinPassword);
      onAuthSuccess(token);
    } catch (err: any) {
      console.error('Signin error:', err);
      setError(err.message || 'An error occurred during signin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TenantAuthPresentation
      branding={branding}
      isSignup={isSignup}
      isLoading={isLoading}
      error={error}
      info={info}
      signupUsername={signupUsername}
      setSignupUsername={setSignupUsername}
      signupWithdrawalPassword={signupWithdrawalPassword}
      setSignupWithdrawalPassword={setSignupWithdrawalPassword}
      signupPassword={signupPassword}
      setSignupPassword={setSignupPassword}
      signupConfirmPassword={signupConfirmPassword}
      setSignupConfirmPassword={setSignupConfirmPassword}
      signupGender={signupGender}
      setSignupGender={setSignupGender}
      signupInviteCode={signupInviteCode}
      setSignupInviteCode={setSignupInviteCode}
      signinUsername={signinUsername}
      setSigninUsername={setSigninUsername}
      signinPassword={signinPassword}
      setSigninPassword={setSigninPassword}
      setIsSignup={setIsSignup}
      handleSignup={handleSignup}
      handleSignin={handleSignin}
    />
  );
}