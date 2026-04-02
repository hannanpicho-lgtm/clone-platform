import { useMemo, useState } from 'react';
import type { AdminSession, AdminUserRecord } from '../types';
import { fetchAdminUsers } from '../api';
import { useEffect } from 'react';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { UserAccountStatusBadge } from '../components/AdminStatusBadge';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface AdminTransactionsPageProps {
  session: AdminSession;
}

export function AdminTransactionsPage({ session }: AdminTransactionsPageProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'frozen'>('all');

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

  const activeUsers = useMemo(
    () => users.filter((u) => u.productsSubmitted > 0 || Number(u.totalEarnings || 0) > 0),
    [users],
  );

  const filteredUsers = useMemo(() => {
    if (filter === 'active') return activeUsers.filter((u) => !u.accountFrozen && !u.accountDisabled);
    if (filter === 'frozen') return activeUsers.filter((u) => u.accountFrozen);
    return activeUsers;
  }, [filter, activeUsers]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Transactions" description="User earnings activity — real data from backend user accounts." />

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>User Earnings Activity</CardTitle>
              <CardDescription>Live earnings totals and product submission counts per user.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
              <Button type="button" size="sm" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Active</Button>
              <Button type="button" size="sm" variant={filter === 'frozen' ? 'default' : 'outline'} onClick={() => setFilter('frozen')}>Frozen</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <AdminEmptyState message="Loading…" />}
          {!loading && filteredUsers.length === 0 && <AdminEmptyState message="No transactions found." />}

          {!loading && (
            <>
              <div className="space-y-3 md:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.id}</div>
                      </div>
                      <UserAccountStatusBadge accountDisabled={user.accountDisabled} accountFrozen={user.accountFrozen} />
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{user.vipTier} · {user.productsSubmitted} products submitted</div>
                    <div className="mt-1 text-xs text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'No login recorded'}</div>
                    <div className="mt-2 font-semibold text-green-700">${Number(user.totalEarnings || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.id}</div>
                        </TableCell>
                        <TableCell><UserAccountStatusBadge accountDisabled={user.accountDisabled} accountFrozen={user.accountFrozen} /></TableCell>
                        <TableCell>{user.vipTier}</TableCell>
                        <TableCell>{Number(user.productsSubmitted || 0)}</TableCell>
                        <TableCell className="font-medium text-green-700">${Number(user.totalEarnings || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'No login recorded'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
