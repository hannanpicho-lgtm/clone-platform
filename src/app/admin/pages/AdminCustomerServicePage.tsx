import { useEffect, useMemo, useState } from 'react';
import { fetchAdminSupportTickets, replySupportTicket, updateSupportTicketStatus } from '../api';
import { hasAdminPermission } from '../permissions';
import type { AdminSession, AdminSupportTicket } from '../types';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

interface AdminCustomerServicePageProps {
  session: AdminSession;
}

export function AdminCustomerServicePage({ session }: AdminCustomerServicePageProps) {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManageSupport = hasAdminPermission(session, 'support.manage');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setTickets(await fetchAdminSupportTickets(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((ticket) => ticket.status === filter);
  }, [filter, tickets]);

  const handleStatus = async (ticketId: string, status: 'in_progress' | 'resolved') => {
    try {
      setSavingId(ticketId);
      setError('');
      setMessage('');
      await updateSupportTicketStatus(session, ticketId, status);
      setMessage('Ticket status updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
    } finally {
      setSavingId(null);
    }
  };

  const handleReply = async (ticketId: string) => {
    const messageDraft = String(drafts[ticketId] || '').trim();
    if (!messageDraft) {
      setError('Reply message is required.');
      return;
    }

    try {
      setSavingId(ticketId);
      setError('');
      setMessage('');
      await replySupportTicket(session, ticketId, messageDraft);
      setDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      setMessage('Reply sent successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Customer Service" description="Manage ticket statuses and send direct replies." />

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Support Cases</CardTitle>
              <CardDescription>Operational parity with legacy support ticket management controls.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All ({tickets.length})</Button>
              <Button type="button" size="sm" variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>Open ({tickets.filter((t) => t.status === 'open').length})</Button>
              <Button type="button" size="sm" variant={filter === 'in_progress' ? 'default' : 'outline'} onClick={() => setFilter('in_progress')}>In Progress ({tickets.filter((t) => t.status === 'in_progress').length})</Button>
              <Button type="button" size="sm" variant={filter === 'resolved' ? 'default' : 'outline'} onClick={() => setFilter('resolved')}>Resolved ({tickets.filter((t) => t.status === 'resolved').length})</Button>
              <Button type="button" size="sm" variant="outline" onClick={load}>Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canManageSupport && <div className="text-sm text-amber-700">Permission required: support.manage</div>}
          <AdminFeedback success={message} error={error} />

          {loading && <AdminEmptyState message="Loading tickets…" />}
          {!loading && filtered.length === 0 && <AdminEmptyState message="No tickets in this filter." />}

          {filtered.map((ticket) => (
            <div key={ticket.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{ticket.id} | {ticket.userName}</div>
                  <div className="text-sm text-slate-600">{ticket.subject}</div>
                  <div className="text-xs text-slate-500">Priority: {ticket.priority} | Updated: {new Date(ticket.updatedAt).toLocaleString()} | Replies: {ticket.repliesCount}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" disabled={!canManageSupport || savingId === ticket.id} onClick={() => handleStatus(ticket.id, 'in_progress')}>
                    In Progress
                  </Button>
                  <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={!canManageSupport || savingId === ticket.id} onClick={() => handleStatus(ticket.id, 'resolved')}>
                    Resolve
                  </Button>
                  <Badge variant={ticket.status === 'resolved' ? 'secondary' : 'default'}>{ticket.status.replace('_', ' ')}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={drafts[ticket.id] || ''}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                  placeholder="Type reply to user..."
                  disabled={!canManageSupport}
                />
                <Button type="button" size="sm" disabled={!canManageSupport || savingId === ticket.id} onClick={() => handleReply(ticket.id)}>
                  Send Reply
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
