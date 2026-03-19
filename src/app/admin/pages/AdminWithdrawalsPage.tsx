import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { approveWithdrawal, denyWithdrawal, fetchAdminWithdrawals } from '../api';
import type { AdminSession, AdminWithdrawalRequest } from '../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

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

  const handleDeny = async (id: string) => {
    const reason = window.prompt('Enter denial reason:', 'Insufficient verification details');
    if (!reason || !reason.trim()) return;

    try {
      setSavingId(id);
      setError('');
      setMessage('');
      await denyWithdrawal(session, id, reason.trim());
      setMessage('Withdrawal denied successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny withdrawal');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Withdrawals</h1>
        <p className="text-sm text-slate-500">Review pending requests and approve or deny with a reason.</p>
      </div>

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
          {message && <div className="text-sm text-green-600">{message}</div>}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {pending.length === 0 && !loading && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No pending withdrawals.</div>
          )}

          {pending.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="font-semibold text-slate-900">{item.userName}</div>
                <div className="text-sm text-slate-600">{item.userEmail || item.userId}</div>
                <div className="text-xs text-slate-500">Requested: {formatDate(item.requestedAt)}</div>
              </div>
              <div className="btn-group md:w-auto md:max-w-[32rem]">
                <div className="min-w-[110px] text-right font-semibold">${Number(item.amount || 0).toLocaleString()}</div>
                <Button type="button" size="sm" className="btn-primary-action bg-green-600 hover:bg-green-700 text-white" disabled={savingId === item.id} onClick={() => handleApprove(item.id)}>
                  Approve
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={savingId === item.id} onClick={() => handleDeny(item.id)}>
                  Deny
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
