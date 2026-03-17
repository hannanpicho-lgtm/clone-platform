import { useEffect, useMemo, useState } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import {
  adjustUserBalance,
  assignUserPremium,
  deleteAdminUser,
  fetchAdminUsers,
  resetUserTaskSet,
  unfreezeUser,
  updateUserAccountStatus,
  updateUserTaskLimits,
  updateUserVipTier,
} from '../api';
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

function formatLocation(value?: string | null) {
  const v = String(value || '').trim();
  return v || 'Unknown';
}

function formatIp(value?: string | null) {
  const v = String(value || '').trim();
  return v || 'Unknown';
}

function tasksPerSetForTier() {
  return 3;
}

function isResetRequired(user: AdminUserRecord) {
  return Number(user.currentSetTasksCompleted || 0) >= tasksPerSetForTier();
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [vipTierDraft, setVipTierDraft] = useState('Normal');
  const detailsPanelRef = useRef<HTMLDivElement>(null);

  const canManageStatus = hasAdminPermission(session, 'users.manage_status');
    useEffect(() => {
      if (selectedUserId && detailsPanelRef.current) {
        setTimeout(() => detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }, [selectedUserId]);

  const canDeleteUsers = session.role === 'super-admin';
  const canAdjustBalance = hasAdminPermission(session, 'users.adjust_balance') || hasAdminPermission(session, 'users.manage');
  const canAssignPremium = hasAdminPermission(session, 'users.assign_premium') || hasAdminPermission(session, 'premium.assign') || hasAdminPermission(session, 'premium.manage');
  const canResetTasks = hasAdminPermission(session, 'users.reset_tasks') || hasAdminPermission(session, 'users.manage');
  const canManageTaskLimits = hasAdminPermission(session, 'users.manage_task_limits') || hasAdminPermission(session, 'users.manage');
  const canUnfreezeUsers = hasAdminPermission(session, 'users.unfreeze') || hasAdminPermission(session, 'users.manage');
  const canUpdateVip = hasAdminPermission(session, 'users.update_vip') || hasAdminPermission(session, 'users.manage');

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

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUser) return;
    setVipTierDraft(selectedUser.vipTier || 'Normal');
  }, [selectedUser?.id, selectedUser?.vipTier]);

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

  const handleUnfreeze = async (user: AdminUserRecord) => {
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await unfreezeUser(session, user.id);
      setMessage(`${user.name} unfrozen successfully.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfreeze user');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleUpdateVip = async (user: AdminUserRecord) => {
    if (!vipTierDraft.trim()) {
      setError('Select a VIP tier first.');
      return;
    }
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await updateUserVipTier(session, user.id, vipTierDraft);
      setMessage(`${user.name} VIP tier updated to ${vipTierDraft}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update VIP tier');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleAdjustBalance = async (user: AdminUserRecord) => {
    const amountRaw = window.prompt(`Adjust balance for ${user.name}. Enter amount (+/-):`, '100');
    if (amountRaw === null) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount === 0) {
      setError('Invalid amount.');
      return;
    }
    const category = window.prompt('Category (bonus/reward/topup/adjustment):', 'bonus') || 'bonus';
    const note = window.prompt('Optional note:', '') || '';

    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await adjustUserBalance(session, { userId: user.id, amount, category, note });
      setMessage(`${user.name} balance adjusted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust balance');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleAssignPremium = async (user: AdminUserRecord) => {
    const amountRaw = window.prompt(`Assign premium amount for ${user.name}:`, '1000');
    if (amountRaw === null) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Invalid premium amount.');
      return;
    }
    const posRaw = window.prompt('Optional encounter position:', '');
    const position = posRaw && posRaw.trim() ? Number(posRaw) : undefined;
    if (typeof position !== 'undefined' && !Number.isFinite(position)) {
      setError('Invalid premium position.');
      return;
    }

    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await assignUserPremium(session, { userId: user.id, amount, position });
      setMessage(`Premium assigned to ${user.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign premium');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleResetTaskSet = async (user: AdminUserRecord) => {
    if (!window.confirm(`Reset task set for ${user.name}?`)) return;
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await resetUserTaskSet(session, user.id, isResetRequired(user) ? 'complete_set' : 'manual');
      setMessage(`${user.name} task set reset.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset task set');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleUpdateTaskLimits = async (user: AdminUserRecord) => {
    const dailyRaw = window.prompt('Daily task set limit:', String(user.dailyTaskSetLimit || 3));
    if (dailyRaw === null) return;
    const extraRaw = window.prompt('Extra task sets:', String(user.extraTaskSets || 0));
    if (extraRaw === null) return;
    const withdrawalRaw = window.prompt('Withdrawal limit (0 = no cap):', String(user.withdrawalLimit || 0));
    if (withdrawalRaw === null) return;

    const dailyTaskSetLimit = Number(dailyRaw);
    const extraTaskSets = Number(extraRaw);
    const withdrawalLimit = Number(withdrawalRaw);

    if (!Number.isFinite(dailyTaskSetLimit) || dailyTaskSetLimit < 1) {
      setError('Daily task set limit must be at least 1.');
      return;
    }
    if (!Number.isFinite(extraTaskSets) || extraTaskSets < 0) {
      setError('Extra task sets cannot be negative.');
      return;
    }
    if (!Number.isFinite(withdrawalLimit) || withdrawalLimit < 0) {
      setError('Withdrawal limit cannot be negative.');
      return;
    }

    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await updateUserTaskLimits(session, { userId: user.id, dailyTaskSetLimit, extraTaskSets, withdrawalLimit });
      setMessage(`${user.name} task limits updated.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task limits');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin Users</h1>
        <p className="text-sm text-slate-500">Full user operations parity: status, delete, unfreeze, VIP updates, premium assignment, balance and task controls.</p>
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
                <TableHead>Balance</TableHead>
                <TableHead>Products</TableHead>
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
                    <div className="text-xs text-slate-500">Location: {formatLocation(user.lastLoginCountry)}</div>
                    <div className="text-xs text-slate-500">IP: {formatIp(user.lastLoginIp)}</div>
                    <div className="text-xs text-slate-500">Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</div>
                    {isResetRequired(user) && <div className="text-xs font-semibold text-amber-700">Reset required</div>}
                  </TableCell>
                  <TableCell>{getAccountBadge(user)}</TableCell>
                  <TableCell>
                    <Badge variant={getSubscriptionStatus(user) === 'Active' ? 'default' : 'secondary'}>
                      {getSubscriptionStatus(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.vipTier}</TableCell>
                  <TableCell className={user.balance < 0 ? 'text-red-600' : 'text-green-700'}>${Number(user.balance || 0).toLocaleString()}</TableCell>
                  <TableCell>{Number(user.productsSubmitted || 0)}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {canManageStatus || canDeleteUsers || canUnfreezeUsers || canAdjustBalance || canAssignPremium || canResetTasks || canManageTaskLimits || canUpdateVip ? (
                      <div className="inline-flex items-center gap-2">
                        {canUnfreezeUsers && user.accountFrozen && !user.accountDisabled && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pendingUserId === user.id}
                            onClick={() => handleUnfreeze(user)}
                          >
                            Unfreeze
                          </Button>
                        )}
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
                        {canAssignPremium && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pendingUserId === user.id || user.accountDisabled}
                            onClick={() => handleAssignPremium(user)}
                          >
                            Premium
                          </Button>
                        )}
                        {canAdjustBalance && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pendingUserId === user.id || user.accountDisabled}
                            onClick={() => handleAdjustBalance(user)}
                          >
                            Adjust
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          Details
                        </Button>
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

          {selectedUser && (
            <Card ref={detailsPanelRef} className="border-slate-200 bg-slate-50">
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>{selectedUser.name} ({selectedUser.email || selectedUser.id})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="text-sm"><span className="text-slate-500">Total earnings:</span> ${Number(selectedUser.totalEarnings || 0).toLocaleString()}</div>
                  <div className="text-sm"><span className="text-slate-500">Frozen negative:</span> ${Number(selectedUser.frozenNegativeAmount || 0).toLocaleString()}</div>
                  <div className="text-sm"><span className="text-slate-500">Task progress:</span> {Number(selectedUser.currentSetTasksCompleted || 0)} / {tasksPerSetForTier()}</div>
                  <div className="text-sm"><span className="text-slate-500">Daily sets used:</span> {Number(selectedUser.taskSetsCompletedToday || 0)}</div>
                  <div className="text-sm"><span className="text-slate-500">Daily limit:</span> {Number(selectedUser.dailyTaskSetLimit || 0)}</div>
                  <div className="text-sm"><span className="text-slate-500">Extra sets:</span> {Number(selectedUser.extraTaskSets || 0)}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canUpdateVip && (
                    <>
                      <Select value={vipTierDraft} onValueChange={setVipTierDraft}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="VIP Tier" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Platinum">Platinum</SelectItem>
                          <SelectItem value="Diamond">Diamond</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" disabled={pendingUserId === selectedUser.id} onClick={() => handleUpdateVip(selectedUser)}>
                        Update VIP
                      </Button>
                    </>
                  )}
                  {canResetTasks && (
                    <Button type="button" size="sm" variant="outline" disabled={pendingUserId === selectedUser.id || selectedUser.accountDisabled} onClick={() => handleResetTaskSet(selectedUser)}>
                      Reset Task Set
                    </Button>
                  )}
                  {canManageTaskLimits && (
                    <Button type="button" size="sm" variant="outline" disabled={pendingUserId === selectedUser.id || selectedUser.accountDisabled} onClick={() => handleUpdateTaskLimits(selectedUser)}>
                      Set Limits
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedUserId(null)}>Close</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}