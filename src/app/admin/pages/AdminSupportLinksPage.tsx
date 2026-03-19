import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { fetchContactLinks, updateContactLinks } from '../api';
import { hasAdminPermission, isSuperAdmin } from '../permissions';
import type { AdminSession, AdminSupportLinks } from '../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

interface AdminSupportLinksPageProps {
  session: AdminSession;
}

const EMPTY_LINKS: AdminSupportLinks = {
  whatsapp: '',
  telegram: '',
  whatsapp2: '',
  telegram2: '',
};

export function AdminSupportLinksPage({ session }: AdminSupportLinksPageProps) {
  const [links, setLinks] = useState<AdminSupportLinks>(EMPTY_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManageSupport = hasAdminPermission(session, 'support.manage');
  const isRootAdmin = isSuperAdmin(session);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setLinks(await fetchContactLinks(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  const handleSave = async () => {
    if (!canManageSupport) return;

    const payload = isRootAdmin
      ? links
      : { whatsapp2: links.whatsapp2, telegram2: links.telegram2 };

    try {
      setSaving(true);
      setError('');
      setMessage('');
      setLinks(await updateContactLinks(session, payload));
      setMessage('Support links updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update support links');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!canManageSupport) return;

    const payload = isRootAdmin
      ? { whatsapp: '', telegram: '', whatsapp2: '', telegram2: '' }
      : { whatsapp2: '', telegram2: '' };

    try {
      setSaving(true);
      setError('');
      setMessage('');
      setLinks(await updateContactLinks(session, payload));
      setMessage(isRootAdmin ? 'All support links removed.' : 'WhatsApp 2 and Telegram 2 removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear support links');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Support Links</h1>
        <p className="text-sm text-slate-500">Configure WhatsApp and Telegram links used by customer support entry points.</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Support Contact Links</CardTitle>
          <CardDescription>
            Super-admin can update all links. Limited admins with support access can update WhatsApp 2 and Telegram 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageSupport && <div className="text-sm text-amber-700">Permission required: support.manage</div>}
          {message && <div className="text-sm text-green-600">{message}</div>}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={links.whatsapp}
              onChange={(event) => setLinks((prev) => ({ ...prev, whatsapp: event.target.value }))}
              placeholder="WhatsApp 1: https://wa.me/..."
              disabled={!canManageSupport || !isRootAdmin || loading}
            />
            <Input
              value={links.telegram}
              onChange={(event) => setLinks((prev) => ({ ...prev, telegram: event.target.value }))}
              placeholder="Telegram 1: https://t.me/..."
              disabled={!canManageSupport || !isRootAdmin || loading}
            />
            <Input
              value={links.whatsapp2}
              onChange={(event) => setLinks((prev) => ({ ...prev, whatsapp2: event.target.value }))}
              placeholder="WhatsApp 2: https://wa.me/..."
              disabled={!canManageSupport || loading}
            />
            <Input
              value={links.telegram2}
              onChange={(event) => setLinks((prev) => ({ ...prev, telegram2: event.target.value }))}
              placeholder="Telegram 2: https://t.me/..."
              disabled={!canManageSupport || loading}
            />
          </div>

          <div className="btn-group">
            <Button type="button" variant="outline" onClick={load} disabled={saving}>Refresh</Button>
            <Button type="button" className="btn-primary-action" onClick={handleSave} disabled={!canManageSupport || saving}>{saving ? 'Saving...' : 'Save Links'}</Button>
            <Button type="button" variant="outline" className="text-red-600" onClick={handleClear} disabled={!canManageSupport || saving}>
              {isRootAdmin ? 'Delete Links' : 'Clear WA2/TG2'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
