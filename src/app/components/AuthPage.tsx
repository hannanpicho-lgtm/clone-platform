import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getSupabaseClient } from '/utils/supabase/client';
import { BackendStatusIndicator } from './BackendStatusIndicator';
import { Loader2 } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (accessToken: string) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  // Sign up state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupWithdrawalPassword, setSignupWithdrawalPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupGender, setSignupGender] = useState('male');
  const [signupInviteCode, setSignupInviteCode] = useState('');

  // Sign in state
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  const supabase = getSupabaseClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

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

    try {
      const { projectId, publicAnonKey } = await import('/utils/supabase/info');
      
      // Use username as email for registration
      const email = `${signupUsername}@tank.local`;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: email,
          password: signupPassword,
          name: signupUsername,
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
          setSigninEmail(email);
          setError('');
          setIsLoading(false);
          alert('✅ Account already exists. Please sign in instead.');
          return;
        }
        throw new Error(data.error || 'Signup failed');
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: signupPassword,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (signInData.session?.access_token) {
        // Reset form
        setSignupUsername('');
        setSignupWithdrawalPassword('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setSignupGender('male');
        setSignupInviteCode('');
        onAuthSuccess(signInData.session.access_token);
      }
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

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: signinEmail,
        password: signinPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw new Error(signInError.message);
      }

      if (data.session?.access_token) {
        onAuthSuccess(data.session.access_token);
      }
    } catch (err: any) {
      console.error('Signin error:', err);
      setError(err.message || 'An error occurred during signin');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* Backend Status Indicator - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <BackendStatusIndicator />
      </div>

      {/* Logo and Title */}
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-6xl font-bold text-amber-400 mb-2 drop-shadow-lg">TANK</h1>
        <p className="text-2xl text-amber-300 drop-shadow-lg">Simulation RPG</p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-800">
          <h2 className="text-2xl font-bold text-center text-amber-400 mb-8">
            {isSignup ? 'Register Now' : 'Login Now'}
          </h2>

          {isSignup ? (
            // Signup Form
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Username</label>
                <Input
                  type="text"
                  placeholder="Username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  required
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Withdrawal Password</label>
                <Input
                  type="password"
                  placeholder="Withdrawal Password"
                  value={signupWithdrawalPassword}
                  onChange={(e) => setSignupWithdrawalPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Password</label>
                <Input
                  type="password"
                  placeholder="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-3">Gender</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={signupGender === 'male'}
                      onChange={(e) => setSignupGender(e.target.value)}
                      className="w-4 h-4 accent-amber-400"
                    />
                    <span className="text-sm text-gray-300">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={signupGender === 'female'}
                      onChange={(e) => setSignupGender(e.target.value)}
                      className="w-4 h-4 accent-amber-400"
                    />
                    <span className="text-sm text-gray-300">Female</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Invite Code</label>
                <Input
                  type="text"
                  placeholder="Invite Code"
                  value={signupInviteCode}
                  onChange={(e) => setSignupInviteCode(e.target.value)}
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              {isLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 rounded-lg transition-all"
              >
                {isLoading ? 'Registering...' : 'Register'}
              </Button>

              <div className="text-center text-sm">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(false); }} className="text-amber-400 hover:text-amber-300 font-semibold transition">
                  Already have an account? Login
                </a>
              </div>
            </form>
          ) : (
            // Signin Form
            <form onSubmit={handleSignin} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Username</label>
                <Input
                  type="email"
                  placeholder="Username"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Password</label>
                <Input
                  type="password"
                  placeholder="password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              {isLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 rounded-lg transition-all"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="space-y-3 text-center text-sm">
                <div>
                  <a href="#" className="text-blue-400 hover:text-blue-300 font-semibold transition">
                    Forgot Your Password?
                  </a>
                </div>
                <div className="text-gray-400">
                  Do not have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignup(true)}
                    className="text-blue-400 hover:text-blue-300 font-semibold transition"
                  >
                    Signup
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 text-center text-sm text-gray-300/60 relative z-10">
        <p>2024 Site tanknewmedia-data. All rights reserved</p>
      </div>
    </div>
  );
}