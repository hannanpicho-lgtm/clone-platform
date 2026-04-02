import { useEffect, useMemo, useState } from 'react';
import { createSubAdmin, deleteSubAdmin, fetchSubAdminComprehensiveReport, fetchSubAdmins, revokeSubAdmin, updateSubAdmin } from '../api';
import { SUB_ADMIN_DEFAULT_PERMISSIONS, SUB_ADMIN_PERMISSION_OPTIONS } from '../permissions';
import type { AdminSession, LimitedAdminAccount, SubAdminComprehensiveReport } from '../types';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface AdminSubAdminsPageProps {
  session: AdminSession;
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export function AdminSubAdminsPage({ session }: AdminSubAdminsPageProps) {
  const [accounts, setAccounts] = useState<LimitedAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<string[]>([...SUB_ADMIN_DEFAULT_PERMISSIONS]);
  const [editingAccount, setEditingAccount] = useState<LimitedAdminAccount | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [reportAccount, setReportAccount] = useState<LimitedAdminAccount | null>(null);
  const [reportData, setReportData] = useState<SubAdminComprehensiveReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const nextAccounts = await fetchSubAdmins(session);
      setAccounts(nextAccounts);
      if (editingAccount) {
        const refreshed = nextAccounts.find((account) => account.userId === editingAccount.userId) || null;
        setEditingAccount(refreshed);
        setEditingPermissions(refreshed?.permissions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sub-admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  const totals = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter((account) => account.status === 'active').length,
    revoked: accounts.filter((account) => account.status === 'revoked').length,
  }), [accounts]);

  const togglePermission = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((current) => (
      current.includes(value)
        ? current.filter((permission) => permission !== value)
        : [...current, value]
    ));
  };

  const handleCreate = async () => {
    if (!username.trim() || !displayName.trim() || !password.trim() || permissions.length === 0) {
      setError('Username, display name, temporary password, and at least one permission are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await createSubAdmin(session, {
        username: username.trim(),
        name: displayName.trim(),
        password,
        permissions,
      });
      setUsername('');
      setDisplayName('');
      setPassword('');
      setPermissions([...SUB_ADMIN_DEFAULT_PERMISSIONS]);
      setMessage('Sub-admin invited successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingAccount) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await updateSubAdmin(session, editingAccount.userId, {
        permissions: editingPermissions,
        active: editingAccount.active,
        displayName: editingAccount.displayName || editingAccount.username,
      });
      setMessage('Sub-admin permissions updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sub-admin permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account: LimitedAdminAccount) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await updateSubAdmin(session, account.userId, {
        permissions: account.permissions,
        active: !account.active,
        displayName: account.displayName || account.username,
      });
      setMessage(`Sub-admin ${account.active ? 'disabled' : 'enabled'}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (account: LimitedAdminAccount) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await revokeSubAdmin(session, account.userId);
      setMessage('Sub-admin access revoked.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: LimitedAdminAccount) => {
    if (!window.confirm(`Delete sub-admin ${account.displayName || account.username}? This will persist after refresh.`)) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await deleteSubAdmin(session, account.userId);
      setMessage('Sub-admin deleted successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleViewReport = async (account: LimitedAdminAccount) => {
    setReportAccount(account);
    setReportData(null);
    setReportError('');
    setReportLoading(true);
    try {
      const report = await fetchSubAdminComprehensiveReport(session, account.userId);
      setReportData(report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to load sub-admin report');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sub-admin Management"
        description="Super-admin only. Invite, permission, and revoke workflows are protected before render and again on the backend."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle>{totals.total}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle>{totals.active}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Revoked</CardDescription><CardTitle>{totals.revoked}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Invite Sub-admin</CardTitle>
            <CardDescription>Creates a scoped admin account using the existing Supabase-backed admin identity flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subadmin-username">Username</Label>
              <Input id="subadmin-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="operations_team" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subadmin-name">Display name</Label>
              <Input id="subadmin-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Operations Team" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subadmin-password">Temporary password</Label>
              <Input id="subadmin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" />
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              {SUB_ADMIN_PERMISSION_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <Checkbox
                    checked={permissions.includes(option.value)}
                    onCheckedChange={() => togglePermission(option.value, setPermissions)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <AdminFeedback success={message} error={error} />

            <Button type="button" className="w-full" disabled={saving} onClick={handleCreate}>
              {saving ? 'Saving...' : 'Invite Sub-admin'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Existing Sub-admins</CardTitle>
            <CardDescription>Super-admin only list of provisioned admin accounts and their scoped permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mobile card list */}
            <div className="space-y-3 md:hidden">
              {accounts.map((account) => (
                <div key={account.userId} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{account.displayName || account.username}</div>
                      <div className="text-xs text-slate-500">{account.authEmail || account.username}</div>
                    </div>
                    <AdminStatusBadge status={account.status} />
                  </div>
                  <div className="text-xs text-slate-600">
                    Managed users: <span className="font-medium text-slate-800">{account.usersCreated || 0}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {account.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">{permission}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setEditingAccount(account); setEditingPermissions(account.permissions); }}>Edit</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleViewReport(account)}>Report</Button>
                    <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => handleToggleActive(account)}>{account.active ? 'Disable' : 'Enable'}</Button>
                    <Button type="button" size="sm" variant="destructive" disabled={saving || account.status === 'revoked'} onClick={() => handleRevoke(account)}>Revoke</Button>
                    <Button type="button" size="sm" variant="destructive" disabled={saving} onClick={() => handleDelete(account)}>Delete</Button>
                  </div>
                </div>
              ))}
              {loading && <AdminEmptyState message="Loading sub-admins…" />}
              {!loading && accounts.length === 0 && <AdminEmptyState message="No sub-admin accounts found." />}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.userId}>
                      <TableCell>
                        <div className="font-medium">{account.displayName || account.username}</div>
                        <div className="text-xs text-slate-500">{account.authEmail || account.username}</div>
                      </TableCell>
                      <TableCell><AdminStatusBadge status={account.status} /></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {account.permissions.map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">{permission}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{account.usersCreated || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button type="button" size="sm" variant="outline" onClick={() => { setEditingAccount(account); setEditingPermissions(account.permissions); }}>Edit</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => handleViewReport(account)}>Report</Button>
                          <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => handleToggleActive(account)}>{account.active ? 'Disable' : 'Enable'}</Button>
                          <Button type="button" size="sm" variant="destructive" disabled={saving || account.status === 'revoked'} onClick={() => handleRevoke(account)}>Revoke</Button>
                          <Button type="button" size="sm" variant="destructive" disabled={saving} onClick={() => handleDelete(account)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">Loading sub-admins…</TableCell>
                    </TableRow>
                  )}
                  {!loading && accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">No sub-admin accounts found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {editingAccount && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Editing <strong>{editingAccount.displayName || editingAccount.username}</strong> — select Edit on any row to open the details panel.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sub-admin edit slide-over sheet */}
      <Sheet open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <SheetContent className="sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>Edit Sub-admin</SheetTitle>
            <SheetDescription>{editingAccount?.displayName || editingAccount?.username}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions</p>
            {SUB_ADMIN_PERMISSION_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer">
                <Checkbox
                  checked={editingPermissions.includes(option.value)}
                  onCheckedChange={() => togglePermission(option.value, setEditingPermissions)}
                />
                <span>{option.label}</span>
              </label>
            ))}
            {editingAccount && (
              <div className="text-xs text-slate-400 pt-1">
                Created: {formatDate(editingAccount.createdAt)} · Updated: {formatDate(editingAccount.updatedAt)}
              </div>
            )}
            <AdminFeedback success={message} error={error} />
          </div>

          <div className="px-6 py-4 border-t flex gap-2 shrink-0">
            <Button type="button" size="sm" disabled={saving || editingPermissions.length === 0} onClick={handleSavePermissions}>
              {saving ? 'Saving…' : 'Save permissions'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingAccount(null)}>Cancel</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!reportAccount} onOpenChange={(open) => { if (!open) { setReportAccount(null); setReportData(null); setReportError(''); } }}>
        <SheetContent className="sm:max-w-3xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>Sub-admin Comprehensive Report</SheetTitle>
            <SheetDescription>{reportAccount?.displayName || reportAccount?.username}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {reportLoading && <AdminEmptyState message="Loading report…" />}
            {!reportLoading && <AdminFeedback error={reportError} />}

            {reportData && (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Managed users</CardDescription><CardTitle>{reportData.metrics.managedUsers}</CardTitle></CardHeader></Card>
                  <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Users deposited</CardDescription><CardTitle>{reportData.metrics.usersWithDeposits}</CardTitle></CardHeader></Card>
                  <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Users withdrew</CardDescription><CardTitle>{reportData.metrics.usersWithWithdrawals}</CardTitle></CardHeader></Card>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Total deposits</CardDescription><CardTitle>${reportData.metrics.totalDepositAmount.toFixed(2)}</CardTitle></CardHeader></Card>
                  <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Total withdrawals</CardDescription><CardTitle>${reportData.metrics.totalWithdrawalAmount.toFixed(2)}</CardTitle></CardHeader></Card>
                  <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Net flow</CardDescription><CardTitle>${reportData.metrics.netFlow.toFixed(2)}</CardTitle></CardHeader></Card>
                </div>

                <div className="rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deposits</TableHead>
                        <TableHead>Withdrawals</TableHead>
                        <TableHead>Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.users.map((row) => (
                        <TableRow key={row.userId}>
                          <TableCell>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-slate-500">{row.email || row.userId}</div>
                          </TableCell>
                          <TableCell><Badge variant={row.accountStatus === 'active' ? 'default' : 'secondary'}>{row.accountStatus}</Badge></TableCell>
                          <TableCell>${row.totalDeposits.toFixed(2)} ({row.depositCount})</TableCell>
                          <TableCell>${row.totalWithdrawals.toFixed(2)} ({row.withdrawalCount})</TableCell>
                          <TableCell>${row.netFlow.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500">No managed user financial activity in the selected period.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}