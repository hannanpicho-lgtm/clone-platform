import { useState, type ReactNode } from 'react';
import { BarChart3, DollarSign, Gift, LifeBuoy, Link2, LogOut, Menu, Settings, Shield, UserCog, Users, Wallet, X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { isSuperAdmin } from '../permissions';
import type { AdminSession } from '../types';
import { getCurrentTenantBranding } from '../../branding/tenantBranding';

interface AdminLayoutProps {
  children: ReactNode;
  currentPath: string;
  session: AdminSession;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3, permission: null },
  { path: '/admin/users', label: 'Users', icon: Users, permission: 'users.view' },
  { path: '/admin/withdrawals', label: 'Withdrawals', icon: Wallet, permission: 'withdrawals.manage' },
  { path: '/admin/transactions', label: 'Transactions', icon: DollarSign, permission: null },
  { path: '/admin/premium', label: 'Premium', icon: Gift, permission: 'premium.manage-or-assign' },
  { path: '/admin/invitations', label: 'Invitations', icon: Link2, permission: 'invitations.manage' },
  { path: '/admin/customer-service', label: 'Customer Service', icon: LifeBuoy, permission: 'support.manage' },
  { path: '/admin/support-links', label: 'Support Links', icon: Link2, permission: 'support.manage' },
  { path: '/admin/sub-admins', label: 'Sub-admins', icon: UserCog, permission: 'super-admin-only' },
  { path: '/admin/settings', label: 'Settings', icon: Settings, permission: null },
] as const;

export function AdminLayout({ children, currentPath, session, onLogout }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleLabel = isSuperAdmin(session) ? 'Super Admin' : 'Sub-admin';
  const branding = getCurrentTenantBranding();
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.permission === 'super-admin-only') {
      return isSuperAdmin(session);
    }
    if (item.permission === 'premium.manage-or-assign') {
      return isSuperAdmin(session)
        || session.permissions.includes('*')
        || session.permissions.includes('premium.manage')
        || session.permissions.includes('users.assign_premium');
    }
    if (!item.permission) {
      return true;
    }
    return session.permissions.includes('*') || session.permissions.includes(item.permission) || isSuperAdmin(session);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Mobile sticky header (hidden on lg+) ── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Admin Control</div>
              <div className="text-xs leading-tight text-slate-500">{branding.appName}</div>
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav drawer — expands below the top bar */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white pb-3 shadow-lg">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
              <span className="text-xs text-slate-500">RBAC enforced</span>
            </div>
            <div className="grid grid-cols-3 gap-1 px-3 sm:grid-cols-4">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => { window.location.href = item.path; }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onLogout}
                className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        {/* Desktop sidebar (hidden below lg) */}
        <Card className="hidden h-fit w-64 shrink-0 border-slate-200 bg-white p-4 lg:block lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Admin Control</div>
              <div className="text-sm text-slate-500">{branding.appName}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary">{roleLabel}</Badge>
            <span className="text-xs text-slate-500">RBAC enforced</span>
          </div>

          <Separator className="my-4" />

          <div className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.path;
              return (
                <Button
                  key={item.path}
                  type="button"
                  variant={active ? 'default' : 'ghost'}
                  className="w-full justify-start gap-2"
                  onClick={() => { window.location.href = item.path; }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          <Separator className="my-4" />

          <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </Card>

        {/* Page content */}
        <div className="min-w-0 flex-1 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
