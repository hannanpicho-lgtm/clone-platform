import type { AdminSession } from '../types';
import { useEffect, useState } from 'react';
import { isSuperAdmin } from '../permissions';
import { projectId } from '/utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const VIP_TIERS = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
const VIP_COMMISSION_RATES: Record<string, string> = {
  Normal: '0.5%', Silver: '0.75%', Gold: '1.0%', Platinum: '1.25%', Diamond: '1.5%',
};
const VIP_TASKS_PER_SET: Record<string, number> = {
  Normal: 35, Silver: 40, Gold: 45, Platinum: 50, Diamond: 55,
};

interface AdminSettingsPageProps {
  session: AdminSession;
}

export function AdminSettingsPage({ session }: AdminSettingsPageProps) {
  const [ranges, setRanges] = useState<Record<string, { min: number; max: number }> | null>(null);
  const [loadingRanges, setLoadingRanges] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/vip-commission-ranges`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
        );
        if (res.ok && !cancelled) {
          const data = await res.json().catch(() => ({}));
          if (data?.config?.ranges) setRanges(data.config.ranges);
        }
      } catch {}
      if (!cancelled) setLoadingRanges(false);
    };
    load();
    return () => { cancelled = true; };
  }, [session]);

  const formatRange = (tier: string) => {
    const r = ranges?.[tier];
    if (!r) return '—';
    return `$${Number(r.min).toLocaleString()} – $${Number(r.max).toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">Live VIP tier configuration from backend.</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>VIP Tiers Configuration</CardTitle>
          <CardDescription>{loadingRanges ? 'Loading live commission ranges…' : 'Commission rates and task product amount ranges per VIP tier.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {VIP_TIERS.map((tier) => (
            <p key={tier}>
              <span className="font-medium">{tier}:</span>{' '}
              {VIP_COMMISSION_RATES[tier]} commission, {VIP_TASKS_PER_SET[tier]} products/set,{' '}
              task range{' '}
              {loadingRanges ? <span className="italic text-slate-400">loading…</span> : formatRange(tier)}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Access Governance</CardTitle>
          <CardDescription>Role: {isSuperAdmin(session) ? 'Super-admin' : 'Sub-admin'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>Sub-admin access remains permission-scoped and backend enforced.</p>
          <p>Use Sub-admins page for account provisioning and permissions.</p>
          <p>Use Support Links page for WhatsApp/Telegram link configuration.</p>
        </CardContent>
      </Card>
    </div>
  );
}
