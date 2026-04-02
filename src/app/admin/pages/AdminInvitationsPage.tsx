import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { fetchAdminUsers, fetchInvitationCodes, generateInvitationCode, updateInvitationCodeStatus } from '../api';
import type { AdminInvitationCode, AdminSession } from '../types';
import { hasAdminPermission } from '../permissions';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

interface AdminInvitationsPageProps {
  session: AdminSession;
}

export function AdminInvitationsPage({ session }: AdminInvitationsPageProps) {
  const [codes, setCodes] = useState<AdminInvitationCode[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManageInvitations = hasAdminPermission(session, 'invitations.manage');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [invCodes, userData] = await Promise.all([
        fetchInvitationCodes(session),
        fetchAdminUsers(session),
      ]);
      setCodes(invCodes);
      setOwnerUserId(userData.users[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  const activeCount = useMemo(() => codes.filter((item) => item.status === 'active').length, [codes]);

  const handleGenerate = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await generateInvitationCode(session, ownerUserId);
      setMessage('Invitation code generated successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invitation code');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (code: AdminInvitationCode) => {
    const status = code.status === 'active' ? 'disabled' : 'active';
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await updateInvitationCodeStatus(session, code.code, status);
      setMessage(`Invitation code ${code.code} is now ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invitation code status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Invitation Codes"
        description="Generate, copy, and enable/disable invitation codes."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Total Codes</CardDescription><CardTitle>{loading ? '...' : codes.length}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader className="pb-2"><CardDescription>Active Codes</CardDescription><CardTitle>{loading ? '...' : activeCount}</CardTitle></CardHeader></Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Invitation Code Management</CardTitle>
              <CardDescription>Codes are loaded from backend and persisted on update.</CardDescription>
            </div>
            <Button type="button" disabled={!canManageInvitations || saving} onClick={handleGenerate}>
              Generate Code
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AdminFeedback success={message} error={error} />
          {!canManageInvitations && <div className="text-sm text-amber-700">Permission required: invitations.manage</div>}

          {codes.length === 0 && !loading && <AdminEmptyState message="No invitation codes available." />}

          {codes.map((item) => (
            <div key={item.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="font-semibold text-slate-900">{item.code}</div>
                <div className="text-sm text-slate-600">Owner: {item.owner} | Referrals: {item.referrals}</div>
                <div className="text-xs text-slate-500">Generated: {item.generatedAt ? new Date(item.generatedAt).toLocaleString() : 'N/A'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(item.code)}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!canManageInvitations || saving} onClick={() => handleToggle(item)}>
                  {item.status === 'active' ? 'Disable' : 'Enable'}
                </Button>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
