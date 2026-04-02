import type { AdminSession } from '../types';
import { useEffect, useState } from 'react';
import { isSuperAdmin } from '../permissions';
import { projectId } from '/utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const VIP_TIERS = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
type VipTier = typeof VIP_TIERS[number];

const VIP_COMMISSION_RATES: Record<string, string> = {
  Normal: '0.5%', Silver: '0.75%', Gold: '1.0%', Platinum: '1.25%', Diamond: '1.5%',
};
const VIP_TASKS_PER_SET: Record<string, number> = {
  Normal: 35, Silver: 40, Gold: 45, Platinum: 50, Diamond: 55,
};

const ADMIN_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3`;

interface AdminSettingsPageProps {
  session: AdminSession;
}

type RangeMap = Record<string, { min: number; max: number }>;

export function AdminSettingsPage({ session }: AdminSettingsPageProps) {
  const [ranges, setRanges] = useState<RangeMap | null>(null);
  const [draft, setDraft] = useState<RangeMap | null>(null);
  const [loadingRanges, setLoadingRanges] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const authHeaders = {
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  };

  const loadRanges = async () => {
    setLoadingRanges(true);
    try {
      const res = await fetch(`${ADMIN_FUNCTION_BASE}/admin/vip-commission-ranges`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.config?.ranges) setRanges(data.config.ranges);
      }
    } catch {}
    setLoadingRanges(false);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingRanges(true);
      try {
        const res = await fetch(`${ADMIN_FUNCTION_BASE}/admin/vip-commission-ranges`, { headers: authHeaders });
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

  const startEditing = () => {
    if (!ranges) return;
    setDraft(JSON.parse(JSON.stringify(ranges)));
    setSaveError('');
    setSaveSuccess('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setSaveError('');
    setSaveSuccess('');
    setEditing(false);
  };

  const setDraftField = (tier: VipTier, field: 'min' | 'max', raw: string) => {
    const val = parseFloat(raw);
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [tier]: { ...prev[tier], [field]: Number.isFinite(val) ? val : 0 },
      };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch(`${ADMIN_FUNCTION_BASE}/admin/vip-commission-ranges`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ranges: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data?.error || 'Failed to save commission ranges');
      } else {
        const saved = data?.config?.ranges || draft;
        setRanges(saved);
        setSaveSuccess('Commission ranges saved successfully.');
        setEditing(false);
        setDraft(null);
      }
    } catch {
      setSaveError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>VIP Tiers — Commission Ranges</CardTitle>
            <CardDescription>
              {loadingRanges
                ? 'Loading live commission ranges…'
                : 'Task product amount ranges per VIP tier. Changes take effect immediately.'}
            </CardDescription>
          </div>
          {!editing && !loadingRanges && ranges && (
            <Button variant="outline" size="sm" onClick={startEditing} className="shrink-0">
              Edit Ranges
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRanges ? (
            <p className="text-sm text-slate-400 italic">Loading…</p>
          ) : editing && draft ? (
            <div className="space-y-4">
              {VIP_TIERS.map((tier) => (
                <div key={tier} className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {tier}
                    <span className="ml-1 text-xs text-slate-400">({VIP_COMMISSION_RATES[tier]})</span>
                  </span>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Min ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={draft[tier]?.min ?? ''}
                      onChange={(e) => setDraftField(tier, 'min', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Max ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={draft[tier]?.max ?? ''}
                      onChange={(e) => setDraftField(tier, 'max', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-700">
              {saveSuccess && (
                <p className="text-sm text-green-600 mb-2">{saveSuccess}</p>
              )}
              {VIP_TIERS.map((tier) => (
                <p key={tier}>
                  <span className="font-medium">{tier}:</span>{' '}
                  {VIP_COMMISSION_RATES[tier]} commission, {VIP_TASKS_PER_SET[tier]} products/set,{' '}
                  task range {formatRange(tier)}
                </p>
              ))}
            </div>
          )}
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

