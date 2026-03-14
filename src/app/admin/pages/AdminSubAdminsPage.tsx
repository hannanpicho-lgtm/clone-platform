import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { createSubAdmin, fetchSubAdmins, revokeSubAdmin, updateSubAdmin } from '../api';
import { SUB_ADMIN_DEFAULT_PERMISSIONS, SUB_ADMIN_PERMISSION_OPTIONS } from '../permissions';
import type { AdminSession, LimitedAdminAccount } from '../types';
import { Badge } from '../../components/ui/badge';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sub-admin Management</h1>
        <p className="text-sm text-slate-500">Super-admin only. Invite, permission, and revoke workflows are protected before render and again on the backend.</p>
      </div>

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

            {message && <div className="text-sm text-green-600">{message}</div>}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Managed Users</TableHead>
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
                    <TableCell>
                      <Badge variant={account.status === 'active' ? 'default' : account.status === 'disabled' ? 'secondary' : 'destructive'}>
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {account.permissions.map((permission) => (
                          <Badge key={permission} variant="outline">{permission}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{account.usersCreated || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => { setEditingAccount(account); setEditingPermissions(account.permissions); }}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => handleToggleActive(account)}>
                          {account.active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button type="button" size="sm" variant="destructive" disabled={saving || account.status === 'revoked'} onClick={() => handleRevoke(account)}>
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && accounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">No sub-admin accounts found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {editingAccount && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 font-medium">Edit permissions for {editingAccount.displayName || editingAccount.username}</div>
                <div className="space-y-3">
                  {SUB_ADMIN_PERMISSION_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <Checkbox
                        checked={editingPermissions.includes(option.value)}
                        onCheckedChange={() => togglePermission(option.value, setEditingPermissions)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button type="button" size="sm" disabled={saving || editingPermissions.length === 0} onClick={handleSavePermissions}>
                    Save permissions
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingAccount(null)}>
                    Cancel
                  </Button>
                </div>
                <div className="mt-3 text-xs text-slate-500">Created: {formatDate(editingAccount.createdAt)} | Last updated: {formatDate(editingAccount.updatedAt)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}