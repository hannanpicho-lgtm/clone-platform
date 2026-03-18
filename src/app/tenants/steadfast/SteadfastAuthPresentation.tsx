import type { TenantAuthPresentationProps } from '../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export function SteadfastAuthPresentation(props: TenantAuthPresentationProps) {
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_55%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.22),transparent_50%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 px-3 py-1 text-xs uppercase tracking-[0.18em] text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Steadfast Network
            </div>
            <h1 className="mt-8 text-5xl font-semibold leading-tight">{branding.logoText}</h1>
            <p className="mt-4 max-w-lg text-lg text-slate-200">{branding.loginTagline}</p>
          </div>

          <div className="relative z-10 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-5">
            <p className="text-sm text-slate-200 leading-6">
              Purpose-built for disciplined execution: performance metrics, secure wallet actions, and support workflows designed for enterprise teams.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 p-6 sm:p-8">
            <div className="mb-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure Access
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">{isSignup ? 'Create Steadfast Account' : 'Sign in to Steadfast'}</h2>
              <p className="mt-2 text-sm text-slate-500">Domain-bound tenant context is applied automatically for this workspace.</p>
            </div>

            {isSignup ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
                    <Input type="text" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)} placeholder="Choose username" required className="h-11 border-slate-300" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Withdrawal Password</label>
                    <Input type="password" value={signupWithdrawalPassword} onChange={(e) => setSignupWithdrawalPassword(e.target.value)} placeholder="Set withdrawal pass" required className="h-11 border-slate-300" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Invite Code</label>
                    <Input type="text" value={signupInviteCode} onChange={(e) => setSignupInviteCode(e.target.value)} placeholder="Optional" className="h-11 border-slate-300" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                    <Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="h-11 border-slate-300" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                    <Input type="password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} placeholder="Confirm password" required className="h-11 border-slate-300" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Gender</label>
                  <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="gender" value="male" checked={signupGender === 'male'} onChange={(e) => setSignupGender(e.target.value)} className="h-4 w-4 accent-sky-600" />
                      Male
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="gender" value="female" checked={signupGender === 'female'} onChange={(e) => setSignupGender(e.target.value)} className="h-4 w-4 accent-sky-600" />
                      Female
                    </label>
                  </div>
                </div>

                {isLoading && <div className="flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-sky-600" /></div>}
                {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                {info && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>}

                <Button type="submit" disabled={isLoading} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
                <p className="text-center text-sm text-slate-500">
                  Already have access?{' '}
                  <button type="button" onClick={() => setIsSignup(false)} className="font-semibold text-sky-700 hover:text-sky-800">
                    Sign in
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignin} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Username or Email</label>
                  <Input type="text" value={signinUsername} onChange={(e) => setSigninUsername(e.target.value)} placeholder="Enter username or email" required className="h-11 border-slate-300" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <Input type="password" value={signinPassword} onChange={(e) => setSigninPassword(e.target.value)} placeholder="Enter password" required className="h-11 border-slate-300" />
                </div>

                {isLoading && <div className="flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-sky-600" /></div>}
                {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                {info && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>}

                <Button type="submit" disabled={isLoading} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>

                <div className="text-center text-sm text-slate-500">
                  Need an account?{' '}
                  <button type="button" onClick={() => setIsSignup(true)} className="font-semibold text-sky-700 hover:text-sky-800">
                    Create one
                  </button>
                </div>
              </form>
            )}

            <p className="mt-8 text-center text-xs text-slate-400">{branding.footerText}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
