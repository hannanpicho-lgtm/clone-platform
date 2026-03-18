import type { TenantAdminLoginPresentationProps } from '../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react';

export function SteadfastAdminLoginPresentation({
  branding,
  username,
  setUsername,
  password,
  setPassword,
  isLoading,
  error,
  handleLogin,
}: TenantAdminLoginPresentationProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 grid lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-sky-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Security Zone
            </div>
            <h1 className="mt-8 text-4xl font-semibold">{branding.adminPortalTitle}</h1>
            <p className="mt-3 text-slate-300">{branding.adminPortalSubtitle}</p>
          </div>
          <p className="text-sm text-slate-300 leading-6">
            Steadfast enforces strict role separation and tenant-bound access tokens for every administrative operation.
          </p>
        </aside>

        <section className="p-6 sm:p-10">
          <h2 className="text-2xl font-semibold text-slate-900">Admin Sign-In</h2>
          <p className="mt-2 text-sm text-slate-500">Authenticate with limited-admin credentials or a super-admin key.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Admin Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="limited-admin username (optional)"
                className="h-11 border-slate-300"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {username.trim() ? 'Admin Password' : 'Super Admin Key'}
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={username.trim() ? 'Enter admin password' : 'Enter super-admin key'}
                  className="h-11 border-slate-300 pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={isLoading || !password} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
              {isLoading ? 'Authenticating...' : 'Continue'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
