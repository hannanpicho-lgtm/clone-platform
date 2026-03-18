import type { ReactNode } from 'react';
import { BarChart3, DollarSign, Gift, LifeBuoy, Link2, LogOut, Settings, Shield, UserCog, Users, Wallet } from 'lucide-react';
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
  unreadSupportCount?: number;
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

export function AdminLayout({ children, currentPath, session, onLogout, unreadSupportCount = 0 }: AdminLayoutProps) {
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
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <Card className="hidden w-72 shrink-0 border-slate-200 bg-white p-4 lg:block">
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

          <div className="space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.path;
              return (
                <Button
                  key={item.path}
                  type="button"
                  variant={active ? 'default' : 'ghost'}
                  className="w-full justify-between gap-2"
                  onClick={() => {
                    window.location.href = item.path;
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {item.path === '/admin/customer-service' && unreadSupportCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                      {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                    </span>
                  ) : null}
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

        <div className="min-w-0 flex-1 space-y-6">
          <Card className="border-slate-200 bg-white px-5 py-4 lg:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Admin Control</div>
                <div className="text-sm text-slate-500">{roleLabel}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleItems.map((item) => {
                  const active = currentPath === item.path;
                  return (
                    <Button
                      key={item.path}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => {
                        window.location.href = item.path;
                      }}
                    >
                      {item.label}
                      {item.path === '/admin/customer-service' && unreadSupportCount > 0 ? (
                        <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                          {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                        </span>
                      ) : null}
                    </Button>
                  );
                })}
                <Button type="button" size="sm" variant="ghost" onClick={onLogout}>
                  Sign out
                </Button>
              </div>
            </div>
          </Card>

          {children}
        </div>
      </div>
    </div>
  );
}