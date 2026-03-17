import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { deleteAdminUser, fetchAdminUsers, updateUserAccountStatus } from '../api';
import { hasAdminPermission } from '../permissions';
import type { AdminMetrics, AdminSession, AdminUserRecord } from '../types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface AdminUsersPageProps {
  session: AdminSession;
}

const EMPTY_METRICS: AdminMetrics = {
  totalUsers: 0,
  totalRevenue: 0,
  totalTransactions: 0,
  activeUsers: 0,
  frozenAccounts: 0,
  totalCommissionsPaid: 0,
};

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

function getAccountBadge(user: AdminUserRecord) {
  if (user.accountDisabled) {
    return <Badge variant="destructive">Suspended</Badge>;
  }
  if (user.accountFrozen) {
    return <Badge variant="secondary">Frozen</Badge>;
  }
  return <Badge variant="default">Active</Badge>;
}

function getSubscriptionStatus(user: AdminUserRecord) {
  return user.vipTier !== 'Normal' ? 'Active' : 'Free';
}

export function AdminUsersPage({ session }: AdminUsersPageProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics>(EMPTY_METRICS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const canManageStatus = hasAdminPermission(session, 'users.manage_status');
  const canDeleteUsers = session.role === 'super-admin';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { users: nextUsers, metrics: nextMetrics } = await fetchAdminUsers(session);
      setUsers(nextUsers);
      setMetrics(nextMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || [user.name, user.email, user.id, user.vipTier].some((value) => String(value).toLowerCase().includes(query));
      if (!matchesQuery) return false;

      switch (filter) {
        case 'active':
          return !user.accountDisabled && !user.accountFrozen;
        case 'suspended':
          return user.accountDisabled;
        case 'frozen':
          return user.accountFrozen;
        case 'subscribed':
          return user.vipTier !== 'Normal';
        default:
          return true;
      }
    });
  }, [filter, search, users]);

  const handleToggleStatus = async (user: AdminUserRecord) => {
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await updateUserAccountStatus(session, user.id, !user.accountDisabled);
      setMessage(`${user.name} is now ${user.accountDisabled ? 'active' : 'suspended'}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (!canDeleteUsers) {
      setError('Only super-admin can delete users.');
      return;
    }
    if (!window.confirm(`Delete ${user.name} (${user.email || user.id})? This action is persisted and cannot be undone from UI.`)) {
      return;
    }

    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await deleteAdminUser(session, user.id);
      setMessage(`${user.name} deleted successfully.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin Users</h1>
        <p className="text-sm text-slate-500">Search, filter, suspend/activate users, and review subscription status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription>Total users</CardDescription>
            <CardTitle>{loading ? '...' : metrics.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription>Enabled users</CardDescription>
            <CardTitle>{loading ? '...' : metrics.activeUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription>Frozen accounts</CardDescription>
            <CardTitle>{loading ? '...' : metrics.frozenAccounts}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Sub-admins can manage users here, but sub-admin and billing controls stay restricted elsewhere.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, user ID, or tier"
              className="md:max-w-sm"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {message && <div className="text-sm text-green-600">{message}</div>}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email || user.id}</div>
                  </TableCell>
                  <TableCell>{getAccountBadge(user)}</TableCell>
                  <TableCell>
                    <Badge variant={getSubscriptionStatus(user) === 'Active' ? 'default' : 'secondary'}>
                      {getSubscriptionStatus(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.vipTier}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {canManageStatus || canDeleteUsers ? (
                      <div className="inline-flex items-center gap-2">
                        {canManageStatus && (
                          <Button
                            type="button"
                            variant={user.accountDisabled ? 'default' : 'outline'}
                            size="sm"
                            disabled={pendingUserId === user.id}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {pendingUserId === user.id ? 'Saving...' : user.accountDisabled ? 'Activate' : 'Suspend'}
                          </Button>
                        )}
                        {canDeleteUsers && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={pendingUserId === user.id}
                            onClick={() => handleDeleteUser(user)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Read only
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}