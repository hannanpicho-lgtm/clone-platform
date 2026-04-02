import { useEffect, useMemo, useRef, useState } from 'react';
import { approveWithdrawal, denyWithdrawal, fetchAdminWithdrawals } from '../api';
import type { AdminSession, AdminWithdrawalRequest } from '../types';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface AdminWithdrawalsPageProps {
  session: AdminSession;
}

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export function AdminWithdrawalsPage({ session }: AdminWithdrawalsPageProps) {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('Insufficient verification details');
  const reasonInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setWithdrawals(await fetchAdminWithdrawals(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  const pending = useMemo(() => withdrawals.filter((w) => w.status === 'pending'), [withdrawals]);
  const pendingTotal = useMemo(() => pending.reduce((sum, item) => sum + Number(item.amount || 0), 0), [pending]);

  const handleApprove = async (id: string) => {
    try {
      setSavingId(id);
      setError('');
      setMessage('');
      await approveWithdrawal(session, id);
      setMessage('Withdrawal approved successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve withdrawal');
    } finally {
      setSavingId(null);
    }
  };

  const openDenyForm = (id: string) => {
    setDenyReason('Insufficient verification details');
    setDenyingId(id);
    setTimeout(() => reasonInputRef.current?.focus(), 50);
  };

  const handleDenyConfirm = async (id: string) => {
    if (!denyReason.trim()) return;
    try {
      setSavingId(id);
      setError('');
      setMessage('');
      await denyWithdrawal(session, id, denyReason.trim());
      setMessage('Withdrawal denied successfully.');
      setDenyingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny withdrawal');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Withdrawals" description="Review pending requests and approve or deny with a reason." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Pending Requests</CardDescription><CardTitle>{loading ? '...' : pending.length}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Pending Amount</CardDescription><CardTitle>{loading ? '...' : `$${pendingTotal.toLocaleString()}`}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Mode</CardDescription><CardTitle>Live</CardTitle></CardHeader></Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Pending Withdrawals</CardTitle>
          <CardDescription>Actions are persisted to backend and reflected after refresh.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AdminFeedback success={message} error={error} />

          {pending.length === 0 && !loading && <AdminEmptyState message="No pending withdrawals." />}

          {pending.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.userName}</div>
                  <div className="text-sm text-slate-600">{item.userEmail || item.userId}</div>
                  <div className="text-xs text-slate-500">Requested: {formatDate(item.requestedAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="min-w-[110px] text-right font-semibold">${Number(item.amount || 0).toLocaleString()}</div>
                  <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={savingId === item.id || denyingId === item.id} onClick={() => handleApprove(item.id)}>
                    Approve
                  </Button>
                  <Button type="button" size="sm" variant="destructive" disabled={savingId === item.id} onClick={() => denyingId === item.id ? setDenyingId(null) : openDenyForm(item.id)}>
                    {denyingId === item.id ? 'Cancel' : 'Deny'}
                  </Button>
                </div>
              </div>

              {denyingId === item.id && (
                <div className="flex items-end gap-2 pt-1 border-t border-slate-200">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-slate-600">Denial reason</Label>
                    <Input
                      ref={reasonInputRef}
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      placeholder="Enter reason for denial"
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleDenyConfirm(item.id)}
                    />
                  </div>
                  <Button type="button" size="sm" variant="destructive" disabled={!denyReason.trim() || savingId === item.id} onClick={() => handleDenyConfirm(item.id)}>
                    Confirm Denial
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
