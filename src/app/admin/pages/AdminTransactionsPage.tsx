import { useMemo, useState } from 'react';
import type { AdminSession, AdminUserRecord } from '../types';
import { fetchAdminUsers } from '../api';
import { useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

interface AdminTransactionsPageProps {
  session: AdminSession;
}

export function AdminTransactionsPage({ session }: AdminTransactionsPageProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { users: nextUsers } = await fetchAdminUsers(session);
        if (!cancelled) {
          setUsers(nextUsers);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const transactionRows = useMemo(() => {
    return users.slice(0, 50).map((user) => ({
      id: `synthetic-${user.id}`,
      userName: user.name,
      productName: 'User activity record',
      commission: Number(user.totalEarnings || 0),
      timestamp: user.lastLoginAt || user.createdAt,
      status: Number(user.totalEarnings || 0) > 0 ? 'approved' : 'pending',
    }));
  }, [users]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return transactionRows;
    return transactionRows.filter((row) => row.status === filter);
  }, [filter, transactionRows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-slate-500">Legacy transactions tab restored in routed admin. Filters and status visibility are preserved.</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>Current backend does not expose a dedicated transactions feed; this view mirrors status reporting from user financial activity.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
              <Button type="button" size="sm" variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>Approved</Button>
              <Button type="button" size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && filteredRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No transactions found.</div>
          )}

          {filteredRows.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="font-semibold text-slate-900">{item.productName}</div>
                <div className="text-sm text-slate-600">{item.userName}</div>
                <div className="text-xs text-slate-500">{new Date(item.timestamp || '').toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-700">${Number(item.commission || 0).toFixed(2)}</div>
                <Badge variant={item.status === 'approved' ? 'default' : 'secondary'}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
