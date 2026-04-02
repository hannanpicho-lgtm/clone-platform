import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  adjustUserBalance,
  assignUserPremium,
  deleteAdminUser,
  fetchAdminUsers,
  fetchUserComprehensiveAuditReport,
  resetUserLoginPassword,
  resetUserTaskSet,
  resetUserWithdrawalPin,
  unfreezeUser,
  updateUserAccountStatus,
  updateUserTaskLimits,
  updateUserVipTier,
} from '../api';
import { hasAdminPermission } from '../permissions';
import type { AdminMetrics, AdminSession, AdminUserRecord, UserComprehensiveAuditReport } from '../types';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { UserAccountStatusBadge } from '../components/AdminStatusBadge';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
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
  // Balance adjustment form state
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustCategory, setAdjustCategory] = useState('bonus');
  const [adjustNote, setAdjustNote] = useState('');
  // Premium assignment form state
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumPosition, setPremiumPosition] = useState('');
  // Task limits form state
  const [taskLimitDaily, setTaskLimitDaily] = useState('3');
  const [taskLimitExtra, setTaskLimitExtra] = useState('0');
  const [taskLimitWithdrawal, setTaskLimitWithdrawal] = useState('0');

  // PIN/password reset form state
  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newWithdrawalPin, setNewWithdrawalPin] = useState('');
  const [auditReport, setAuditReport] = useState<UserComprehensiveAuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  const canManageStatus = hasAdminPermission(session, 'users.manage_status');

  const canDeleteUsers = session.role === 'super-admin';
  const canAdjustBalance = hasAdminPermission(session, 'users.adjust_balance') || hasAdminPermission(session, 'users.manage');
  const canAssignPremium = hasAdminPermission(session, 'users.assign_premium') || hasAdminPermission(session, 'premium.assign') || hasAdminPermission(session, 'premium.manage');
  const canResetTasks = hasAdminPermission(session, 'users.reset_tasks') || hasAdminPermission(session, 'users.manage');
  const canManageTaskLimits = hasAdminPermission(session, 'users.manage_task_limits') || hasAdminPermission(session, 'users.manage');
  const canUnfreezeUsers = hasAdminPermission(session, 'users.unfreeze') || hasAdminPermission(session, 'users.manage');
  const canUpdateVip = hasAdminPermission(session, 'users.update_vip') || hasAdminPermission(session, 'users.manage');
  const canResetPasswords = hasAdminPermission(session, 'users.reset_password');
  const canManageAnyUser = canManageStatus || canDeleteUsers || canUnfreezeUsers || canAdjustBalance || canAssignPremium || canResetTasks || canManageTaskLimits || canUpdateVip;

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

  // Initialise sheet form fields whenever a different user is selected
  useEffect(() => {
    if (!selectedUser) return;
    setVipTierDraft(selectedUser.vipTier || 'Normal');
    setTaskLimitDaily(String(selectedUser.dailyTaskSetLimit ?? 3));
    setTaskLimitExtra(String(selectedUser.extraTaskSets ?? 0));
    setTaskLimitWithdrawal(String(selectedUser.withdrawalLimit ?? 0));
    setAdjustAmount('');
    setAdjustCategory('bonus');
    setAdjustNote('');
    setPremiumAmount('');
    setPremiumPosition('');
    setNewLoginPassword('');
    setNewWithdrawalPin('');
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!selectedUserId) {
      setAuditReport(null);
      setAuditError('');
      return;
    }

    let cancelled = false;
    const loadAudit = async () => {
      setAuditLoading(true);
      setAuditError('');
      try {
        const report = await fetchUserComprehensiveAuditReport(session, selectedUserId);
        if (!cancelled) {
          setAuditReport(report);
        }
      } catch (err) {
        if (!cancelled) {
          setAuditError(err instanceof Error ? err.message : 'Failed to load user audit report');
        }
      } finally {
        if (!cancelled) {
          setAuditLoading(false);
        }
      }
    };

    loadAudit();
    return () => {
      cancelled = true;
    };
  }, [selectedUserId, session]);

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
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      setError('Enter a non-zero adjustment amount.');
      return;
    }
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await adjustUserBalance(session, { userId: user.id, amount, category: adjustCategory, note: adjustNote });
      setMessage(`Balance adjusted by $${amount > 0 ? '+' : ''}${amount} for ${user.name}.`);
      setAdjustAmount('');
      setAdjustNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust balance');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleAssignPremium = async (user: AdminUserRecord) => {
    const amount = Number(premiumAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid premium amount greater than 0.');
      return;
    }
    const posNum = premiumPosition.trim() ? Number(premiumPosition) : undefined;
    if (typeof posNum !== 'undefined' && !Number.isFinite(posNum)) {
      setError('Invalid position — enter a number or leave blank.');
      return;
    }
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await assignUserPremium(session, { userId: user.id, amount, position: posNum });
      setMessage(`Premium of $${amount} assigned to ${user.name}.`);
      setPremiumAmount('');
      setPremiumPosition('');
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
    const dailyTaskSetLimit = Number(taskLimitDaily);
    const extraTaskSets = Number(taskLimitExtra);
    const withdrawalLimit = Number(taskLimitWithdrawal);

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

  const handleResetLoginPassword = async (user: AdminUserRecord) => {
    if (newLoginPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await resetUserLoginPassword(session, user.id, newLoginPassword);
      setMessage(`Login password reset for ${user.name}.`);
      setNewLoginPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset login password');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleResetWithdrawalPin = async (user: AdminUserRecord) => {
    if (newWithdrawalPin.length < 4) {
      setError('New PIN must be at least 4 characters.');
      return;
    }
    try {
      setPendingUserId(user.id);
      setError('');
      setMessage('');
      await resetUserWithdrawalPin(session, user.id, newWithdrawalPin);
      setMessage(`Withdrawal PIN reset for ${user.name}.`);
      setNewWithdrawalPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset withdrawal PIN');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Users"
        description="Full user operations parity: status, delete, unfreeze, VIP updates, premium assignment, balance and task controls."
      />

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

          <AdminFeedback success={message} error={error} />

          {loading && <AdminEmptyState message="Loading users…" />}

          {!loading && (
          <>
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email || user.id}</div>
                  </div>
                  <UserAccountStatusBadge accountDisabled={user.accountDisabled} accountFrozen={user.accountFrozen} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>Tier: <span className="font-medium text-slate-800">{user.vipTier}</span></div>
                  <div>Products: <span className="font-medium text-slate-800">{Number(user.productsSubmitted || 0)}</span></div>
                  <div>Balance: <span className={user.balance < 0 ? 'font-medium text-red-600' : 'font-medium text-green-700'}>${Number(user.balance || 0).toLocaleString()}</span></div>
                  <div>Created: <span className="font-medium text-slate-800">{formatDate(user.createdAt)}</span></div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={getSubscriptionStatus(user) === 'Active' ? 'default' : 'secondary'}>
                    {getSubscriptionStatus(user)}
                  </Badge>
                  {isResetRequired(user) && <span className="text-xs font-semibold text-amber-700">Reset required</span>}
                </div>

                <div className="mt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}>
                    Details
                  </Button>
                  {canUnfreezeUsers && user.accountFrozen && !user.accountDisabled && (
                    <Button type="button" variant="outline" size="sm" disabled={pendingUserId === user.id} onClick={() => handleUnfreeze(user)}>
                      Unfreeze
                    </Button>
                  )}
                  {canManageStatus && (
                    <Button type="button" variant={user.accountDisabled ? 'default' : 'outline'} size="sm" disabled={pendingUserId === user.id} onClick={() => handleToggleStatus(user)}>
                      {pendingUserId === user.id ? 'Saving...' : user.accountDisabled ? 'Activate' : 'Suspend'}
                    </Button>
                  )}
                  {canDeleteUsers && (
                    <Button type="button" variant="destructive" size="sm" disabled={pendingUserId === user.id} onClick={() => handleDeleteUser(user)}>
                      Delete
                    </Button>
                  )}
                </div>
              </button>
            ))}

            {!loading && filteredUsers.length === 0 && (
              <AdminEmptyState message="No users match the current filters." />
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email || user.id}</div>
                      <div className="text-xs text-slate-500">Location: {formatLocation(user.lastLoginCountry)} · IP: {formatIp(user.lastLoginIp)}</div>
                      <div className="text-xs text-slate-500">Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</div>
                      {isResetRequired(user) && <div className="text-xs font-semibold text-amber-700">Reset required</div>}
                    </TableCell>
                    <TableCell><UserAccountStatusBadge accountDisabled={user.accountDisabled} accountFrozen={user.accountFrozen} /></TableCell>
                    <TableCell>{user.vipTier}</TableCell>
                    <TableCell className={user.balance < 0 ? 'text-red-600' : 'text-green-700'}>${Number(user.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(user.productsSubmitted || 0)}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      {canManageAnyUser ? (
                        <div className="inline-flex items-center gap-2">
                          {canUnfreezeUsers && user.accountFrozen && !user.accountDisabled && (
                            <Button type="button" variant="outline" size="sm" disabled={pendingUserId === user.id} onClick={() => handleUnfreeze(user)}>
                              Unfreeze
                            </Button>
                          )}
                          {canManageStatus && (
                            <Button type="button" variant={user.accountDisabled ? 'default' : 'outline'} size="sm" disabled={pendingUserId === user.id} onClick={() => handleToggleStatus(user)}>
                              {pendingUserId === user.id ? 'Saving...' : user.accountDisabled ? 'Activate' : 'Suspend'}
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}>
                            Details
                          </Button>
                          {canDeleteUsers && (
                            <Button type="button" variant="destructive" size="sm" disabled={pendingUserId === user.id} onClick={() => handleDeleteUser(user)}>
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
                    <TableCell colSpan={7} className="text-center text-slate-500">
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </>
          )}

        </CardContent>
      </Card>

      {/* User details slide-over sheet */}
      <Sheet open={!!selectedUserId} onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}>
        <SheetContent className="sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>{selectedUser?.name}</SheetTitle>
            <SheetDescription>{selectedUser?.email || selectedUser?.id}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Overview stats */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Account Overview</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-slate-500">Balance:</span> <span className={selectedUser && selectedUser.balance < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>${Number(selectedUser?.balance || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Total earnings:</span> ${Number(selectedUser?.totalEarnings || 0).toLocaleString()}</div>
                <div><span className="text-slate-500">VIP tier:</span> {selectedUser?.vipTier}</div>
                <div><span className="text-slate-500">Products submitted:</span> {Number(selectedUser?.productsSubmitted || 0)}</div>
                <div><span className="text-slate-500">Task progress:</span> {Number(selectedUser?.currentSetTasksCompleted || 0)}</div>
                <div><span className="text-slate-500">Sets today:</span> {Number(selectedUser?.taskSetsCompletedToday || 0)} / {Number(selectedUser?.dailyTaskSetLimit || 0)}</div>
                <div><span className="text-slate-500">Extra sets:</span> {Number(selectedUser?.extraTaskSets || 0)}</div>
                <div><span className="text-slate-500">Withdrawal cap:</span> ${Number(selectedUser?.withdrawalLimit || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Financial Audit</p>
              {auditLoading && <p className="text-sm text-slate-500">Loading audit report...</p>}
              {auditError && <p className="text-sm text-red-600">{auditError}</p>}
              {auditReport && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded border border-slate-200 p-2">
                      <p className="text-xs text-slate-500">Deposits</p>
                      <p className="font-semibold">${auditReport.metrics.totalDeposits.toFixed(2)}</p>
                    </div>
                    <div className="rounded border border-slate-200 p-2">
                      <p className="text-xs text-slate-500">Withdrawals</p>
                      <p className="font-semibold">${auditReport.metrics.totalWithdrawals.toFixed(2)}</p>
                    </div>
                    <div className="rounded border border-slate-200 p-2">
                      <p className="text-xs text-slate-500">Net flow</p>
                      <p className="font-semibold">${auditReport.metrics.netFlow.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {auditReport.events.slice(0, 12).map((event) => (
                      <div key={event.id} className="rounded border border-slate-200 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">{event.type.replaceAll('_', ' ')}</span>
                          <span className="text-slate-500">{new Date(event.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-slate-600">
                          <span>Status: {event.status || 'n/a'}</span>
                          <span>Amount: ${Number(event.amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {auditReport.events.length === 0 && (
                      <p className="text-xs text-slate-500">No audit events available.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* VIP Tier */}
            {canUpdateVip && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">VIP Tier</p>
                <div className="flex gap-2 items-center">
                  <Select value={vipTierDraft} onValueChange={setVipTierDraft}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Select tier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Platinum">Platinum</SelectItem>
                      <SelectItem value="Diamond">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" disabled={!selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleUpdateVip(selectedUser)}>Save</Button>
                </div>
              </div>
            )}

            {/* Balance Adjustment */}
            {canAdjustBalance && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adjust Balance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Amount (+/−)</Label>
                    <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="e.g. 100 or -50" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Category</Label>
                    <Select value={adjustCategory} onValueChange={setAdjustCategory}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bonus">Bonus</SelectItem>
                        <SelectItem value="reward">Reward</SelectItem>
                        <SelectItem value="topup">Topup</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Note (optional)</Label>
                  <Input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Internal note" className="h-8 text-sm" />
                </div>
                <Button type="button" size="sm" disabled={!adjustAmount || !selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleAdjustBalance(selectedUser)}>Apply Adjustment</Button>
              </div>
            )}

            {/* Premium Assignment */}
            {canAssignPremium && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign Premium Order</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Amount ($)</Label>
                    <Input type="number" min={1} value={premiumAmount} onChange={(e) => setPremiumAmount(e.target.value)} placeholder="e.g. 1000" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Position (optional)</Label>
                    <Input type="number" min={1} value={premiumPosition} onChange={(e) => setPremiumPosition(e.target.value)} placeholder="Leave blank for auto" className="h-8 text-sm" />
                  </div>
                </div>
                <Button type="button" size="sm" disabled={!premiumAmount || !selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleAssignPremium(selectedUser)}>Assign Premium</Button>
              </div>
            )}

            {/* Task Limits */}
            {canManageTaskLimits && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task Limits</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Daily set limit</Label>
                    <Input type="number" min={1} value={taskLimitDaily} onChange={(e) => setTaskLimitDaily(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Extra sets</Label>
                    <Input type="number" min={0} value={taskLimitExtra} onChange={(e) => setTaskLimitExtra(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Withdrawal cap ($)</Label>
                    <Input type="number" min={0} value={taskLimitWithdrawal} onChange={(e) => setTaskLimitWithdrawal(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <Button type="button" size="sm" disabled={!selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleUpdateTaskLimits(selectedUser)}>Save Limits</Button>
              </div>
            )}

            {/* Password Resets */}
            {canResetPasswords && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password Resets</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">New login password</Label>
                    <Input
                      type="password"
                      value={newLoginPassword}
                      onChange={(e) => setNewLoginPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="h-8 text-sm"
                    />
                    <Button type="button" size="sm" className="w-full mt-1" disabled={!newLoginPassword || !selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleResetLoginPassword(selectedUser)}>
                      Set Login Password
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">New withdrawal PIN</Label>
                    <Input
                      type="password"
                      value={newWithdrawalPin}
                      onChange={(e) => setNewWithdrawalPin(e.target.value)}
                      placeholder="Min 4 characters"
                      className="h-8 text-sm"
                    />
                    <Button type="button" size="sm" className="w-full mt-1" disabled={!newWithdrawalPin || !selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleResetWithdrawalPin(selectedUser)}>
                      Set Withdrawal PIN
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {canResetTasks && (
                <Button type="button" size="sm" variant="outline" disabled={!selectedUser || pendingUserId === selectedUser.id || !!selectedUser?.accountDisabled} onClick={() => selectedUser && handleResetTaskSet(selectedUser)}>Reset Task Set</Button>
              )}
              {canUnfreezeUsers && selectedUser?.accountFrozen && (
                <Button type="button" size="sm" variant="outline" disabled={!selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleUnfreeze(selectedUser)}>Unfreeze</Button>
              )}
              {canDeleteUsers && (
                <Button type="button" size="sm" variant="destructive" disabled={!selectedUser || pendingUserId === selectedUser.id} onClick={() => selectedUser && handleDeleteUser(selectedUser)}>Delete User</Button>
              )}
            </div>

            <AdminFeedback success={message} error={error} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}