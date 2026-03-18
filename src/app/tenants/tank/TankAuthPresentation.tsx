import type { TenantAuthPresentationProps } from '../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2 } from 'lucide-react';

export function TankAuthPresentation(props: TenantAuthPresentationProps) {
  const {
    branding,
    isSignup,
    isLoading,
    error,
    info,
    signupUsername,
    setSignupUsername,
    signupWithdrawalPassword,
    setSignupWithdrawalPassword,
    signupPassword,
    setSignupPassword,
    signupConfirmPassword,
    setSignupConfirmPassword,
    signupGender,
    setSignupGender,
    signupInviteCode,
    setSignupInviteCode,
    signinUsername,
    setSigninUsername,
    signinPassword,
    setSigninPassword,
    setIsSignup,
    handleSignup,
    handleSignin,
  } = props;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="text-center mb-12 relative z-10">
        <h1 className="text-6xl font-bold text-amber-400 mb-2 drop-shadow-lg">{branding.logoText}</h1>
        <p className="text-2xl text-amber-300 drop-shadow-lg">{branding.loginTagline}</p>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-800">
          <h2 className="text-2xl font-bold text-center text-amber-400 mb-8">
            {isSignup ? 'Register Now' : 'Login Now'}
          </h2>

          {isSignup ? (
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
                  placeholder="Password"
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
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">{error}</div>
              )}

              {info && (
                <div className="text-sm text-emerald-300 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">{info}</div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 rounded-lg transition-all">
                {isLoading ? 'Registering...' : 'Register'}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className="text-amber-400 hover:text-amber-300 font-semibold transition"
                >
                  Already have an account? Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignin} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Username or Email</label>
                <Input
                  type="text"
                  placeholder="Username or Email"
                  value={signinUsername}
                  onChange={(e) => setSigninUsername(e.target.value)}
                  required
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Password</label>
                <Input
                  type="password"
                  placeholder="Password"
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
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">{error}</div>
              )}

              {info && (
                <div className="text-sm text-emerald-300 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">{info}</div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 rounded-lg transition-all">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="space-y-3 text-center text-sm">
                <button type="button" className="text-blue-400 hover:text-blue-300 font-semibold transition">
                  Forgot Your Password?
                </button>
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

      <div className="fixed bottom-4 text-center text-sm text-gray-300/60 relative z-10">
        <p>{branding.footerText}</p>
      </div>
    </div>
  );
}
